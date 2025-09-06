const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const txt = fs.readFileSync(envPath, "utf8");
  txt.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    process.env[key] = process.env[key] || val;
  });
}

loadEnv(path.resolve(__dirname, "..", ".env"));

// Ordered migrations list
const sqlFiles = [
  "001_create_profiles.sql",
  "002_create_carrier_profiles.sql",
  "003_create_capacity_calls.sql",
  "004_create_triggers.sql",
  "005_create_indexes.sql",
  "006_add_carrier_profile_columns.sql",
  "006_update_carrier_profile_dot_number.sql",
  "007_add_is_verified_column.sql",
  "007_create_carrier_vehicles.sql",
  "008_create_carrier_documents.sql",
  "008_create_events_table.sql",
  "009_create_carrier_availability.sql",
  "010_policies_carrier_availability.sql",
  "011_create_loads.sql",
  "012_add_event_ack.sql",
  "013_create_email_queue.sql",
  "014_add_doc_uniqueness.sql",
  "015_create_assignments.sql",
  "016_availability_enhancements.sql",
  "017_assignment_events.sql",
  "018_loads_policy_assignment_party.sql",
  "019_fix_profiles_policy.sql",
  "020_replace_recursive_profiles_policy.sql",
  "021_disable_profiles_rls.sql",
  "022_update_signup_trigger.sql",
  "023_add_mc_dot_to_profiles.sql",
  "024_add_dot_mc_to_carrier_profiles.sql",
  "025_add_profile_photo.sql",
  "026_create_assignment_waypoints.sql",
  "027_reinstate_profiles_rls.sql",
  "028_break_recursive_rls.sql",
  "029_simplify_loads_policies.sql",
  "030_owner_invite_policy.sql",
  "031_add_pod_url.sql",
];
const dir = path.resolve(__dirname);

(async function () {
  const connection =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connection) {
    console.error("No POSTGRES_URL found in .env");
    process.exit(2);
  }
  // Enable SSL for remote DBs (e.g., Supabase); allow self-signed when necessary
  const isLocal = /localhost|127\.0\.0\.1/.test(connection);
  const client = new Client({
    connectionString: connection,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    for (const f of sqlFiles) {
      const full = path.join(dir, f);
      console.log("Running", full);
      const sql = fs.readFileSync(full, "utf8");
      try {
        await client.query(sql);
        console.log("Applied", f);
      } catch (e) {
        // Continue on duplicate / already exists errors to keep idempotent
        const msg = String(e.message || e);
        if (
          /already exists/i.test(msg) ||
          /duplicate key/i.test(msg) ||
          /42710/.test(msg)
        ) {
          console.warn("Skipped (exists)", f, "->", msg.split("\n")[0]);
          continue;
        }
        throw e;
      }
    }
    console.log("All migrations applied");
    await client.end();
  } catch (err) {
    console.error("Migration error", err);
    try {
      await client.end();
    } catch (e) {}
    process.exit(1);
  }
})();
