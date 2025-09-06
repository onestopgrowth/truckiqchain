import { createClient } from "@supabase/supabase-js";

export interface LoadRecord {
  id: string;
  origin_state: string;
  origin_city: string;
  destination_state: string;
  destination_city: string;
  equipment_required: string[];
}

export interface AvailabilityRecord {
  id: string;
  user_id: string;
  carrier_profile_id: string;
  equipment: string[];
  start_at: string;
  end_at: string;
}

export function computeMatchScore(load: LoadRecord, avail: AvailabilityRecord) {
  let score = 0;
  const equipOverlap = load.equipment_required.filter((e) =>
    avail.equipment.includes(e)
  );
  score += equipOverlap.length * 10; // weight equipment heavily
  if (load.origin_state === load.destination_state) {
    // same-state lane often short haul; minor neutral; ignore
  }
  // quick heuristic: bonus if availability currently active
  const now = Date.now();
  const start = Date.parse(avail.start_at);
  const end = Date.parse(avail.end_at);
  if (now >= start && now <= end) score += 5;
  return score;
}
