import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier, transitionAssignment } from "@/lib/workflows";

describe("additional integration scenarios", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const carrier = "carrier-1";
  const load = "load-1";

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: carrier, email: "c@x" });
    (db as any).from("loads").insert({ id: load, user_id: owner, status: "open", title: "L" });
    (db as any).from("carrier_profiles").insert({ id: "cp-1", user_id: carrier });
  });

  it("re-invite allowed after decline and after cancel", async () => {
    const invited = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    const declined = await transitionAssignment({ db: db as any, assignmentId: invited.id, action: "decline", actorUserId: owner });
    expect(declined.status).toBe("declined");
    const reinvited = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    expect(reinvited.id).not.toBe(invited.id);
    // cancel path
    const cancelled = await transitionAssignment({ db: db as any, assignmentId: reinvited.id, action: "cancel", actorUserId: owner });
    expect(cancelled.status).toBe("cancelled");
    const reinvited2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    expect(reinvited2.id).not.toBe(reinvited.id);
  });

  it("double book same assignment is invalid_state; active_exists excludes same assignment", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
  });

  it("timestamps are set on each status change", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    const accepted = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner });
    expect(accepted.accepted_at).toBeTruthy();
    const booked = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    expect(booked.booked_at).toBeTruthy();
    const started = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier });
    expect(started.in_transit_at).toBeTruthy();
    const delivered = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier });
    expect(delivered.delivered_at).toBeTruthy();
    const completed = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner, pod_url: "https://pod" });
    expect(completed.completed_at).toBeTruthy();
  });

  it("owner cancel allowed in requested/accepted/booked; disallowed in in_transit/delivered/completed", async () => {
    // Use separate loads per subcase to avoid active-assignment interference
    const loads = {
      requested: "load-r",
      accepted: "load-a",
      booked: "load-b",
      in_transit: "load-it",
      delivered: "load-d",
      completed: "load-c",
    } as const;
    // seed loads
    for (const id of Object.values(loads)) {
      (db as any).from("loads").insert({ id, user_id: owner, status: "open", title: id });
    }

    // requested
    const r = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.requested });
    const rCancelled = await transitionAssignment({ db: db as any, assignmentId: r.id, action: "cancel", actorUserId: owner });
    expect(rCancelled.status).toBe("cancelled");
    // accepted
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.accepted });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner });
    const aCancelled = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "cancel", actorUserId: owner });
    expect(aCancelled.status).toBe("cancelled");
    // booked
    const b = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.booked });
    await transitionAssignment({ db: db as any, assignmentId: b.id, action: "book", actorUserId: owner });
    const bCancelled = await transitionAssignment({ db: db as any, assignmentId: b.id, action: "cancel", actorUserId: owner });
    expect(bCancelled.status).toBe("cancelled");
    // in_transit
    const itAsg = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.in_transit });
    await transitionAssignment({ db: db as any, assignmentId: itAsg.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: itAsg.id, action: "start", actorUserId: carrier });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: itAsg.id, action: "cancel", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
    // delivered
    const dAsg = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.delivered });
    await transitionAssignment({ db: db as any, assignmentId: dAsg.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: dAsg.id, action: "start", actorUserId: carrier });
    await transitionAssignment({ db: db as any, assignmentId: dAsg.id, action: "deliver", actorUserId: carrier });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: dAsg.id, action: "cancel", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
    // completed
    const cAsg = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: loads.completed });
    await transitionAssignment({ db: db as any, assignmentId: cAsg.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: cAsg.id, action: "start", actorUserId: carrier });
    await transitionAssignment({ db: db as any, assignmentId: cAsg.id, action: "deliver", actorUserId: carrier });
    await transitionAssignment({ db: db as any, assignmentId: cAsg.id, action: "complete", actorUserId: owner, pod_url: "https://pod" });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: cAsg.id, action: "cancel", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
  });

  it("onNotify supplies action and assignmentId correctly and flips recipient by actor", async () => {
    const events: any[] = [];
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner, onNotify: (e)=>events.push(e) });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner, onNotify: (e)=>events.push(e) });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier, onNotify: (e)=>events.push(e) });
    expect(events.length).toBe(3);
    expect(events.every((e)=>!!e.assignmentId && !!e.action)).toBe(true);
    const toUsers = events.map((e)=>e.toUserId);
    // owner actions notify carrier; carrier actions notify owner
    expect(toUsers[0]).toBe(carrier);
    expect(toUsers[1]).toBe(carrier);
    expect(toUsers[2]).toBe(owner);
  });
});
