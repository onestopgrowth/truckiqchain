import { createClient, SupabaseClient } from "@supabase/supabase-js";

type LoadBrief = {
  id: string;
  title: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
};

function getAdminClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!serviceKey || !url) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function queueEmail(
  target: { to: string; subject: string; html: string },
  client?: SupabaseClient | null
) {
  const sb = client ?? getAdminClient();
  if (!sb) return; // Silent no-op if no client available
  await sb
    .from("email_queue")
    .insert({ to_address: target.to, subject: target.subject, html: target.html });
}

async function getProfileEmail(userId: string, client?: SupabaseClient | null) {
  const sb = client ?? getAdminClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data?.email as string | null;
}

async function getLoadBrief(loadId: string, client?: SupabaseClient | null) {
  const sb = client ?? getAdminClient();
  if (!sb) return null;
  const { data } = await sb
    .from("loads")
    .select(
      "id,title,origin_city,origin_state,destination_city,destination_state"
    )
    .eq("id", loadId)
    .single();
  return (data as LoadBrief) || null;
}

function renderLoadLine(load: LoadBrief | null) {
  if (!load) return "";
  const title = load.title ? `“${load.title}”` : `Load ${load.id.slice(0, 8)}`;
  const lane = [load.origin_city, load.origin_state]
    .filter(Boolean)
    .join(", ")
    .concat(" → ")
    .concat([load.destination_city, load.destination_state].filter(Boolean).join(", "));
  return `${title} (${lane})`;
}

export async function notifyOwnerInvite(params: {
  carrierUserId: string;
  loadId: string;
  client?: SupabaseClient | null;
}) {
  try {
  const email = await getProfileEmail(params.carrierUserId);
    if (!email) return;
  const brief = await getLoadBrief(params.loadId);
    await queueEmail(
      {
        to: email,
        subject: `New load invitation`,
        html: `<p>You have been invited to a load.</p><p>${renderLoadLine(brief)}</p>`,
      },
      params.client
    );
  } catch (e) {
    // best-effort
  }
}

export async function notifyBookingRequest(params: {
  loadId: string;
  ownerUserId?: string | null; // optional shortcut; we'll fetch if missing
  client?: SupabaseClient | null;
}) {
  try {
    let ownerId = params.ownerUserId ?? null;
    const sb = params.client ?? getAdminClient();
    if (!ownerId && sb) {
      const { data } = await sb
        .from("loads")
        .select("user_id")
        .eq("id", params.loadId)
        .single();
      ownerId = (data as any)?.user_id ?? null;
    }
    if (!ownerId) return;
  const email = await getProfileEmail(ownerId);
    if (!email) return;
  const brief = await getLoadBrief(params.loadId);
    await queueEmail(
      {
        to: email,
        subject: `New booking request`,
        html: `<p>A carrier requested to book your load.</p><p>${renderLoadLine(brief)}</p>`,
      },
      params.client
    );
  } catch (e) {}
}

export async function notifyAssignmentTransition(params: {
  assignmentId: string;
  action:
    | "accept"
    | "decline"
    | "book"
    | "cancel"
    | "start"
    | "deliver"
    | "complete";
  actorUserId: string; // who initiated the action
  client?: SupabaseClient | null;
}) {
  try {
    const sb = params.client ?? getAdminClient();
    if (!sb) return;
    const { data: asg } = await sb
      .from("assignments")
      .select(
        "id, load_id, carrier_user_id, load_owner_user_id, status"
      )
      .eq("id", params.assignmentId)
      .single();
    if (!asg) return;

    const isOwnerActor = params.actorUserId === asg.load_owner_user_id;
    const recipientUserId = isOwnerActor ? asg.carrier_user_id : asg.load_owner_user_id;
    if (!recipientUserId) return;
  const email = await getProfileEmail(recipientUserId);
    if (!email) return;
  const brief = await getLoadBrief(asg.load_id);

    const subjects: Record<string, string> = {
      accept: "Request accepted",
      decline: "Request declined",
      book: "Load booked",
      cancel: "Assignment cancelled",
      start: "Load in transit",
      deliver: "Load delivered",
      complete: "Load completed",
    };
    const actionsCopy: Record<string, string> = {
      accept: "accepted",
      decline: "declined",
      book: "booked",
      cancel: "cancelled",
      start: "marked in transit",
      deliver: "marked delivered",
      complete: "completed",
    };
    const subject = subjects[params.action] || "Assignment update";
    const verb = actionsCopy[params.action] || params.action;
    await queueEmail(
      {
        to: email,
        subject,
        html: `<p>Your assignment has been <strong>${verb}</strong>.</p><p>${renderLoadLine(
          brief
        )}</p>`,
      },
      sb
    );
  } catch (e) {}
}

export async function notifyLoadCancelled(params: {
  loadId: string;
  client?: SupabaseClient | null;
}) {
  try {
    const sb = params.client ?? getAdminClient();
    if (!sb) return;
    // Find active assignments and email their carriers
    const { data: rows } = await sb
      .from("assignments")
      .select("carrier_user_id")
      .eq("load_id", params.loadId)
      .in("status", ["requested", "accepted", "booked"]);
    if (!rows || !rows.length) return;
    const brief = await getLoadBrief(params.loadId, sb);
    const emails: string[] = [];
    for (const r of rows as any[]) {
      const e = await getProfileEmail(r.carrier_user_id);
      if (e) emails.push(e);
    }
    await Promise.all(
      emails.map((to) =>
        queueEmail(
          {
            to,
            subject: "Load cancelled",
            html: `<p>The load has been cancelled by the owner.</p><p>${renderLoadLine(
              brief
            )}</p>`,
          },
          sb
        )
      )
    );
  } catch (e) {}
}
