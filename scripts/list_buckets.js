const fs = require("fs");
const path = require("path");

function loadEnvFile(envPath) {
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
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = process.env[key] || val;
  });
}

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE URL or service role key in env (.env).");
  process.exit(2);
}

async function main() {
  try {
    const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/buckets`;
    console.log("Listing buckets via", url);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });
    const text = await res.text();
    console.log("Status:", res.status);
    try {
      console.log("Response JSON:", JSON.parse(text));
    } catch (e) {
      console.log("Response raw:", text);
    }
    if (!res.ok) process.exit(1);
  } catch (err) {
    console.error("Error listing buckets:", err);
    process.exit(1);
  }
}

main();
