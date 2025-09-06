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
  const { data } = await sb.from('assignments').select('id,load_id,status,requested_at,accepted_at,booked_at,in_transit_at,delivered_at,completed_at,pod_file_path').eq('carrier_user_id', user.id).order('requested_at', { ascending: false });
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
              <StatusStepper status={r.status} />
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

function StatusStepper({ status }: { status: string }){
  const steps = ['requested','accepted','booked','in_transit','delivered','completed'] as const;
  const idx = steps.indexOf((status as any));
  return (
    <div className='flex items-center gap-2 text-[10px]'>
      {steps.map((s, i) => (
        <div key={s} className='flex items-center gap-2'>
          <span className={`px-2 py-0.5 rounded-full border ${i <= idx ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted'}`}>{s.replace('_',' ')}</span>
          {i < steps.length - 1 && <span className='w-6 h-[1px] bg-border' />}
        </div>
      ))}
    </div>
  )
}
function ActionButtons({ assignment }: { assignment: any }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = React.useState(assignment.status);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const [waypointPending, setWaypointPending] = React.useState(false);

  async function uploadPod(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/assignments/${assignment.id}/pod`, { method: 'POST', body: form });
    if (res.ok) setStatus('delivered');
  }
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
        {status === 'in_transit' && (
          <>
            <button className='text-xs px-2 py-1 rounded border' onClick={() => fileInput.current?.click()}>Upload POD</button>
            <button className='text-xs px-2 py-1 rounded border' disabled={waypointPending} onClick={async () => {
              setWaypointPending(true);
              try {
                let lat: number | undefined = undefined;
                let lon: number | undefined = undefined;
                const note = window.prompt('Waypoint note (optional):') || '';
                if (navigator.geolocation) {
                  await new Promise<void>((resolve) => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      lat = pos.coords.latitude;
                      lon = pos.coords.longitude;
                      resolve();
                    }, () => resolve());
                  });
                }
                await fetch(`/api/assignments/${assignment.id}/waypoints`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lon, note }) });
              } finally {
                setWaypointPending(false);
              }
            }}>Add Waypoint</button>
          </>
        )}
        <input ref={fileInput} type='file' className='hidden' onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPod(f); }} />
    </div>
  )
}
