import { redirect } from "next/navigation";
// Direct server-side querying (service role) for admin document listing
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminDocActions from "@/components/admin-doc-actions";
import CarrierRecentAssignments from "../../components/carrier-recent-assignments";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,company_name")
    .eq("id", user.id)
    .single();

  const { data: carrierProfile } = await supabase
    .from("carrier_profiles")
    .select("id,is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  // If carrier, fetch a few recent assignments to surface on the dashboard
  let carrierAssignments: any[] = [];
  if ((profile?.role ?? null) === "carrier") {
    // Debug: fetch assignments without join
    const { data: assignmentsOnly, error: assignmentsError } = await supabase
      .from("assignments")
      .select("*")
      .eq("carrier_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    console.log("[DEBUG] assignmentsOnly", assignmentsOnly, assignmentsError);

    // Original query with join
    const { data: carr, error: joinError } = await supabase
      .from("assignments")
      .select(
        `id,status,created_at,load_id,loads ( title,origin_city,origin_state,destination_city,destination_state )`
      )
      .eq("carrier_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    console.log("[DEBUG] assignmentsWithJoin", carr, joinError);
    carrierAssignments = carr || [];
  }

  const adminByEmail =
    user.email === "zenteklabsjohnboy@gmail.com" ||
    String(process.env.ADMIN_BYPASS_EMAIL ?? "")
      .split(",")
      .map((s) => s.trim())
      .includes(user.email as string);

  const role = profile?.role ?? null;
  if (!role && !adminByEmail) redirect("/onboarding/role");

  // If admin, fetch carrier documents via secure server API (service-role) to bypass RLS
  let docs: any[] | null = null;
  let docsError: string | null = null;
  if (role === "admin" || adminByEmail) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) {
      docsError = "Service role key or supabase URL missing in env";
    } else {
      try {
        const adminClient = createClient(url, serviceKey, {
          auth: { persistSession: false },
        });
        // First fetch raw documents (no implicit joins to avoid FK relationship errors)
        const { data: rawDocs, error: docsErr } = await adminClient
          .from("carrier_documents")
          .select(
            "id,user_id,carrier_profile_id,doc_type,file_name,file_path,file_hash,review_status,created_at"
          )
          .order("created_at", { ascending: false });
        if (docsErr) {
          docsError = docsErr.message;
        } else if (rawDocs && rawDocs.length) {
          const userIds = Array.from(
            new Set(rawDocs.map((d) => d.user_id).filter(Boolean))
          );
          // Fetch related profiles
          let profilesMap: Record<string, any> = {};
          if (userIds.length) {
            const { data: profs } = await adminClient
              .from("profiles")
              .select("id,company_name,role")
              .in("id", userIds as string[]);
            if (profs) {
              for (const p of profs) profilesMap[p.id] = p;
            }
          }
          const carrierProfileIds = Array.from(
            new Set(rawDocs.map((d) => d.carrier_profile_id).filter(Boolean))
          );
          let carrierProfilesMap: Record<string, any> = {};
          if (carrierProfileIds.length) {
            const { data: cps } = await adminClient
              .from("carrier_profiles")
              .select("id,dot_number,user_id")
              .in("id", carrierProfileIds as string[]);
            if (cps) {
              for (const c of cps) carrierProfilesMap[c.id] = c;
            }
          }
          docs = rawDocs.map((d) => ({
            ...d,
            profiles: profilesMap[d.user_id] || null,
            carrier_profiles: d.carrier_profile_id
              ? carrierProfilesMap[d.carrier_profile_id] || null
              : null,
          }));
        } else {
          docs = [];
        }
      } catch (e: any) {
        docsError = e?.message || "Unexpected error performing admin query";
      }
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">FreightMatch Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {profile?.company_name || user.email}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
            {role ?? (adminByEmail ? "admin" : "Not set")}
          </Badge>
          {role === "carrier" && carrierProfile?.is_verified && (
            <Badge className="text-xs px-3 py-1 rounded-full bg-green-600 text-white">
              Verified
            </Badge>
          )}
          <form method="post" action="/auth/logout">
            <Button variant="outline" type="submit" size="sm">
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {role === "admin" || adminByEmail ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Carrier Documents</h2>
            <span className="text-xs text-muted-foreground">
              {docs ? docs.length : 0} total
            </span>
          </div>
          {docsError ? (
            <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-900">
              Error loading documents: {docsError}
            </div>
          ) : docs == null ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No uploaded documents yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {docs.map((d: any) => {
                const status = String(d.review_status || "").toLowerCase();
                const statusCls =
                  status === "approved"
                    ? "bg-green-100 text-green-700 dark:bg-green-600/20 dark:text-green-300"
                    : status === "rejected"
                    ? "bg-red-100 text-red-700 dark:bg-red-600/20 dark:text-red-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
                const docType = String(d.doc_type).toUpperCase();
                const raw = d.file_path as string;
                let href = raw;
                if (raw && !raw.startsWith("http")) {
                  const cleaned = raw.replace(/^\//, "");
                  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
                  if (base)
                    href = `${base}/storage/v1/object/public/${cleaned}`;
                }
                const carrierName = d.profiles?.company_name || "—";
                const dot = d.carrier_profiles?.dot_number || "—";
                return (
                  <Card
                    key={d.id}
                    className="border border-muted/40 group h-full flex flex-col relative"
                  >
                    <span
                      className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${statusCls}`}
                    >
                      {status || "pending"}
                    </span>
                    <CardHeader className="pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <CardTitle
                            className="text-base font-semibold leading-tight truncate"
                            title={carrierName}
                          >
                            {carrierName}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="uppercase tracking-wide font-medium bg-muted px-2 py-0.5 rounded text-[10px]">
                              {docType}
                            </span>
                            <span className="flex items-center gap-1">
                              DOT:{" "}
                              <span className="font-medium text-foreground">
                                {dot}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm font-medium leading-snug break-words hover:underline"
                        title={d.file_name}
                      >
                        {d.file_name}
                      </a>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs flex flex-col flex-1">
                      <div className="flex justify-end gap-2 text-muted-foreground">
                        <span className="text-xs">Uploaded</span>
                        <span className="text-foreground">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-auto flex justify-end pt-2">
                        <AdminDocActions
                          id={d.id}
                          initialStatus={d.review_status}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {role === "carrier" ? (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link className="underline" href="/dashboard/carrier/profile">
                  Carrier Profile
                </Link>
                <Link
                  className="underline"
                  href={
                    carrierProfile
                      ? "/dashboard/carrier/vehicles#add"
                      : "/dashboard/carrier/vehicles?needsProfile=1"
                  }
                  title={
                    carrierProfile
                      ? "Manage Vehicles"
                      : "Create your carrier profile first"
                  }
                >
                  Manage Vehicles
                </Link>
              </div>
              {carrierProfile?.is_verified ? (
                <div className="p-4 border rounded text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium">Availability</p>
                    <p className="text-muted-foreground text-xs">
                      Set when and where you're available for loads.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/carrier/availability">
                      Set Availability
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="p-4 border rounded text-sm bg-amber-50 dark:bg-amber-900/20">
                  <p className="font-medium mb-1">Verification Pending</p>
                  <p className="text-xs text-muted-foreground">
                    Upload and get approval for W9, COI and Authority to unlock
                    availability broadcasting.
                  </p>
                </div>
              )}

              {/* Recent Assignments - full width card */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Assignments</CardTitle>
                  <CardDescription>
                    Requested, accepted, and booked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CarrierRecentAssignments items={carrierAssignments as any} />
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/carrier/assignments">
                        Go to Assignments
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : role === "capacity_finder" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Post a Load</CardTitle>
                  <CardDescription>
                    Create a shipment to match with carriers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href="/dashboard/capacity/loads/post">Post Load</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>See Matches</CardTitle>
                  <CardDescription>
                    Browse verified carriers by fit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/capacity/matching">
                      Find Carriers
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Invite / Approve</CardTitle>
                  <CardDescription>
                    Invite carriers and approve requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href="/dashboard/capacity/matching">
                      Invite Carrier
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/capacity/owner/assignments">
                      Approve
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Track Status</CardTitle>
                  <CardDescription>
                    Accepted → In Transit → Delivered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/capacity/owner/assignments">
                      View Assignments
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle>Receive POD & Close</CardTitle>
                  <CardDescription>
                    Review POD and complete the load
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/capacity/owner/assignments">
                      Close Load
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Link className="underline" href="/onboarding/role">
              Set Role
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
