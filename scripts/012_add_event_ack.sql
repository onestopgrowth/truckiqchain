-- Event acknowledgment table for idempotent processing
CREATE TABLE IF NOT EXISTS event_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  handler text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_acks_unique UNIQUE(event_id, handler)
);

CREATE INDEX IF NOT EXISTS event_acks_handler_idx ON event_acks(handler);
