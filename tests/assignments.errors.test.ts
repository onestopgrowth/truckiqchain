import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier, transitionAssignment, cancelLoadWorkflow } from "@/lib/workflows";

describe("assignments: error and edge cases", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const carrier = "carrier-1";
  const hacker = "hacker-9";
  const load = "load-1";

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: carrier, email: "c@x" });
    (db as any).from("profiles").insert({ id: hacker, email: "h@x" });
    (db as any).from("loads").insert({ id: load, user_id: owner, status: "open", title: "L" });
    (db as any).from("carrier_profiles").insert({ id: "cp-1", user_id: carrier });
  });

  it("forbids non-owner/carrier actors", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: hacker }) as any
    ).rejects.toThrowError(/forbidden/);
  });

  it("not_found when assignment doesn't exist", async () => {
    await expect(
      transitionAssignment({ db: db as any, assignmentId: "nope", action: "cancel", actorUserId: owner }) as any
    ).rejects.toThrowError(/not_found/);
  });

  it("invalid transitions by state", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    // decline when not requested
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "decline", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);

    // start by owner -> forbidden
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: owner }) as any
    ).rejects.toThrowError(/forbidden/);

    // deliver when not in_transit
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier }) as any
    ).rejects.toThrowError(/invalid_state/);

    // complete when not delivered
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
  });

  it("booking invalid on delivered and double start/deliver invalid", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner }) as any
    ).rejects.toThrowError(/invalid_state/);
    // double start
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier }) as any
    ).rejects.toThrowError(/invalid_state/);
    // double deliver
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier }) as any
    ).rejects.toThrowError(/invalid_state/);
  });

  it("complete requires owner and delivered + pod_url", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier });
    // carrier not allowed
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: carrier, pod_url: "x" }) as any
    ).rejects.toThrowError(/forbidden/);
    // owner must provide pod
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner }) as any
    ).rejects.toThrowError(/pod_required/);
    const done = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner, pod_url: "https://pod" });
    expect(done.status).toBe("completed");
    expect(done.pod_url).toBe("https://pod");
  });

  it("inviteCarrier validations: not_owner, no_carrier_profile, load_not_invitable", async () => {
    // not_owner
    await expect(
      inviteCarrier({ db: db as any, ownerId: hacker, carrierUserId: carrier, loadId: load }) as any
    ).rejects.toThrowError(/not_owner/);
    // no_carrier_profile
    const load2 = "load-2";
    (db as any).from("loads").insert({ id: load2, user_id: owner, status: "open" });
    await expect(
      inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: "no-profile", loadId: load2 }) as any
    ).rejects.toThrowError(/no_carrier_profile/);
    // load_not_invitable
    const load3 = "load-3";
    (db as any).from("loads").insert({ id: load3, user_id: owner, status: "cancelled" });
    await expect(
      inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load3 }) as any
    ).rejects.toThrowError(/load_not_invitable/);
  });

  it("cancelLoadWorkflow errors: not_owner, not_open", async () => {
    // not_owner
    await expect(
      cancelLoadWorkflow({ db: db as any, ownerId: hacker, loadId: load }) as any
    ).rejects.toThrowError(/not_owner/);
    // not_open
    (db as any).from("loads").insert({ id: "load-x", user_id: owner, status: "cancelled" });
    await expect(
      cancelLoadWorkflow({ db: db as any, ownerId: owner, loadId: "load-x" }) as any
    ).rejects.toThrowError(/not_open/);
  });

  it("enforce single active when first is accepted (before booking)", async () => {
    const a1 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a1.id, action: "accept", actorUserId: owner });
    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: a2.id, action: "book", actorUserId: owner }) as any
    ).rejects.toThrowError(/active_exists/);
  });

  it("carrier can cancel booked, but cannot cancel in_transit or delivered/completed", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner });
    const cancelled = await transitionAssignment({ db: db as any, assignmentId: a.id, action: "cancel", actorUserId: carrier });
    expect(cancelled.status).toBe("cancelled");

    const b = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: b.id, action: "book", actorUserId: owner });
    await transitionAssignment({ db: db as any, assignmentId: b.id, action: "start", actorUserId: carrier });
    await expect(
      transitionAssignment({ db: db as any, assignmentId: b.id, action: "cancel", actorUserId: carrier }) as any
    ).rejects.toThrowError(/invalid_state/);
  });
});
