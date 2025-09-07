import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier, transitionAssignment, cancelLoadWorkflow } from "@/lib/workflows";

describe("assignment transitions", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const carrier = "carrier-1";
  const load = "load-1";
  const notifications: any[] = [];

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    notifications.length = 0;
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: carrier, email: "c@x" });
    (db as any).from("loads").insert({ id: load, user_id: owner, status: "open", title: "L" });
    (db as any).from("carrier_profiles").insert({ id: "cp-1", user_id: carrier });
  });

  it("requested → accepted → booked (owner) and enforce single active", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    const accepted = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner, onNotify: (e)=>notifications.push(e) });
    expect(accepted.status).toBe("accepted");
    const booked = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner, onNotify: (e)=>notifications.push(e) });
    expect(booked.status).toBe("booked");
    // Second invite then attempt book should fail due to active
    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a2.id, action: "book", actorUserId: owner })
    ).rejects.toThrowError(/active_exists/);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("booked → in_transit → delivered (carrier) → completed (owner with POD)", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    const started = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier });
    expect(started.status).toBe("in_transit");
    const delivered = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier });
    expect(delivered.status).toBe("delivered");
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner })
    ).rejects.toThrowError(/pod_required/);
    const completed = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner, pod_url: "https://pod" });
    expect(completed.status).toBe("completed");
    expect(completed.pod_url).toBe("https://pod");
  });

  it("decline and cancel paths", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    const declined = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "decline", actorUserId: owner });
    expect(declined.status).toBe("declined");

    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    const accepted = await transitionAssignment({ db: db as any, assignmentId: a2.id, action: "accept", actorUserId: owner });
    expect(accepted.status).toBe("accepted");
    const cancelled = await transitionAssignment({ db: db as any, assignmentId: a2.id, action: "cancel", actorUserId: owner });
    expect(cancelled.status).toBe("cancelled");
  });

  it("owner cancels load → notify carriers on requested/accepted/booked", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner });
    await cancelLoadWorkflow({ db: db as any, ownerId: owner, loadId: load, onNotify: (e)=>notifications.push(e) });
    expect(notifications.length).toBe(1);
  });
});
