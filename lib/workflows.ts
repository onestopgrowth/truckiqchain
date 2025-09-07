import type { SupabaseClient } from "@supabase/supabase-js";

export type DbLike = Pick<SupabaseClient, "from">;
type Notify = (e: { action: string; toUserId: string; assignmentId?: string; loadId?: string }) => void;

export async function inviteCarrier(params: {
  db: DbLike;
  ownerId: string;
  carrierUserId: string;
  loadId: string;
}) {
  const { db, ownerId, carrierUserId, loadId } = params;
  // fetch load and carrier profile
  const { data: load } = await (db as any)
    .from("loads")
    .select("id,user_id,status")
    .eq("id", loadId)
    .single();
  if (!load || load.user_id !== ownerId) throw new Error("not_owner");
  if (!["open", "accepted", "booked"].includes(load.status))
    throw new Error("load_not_invitable");

  const { data: cp } = await (db as any)
    .from("carrier_profiles")
    .select("id,user_id")
    .eq("user_id", carrierUserId)
    .maybeSingle();
  if (!cp) throw new Error("no_carrier_profile");

  // prevent duplicate requested invite for same carrier+load
  const { data: existing } = await (db as any)
    .from("assignments")
    .select("id,status")
    .eq("load_id", loadId)
    .eq("carrier_user_id", carrierUserId)
    .eq("status", "requested")
    .maybeSingle();
  if (existing) return { id: existing.id, status: "requested" };

  const now = new Date().toISOString();
  const { data: created } = await (db as any)
    .from("assignments")
    .insert({
      load_id: loadId,
      load_owner_user_id: ownerId,
      carrier_user_id: carrierUserId,
      carrier_profile_id: cp.id,
      status: "requested",
      requested_at: now,
    })
    .single();
  return { id: created.id, status: "requested" };
}

export async function transitionAssignment(params: {
  db: DbLike;
  assignmentId: string;
  action: "accept" | "decline" | "book" | "cancel" | "start" | "deliver" | "complete";
  actorUserId: string;
  pod_url?: string;
  onNotify?: Notify;
}) {
  const { db, assignmentId, action, actorUserId, pod_url, onNotify } = params;
  const now = new Date().toISOString();
  const { data: asg } = await (db as any)
    .from("assignments")
    .select("id,load_id,load_owner_user_id,carrier_user_id,status")
    .eq("id", assignmentId)
    .single();
  if (!asg) throw new Error("not_found");

  const isOwner = asg.load_owner_user_id === actorUserId;
  const isCarrier = asg.carrier_user_id === actorUserId;
  if (!isOwner && !isCarrier) throw new Error("forbidden");

  const status: string = asg.status;
  let next: any = null;

  function notify() {
    const to = isOwner ? asg.carrier_user_id : asg.load_owner_user_id;
    if (onNotify && to) onNotify({ action, toUserId: to, assignmentId });
  }

  switch (action) {
    case "accept":
      if (!isOwner) throw new Error("forbidden");
      if (status !== "requested") throw new Error("invalid_state");
      next = { status: "accepted", accepted_at: now };
      break;
    case "decline":
      if (!isOwner) throw new Error("forbidden");
      if (status !== "requested") throw new Error("invalid_state");
      next = { status: "declined" };
      break;
  case "book":
      if (!isOwner) throw new Error("forbidden");
      if (!["requested", "accepted"].includes(status))
        throw new Error("invalid_state");
      // Ensure no other active assignment (accepted/booked/in_transit) for same load
  const { data: actives } = await (db as any)
        .from("assignments")
        .select("id,status")
        .eq("load_id", asg.load_id)
        .in("status", ["accepted", "booked", "in_transit"]);
      const otherActive = (actives || []).find((r: any) => r.id !== assignmentId);
      if (otherActive) throw new Error("active_exists");
      next = { status: "booked", booked_at: now };
      break;
    case "cancel":
      if (!isOwner && !isCarrier) throw new Error("forbidden");
      if (!["requested", "accepted", "booked"].includes(status))
        throw new Error("invalid_state");
      next = { status: "cancelled" };
      break;
    case "start":
      if (!isCarrier) throw new Error("forbidden");
      if (status !== "booked") throw new Error("invalid_state");
      next = { status: "in_transit", in_transit_at: now };
      break;
    case "deliver":
      if (!isCarrier) throw new Error("forbidden");
      if (status !== "in_transit") throw new Error("invalid_state");
      next = { status: "delivered", delivered_at: now };
      break;
    case "complete":
      if (!isOwner) throw new Error("forbidden");
      if (status !== "delivered") throw new Error("invalid_state");
      if (!pod_url) throw new Error("pod_required");
      next = { status: "completed", completed_at: now, pod_url };
      break;
    default:
      throw new Error("invalid_action");
  }

  await (db as any)
    .from("assignments")
    .eq("id", assignmentId)
    .update(next);
  notify();

  const { data: updated } = await (db as any)
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();
  return updated;
}

export async function cancelLoadWorkflow(params: {
  db: DbLike;
  ownerId: string;
  loadId: string;
  onNotify?: (e: { toUserId: string; loadId: string }) => void;
}) {
  const { db, ownerId, loadId, onNotify } = params;
  const { data: load } = await (db as any)
    .from("loads")
    .select("id,user_id,status")
    .eq("id", loadId)
    .single();
  if (!load || load.user_id !== ownerId) throw new Error("not_owner");
  if (load.status !== "open" && load.status !== "accepted" && load.status !== "booked")
    throw new Error("not_open");

  await (db as any)
    .from("loads")
    .eq("id", loadId)
    .update({ status: "cancelled" });

  const { data: asgs } = await (db as any)
    .from("assignments")
    .select("carrier_user_id,status")
    .eq("load_id", loadId)
    .in("status", ["requested", "accepted", "booked"]);
  if (onNotify) {
    (asgs || []).forEach((a: any) => onNotify({ toUserId: a.carrier_user_id, loadId }));
  }
  return { ok: true };
}
