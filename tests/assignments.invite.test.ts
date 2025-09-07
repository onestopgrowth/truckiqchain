import { describe, it, expect, beforeEach } from "vitest";
import { FakeSupabase } from "./helpers/fakeSupabase";
import { inviteCarrier } from "@/lib/workflows";

describe("assignments owner invite flow", () => {
  let db: FakeSupabase;
  const owner = "owner-1";
  const carrier = "carrier-1";
  const load = "load-1";

  beforeEach(() => {
    db = new FakeSupabase(owner) as any;
    // seed minimal rows
    (db as any).from("profiles").insert({ id: owner, email: "o@x" });
    (db as any).from("profiles").insert({ id: carrier, email: "c@x" });
    (db as any)
      .from("loads")
      .insert({ id: load, user_id: owner, status: "open", title: "T" });
    (db as any)
      .from("carrier_profiles")
      .insert({ id: "cp-1", user_id: carrier });
  });

  it("creates requested assignment and is idempotent per carrier+load", async () => {
    const a1 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    expect(a1.status).toBe("requested");
    const a2 = await inviteCarrier({ db: db as any, ownerId: owner, carrierUserId: carrier, loadId: load });
    expect(a2.id).toBe(a1.id);
  });
});
