-- Allow linking an external Proof of Delivery URL when closing a load
alter table public.assignments
  add column if not exists pod_url text;
