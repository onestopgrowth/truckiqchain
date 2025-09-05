import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function fetchAssignments() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/assignments?role=carrier`, { cache: 'no-store', headers: { 'Cookie': '' } });
  // fallback: call directly via supabase if needed
  return [];
}

export default async function CarrierAssignmentsPage() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data } = await sb.from('assignments').select('id,load_id,status,requested_at,booked_at,in_transit_at,delivered_at,completed_at').eq('carrier_user_id', user.id).order('requested_at', { ascending: false });
  const rows = data || [];
  return (
    <div className='container mx-auto p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>My Assignments</h1>
      <div className='grid gap-4'>
        {rows.map(r => (
          <Card key={r.id} className='border'>
            <CardHeader className='py-3'>
              <CardTitle className='text-base'>Assignment {r.id.slice(0,8)} <span className='text-xs font-normal text-muted-foreground'>({r.status})</span></CardTitle>
            </CardHeader>
            <CardContent className='text-xs space-y-2'>
              <div className='flex gap-2 flex-wrap'>
                <ActionButtons assignment={r} />
              </div>
            </CardContent>
          </Card>
        ))}
        {!rows.length && <p className='text-sm text-muted-foreground'>No assignments yet.</p>}
      </div>
    </div>
  );
}

// client buttons
"use client";
import React, { useTransition } from 'react';
function ActionButtons({ assignment }: { assignment: any }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = React.useState(assignment.status);
  const allowed: {action:string; label:string}[] = [];
  if (status === 'booked') allowed.push({ action: 'start', label: 'Start Transit' });
  if (status === 'in_transit') allowed.push({ action: 'deliver', label: 'Mark Delivered' });
  if (status === 'delivered') allowed.push({ action: 'complete', label: 'Complete' });
  if (['requested','accepted','booked'].includes(status)) allowed.push({ action: 'cancel', label: 'Cancel' });
  async function act(a:string){
    start(async () => {
      const res = await fetch(`/api/assignments/${assignment.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a }) });
      const json = await res.json();
      if (res.ok) setStatus(json.status);
    });
  }
  return (
    <div className='flex gap-2 flex-wrap'>
  {allowed.map(b => <Button key={b.action} size='sm' disabled={pending} onClick={() => act(b.action)}>{b.label}</Button>)}
      <span className='text-[10px] text-muted-foreground'>Status: {status}</span>
    </div>
  )
}
