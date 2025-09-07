import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier, transitionAssignment, cancelLoadWorkflow } from "@/lib/workflows";

describe("multi-carrier scenarios", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const c1 = "carrier-1";
  const c2 = "carrier-2";
  const load = "load-1";
  const notifications: any[] = [];

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    notifications.length = 0;
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: c1, email: "c1@x" });
    (db as any).from("profiles").insert({ id: c2, email: "c2@x" });
    (db as any).from("loads").insert({ id: load, user_id: owner, status: "open", title: "L" });
    (db as any).from("carrier_profiles").insert({ id: "cp-1", user_id: c1 });
    (db as any).from("carrier_profiles").insert({ id: "cp-2", user_id: c2 });
  });

  it("booking one carrier blocks booking another; after cancel, booking other succeeds", async () => {
    const a1 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: c1, loadId: load });
    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: c2, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "accept", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "book", actorUserId: owner });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a2.id, action: "book", actorUserId: owner }) as any
    ).rejects.toThrowError(/active_exists/);

    // Cancel first, then booking second succeeds
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "cancel", actorUserId: owner });
    const b2 = await transitionAssignment({ db: db as any, assignmentId: a2.id, action: "book", actorUserId: owner });
    expect(b2.status).toBe("booked");
  });

  it("load cancel notifies all requested/accepted/ booked carriers", async () => {
    const a1 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: c1, loadId: load });
    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: c2, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "accept", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "book", actorUserId: owner });
    // a2 remains requested
    await cancelLoadWorkflow({ db: db as any, ownerId: owner, loadId: load, onNotify: (e)=>notifications.push(e) });
    // Expect two notifications: c1 (booked) and c2 (requested)
    expect(notifications.length).toBe(2);
    const users = notifications.map((n)=>n.toUserId).sort();
    expect(users).toEqual([c1, c2].sort());
  });
});
