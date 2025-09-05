import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RequestAssignmentButton from '@/components/request-assignment-button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LoadDetail({ params }: { params: { id: string } }) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: load } = await sb.from('loads').select('*').eq('id', params.id).maybeSingle();
  if (!load) return <div className='p-6'>Load not found. <Link href='/dashboard/capacity/loads' className='underline'>Back</Link></div>;
  const { data: assignment } = await sb.from('assignments').select('id,status').eq('load_id', load.id).eq('carrier_user_id', user.id).maybeSingle();
  return (
    <div className='container mx-auto p-6 space-y-4'>
      <Link href='/dashboard/capacity/loads' className='text-xs underline'>Back to Loads</Link>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>{load.title || 'Load'}</span>
            <div className='flex gap-2 flex-wrap'>
              {load.equipment_required?.map((e:string)=><Badge key={e} variant='secondary' className='text-xs'>{e}</Badge>)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className='text-sm space-y-2'>
          <div>{load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}</div>
          {load.weight_lbs && <div>Weight: {load.weight_lbs} lbs</div>}
          {load.pickup_earliest && <div>Pickup Earliest: {new Date(load.pickup_earliest).toLocaleString()}</div>}
          {load.delivery_latest && <div>Delivery Latest: {new Date(load.delivery_latest).toLocaleString()}</div>}
          <div className='pt-4 border-t flex items-center justify-between'>
            {assignment ? <span className='text-xs text-muted-foreground'>Assignment: {assignment.status}</span> : <RequestAssignmentButton loadId={load.id} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
