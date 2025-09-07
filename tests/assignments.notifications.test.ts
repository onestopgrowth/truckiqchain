import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier, transitionAssignment, cancelLoadWorkflow } from "@/lib/workflows";

describe("notifications → email_queue", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const carrier = "carrier-1";
  const load = "load-1";

  const enqueue = (e: { action?: string; toUserId: string; assignmentId?: string; loadId?: string }) => {
    const subj = e.action ? `assignment:${e.action}` : `load:cancel`;
    (db as any)
      .from("email_queue")
      .insert({ to_address: `${e.toUserId}@test`, subject: subj, html: `<p>${subj}</p>` });
  };

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: carrier, email: "c@x" });
    (db as any).from("loads").insert({ id: load, user_id: owner, status: "open", title: "L" });
    (db as any).from("carrier_profiles").insert({ id: "cp-1", user_id: carrier });
  });

  it("owner/carrier transitions enqueue emails with expected recipients and subjects", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner, onNotify: enqueue });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "book", actorUserId: owner, onNotify: enqueue });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "start", actorUserId: carrier, onNotify: enqueue });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "deliver", actorUserId: carrier, onNotify: enqueue });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "complete", actorUserId: owner, pod_url: "https://pod", onNotify: enqueue });

    const { data: emails } = await (db as any).from("email_queue").select("to_address,subject");
    expect(emails.length).toBe(5);
    // owner actions → to carrier
    const toCarrier = emails.filter((e: any) => e.to_address === `${carrier}@test`).map((e: any) => e.subject);
    expect(toCarrier).toEqual(expect.arrayContaining(["assignment:accept", "assignment:book", "assignment:complete"]));
    // carrier actions → to owner
    const toOwner = emails.filter((e: any) => e.to_address === `${owner}@test`).map((e: any) => e.subject);
    expect(toOwner).toEqual(expect.arrayContaining(["assignment:start", "assignment:deliver"]));
  });

  it("cancelLoadWorkflow enqueues email per affected assignment", async () => {
    const a = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    await transitionAssignment({ db: db as any, assignmentId: a.id, action: "accept", actorUserId: owner });
    await cancelLoadWorkflow({ db: db as any, ownerId: owner, loadId: load, onNotify: (e)=>enqueue({ toUserId: e.toUserId }) });
    const { data: emails } = await (db as any).from("email_queue").select("to_address,subject");
    expect(emails.length).toBe(1);
    expect(emails[0].to_address).toBe(`${carrier}@test`);
    expect(emails[0].subject).toBe("load:cancel");
  });
});
