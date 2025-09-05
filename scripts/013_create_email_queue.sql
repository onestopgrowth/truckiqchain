-- Email queue table for async email sending
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address text NOT NULL,
  subject text NOT NULL,
  html text,
  attempts int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
-- Only service role (or future function) will access; for now allow auth users to insert for dev
DROP POLICY IF EXISTS email_queue_insert_any ON email_queue;
CREATE POLICY email_queue_insert_any ON email_queue FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS email_queue_select_admin ON email_queue;
CREATE POLICY email_queue_select_admin ON email_queue FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue(status);
