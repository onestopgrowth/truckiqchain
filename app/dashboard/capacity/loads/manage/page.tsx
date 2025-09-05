import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManageLoadsPage() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: loads } = await sb
    .from("loads")
    .select(
      "id, title, origin_city, origin_state, destination_city, destination_state, status, created_at, equipment_required"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Loads</CardTitle>
          <CardDescription>Manage your posted freight</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/dashboard/capacity/loads/post"
            className="text-sm underline"
          >
            Post New Load
          </Link>
          {!loads?.length && (
            <p className="text-sm text-muted-foreground">No loads yet.</p>
          )}
          <div className="grid gap-4">
            {loads?.map((l) => (
              <div key={l.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">
                      {l.title ||
                        `${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.origin_city}, {l.origin_state} → {l.destination_city},{" "}
                      {l.destination_state}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge
                      variant={l.status === "open" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {l.status}
                    </Badge>
                    <div className="flex gap-1 flex-wrap">
                      {l.equipment_required?.map((e: string) => (
                        <Badge
                          key={e}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
