import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { createClient } from "@supabase/supabase-js";
// Email now queued via email_queue table instead of direct send
import { computeAndMarkCarrierVerified } from "@/lib/carrier/verification";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await context.params; // ensure awaited for Next.js 15
    const id = resolved.id;
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { review_status } = body as { review_status?: string };
    if (
      !review_status ||
      !["approved", "rejected", "pending"].includes(review_status)
    ) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const sb = await createMutableServerClient();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr)
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Check admin role quickly
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const adminByEmail =
      user.email === "zenteklabsjohnboy@gmail.com" ||
      String(process.env.ADMIN_BYPASS_EMAIL ?? "")
        .split(",")
        .map((s) => s.trim())
        .includes(user.email || "");
    if (prof?.role !== "admin" && !adminByEmail) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Perform update using service role to avoid RLS hiccups if needed
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let targetClient: any = sb;
    if (serviceKey && supabaseUrl) {
      targetClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
    }

    const { data: beforeDoc, error: fetchErr } = await targetClient
      .from("carrier_documents")
      .select("id,user_id,doc_type,file_name")
      .eq("id", id)
      .single();
    if (fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 404 });

    const { error } = await targetClient
      .from("carrier_documents")
      .update({ review_status })
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch carrier email
    const { data: carrierProfile } = await targetClient
      .from("profiles")
      .select("id,email,company_name")
      .eq("id", beforeDoc.user_id)
      .single();

    // Queue email instead of sending synchronously
    if (carrierProfile?.email) {
      const docTypeLabel = String(beforeDoc.doc_type).toUpperCase();
      const subject = `Document ${review_status}: ${beforeDoc.file_name}`;
      const html = `<p>Hello ${carrierProfile.company_name || ''},</p>
        <p>Your document <strong>${beforeDoc.file_name}</strong> (${docTypeLabel}) has been <strong>${review_status}</strong>.</p>
        <p>If you have questions, please reply to this email.</p>
        <p>Regards,<br/>FreightMatch Admin</p>`;
      await targetClient.from('email_queue').insert({ to_address: carrierProfile.email, subject, html });
    }

    // attempt carrier verification if approved document
    if (review_status === "approved") {
      computeAndMarkCarrierVerified(beforeDoc.user_id).catch((e) =>
        console.error("verify check failed", e)
      );
    }

    return NextResponse.json({ ok: true, id, review_status });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "server_error" },
      { status: 500 }
    );
  }
}
