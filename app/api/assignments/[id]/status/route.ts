import { NextResponse } from 'next/server';
import { createMutableServerClient } from '@/lib/supabase/server-mutable';

export const dynamic = 'force-dynamic';

// PATCH /api/assignments/:id/status { action }
// actions owner: accept|decline|book|cancel ; carrier: cancel ; transitions after booked: start (-> in_transit), deliver (-> delivered), complete (-> completed)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = await createMutableServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const body = await req.json();
    const action = body.action as string;
    if (!action) return NextResponse.json({ error: 'missing_action' }, { status: 400 });

    // fetch assignment + load owner
  const { data: assignment, error } = await sb.from('assignments').select('*').eq('id', params.id).single();
  if (error || !assignment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data: loadRec } = await sb.from('loads').select('user_id').eq('id', assignment.load_id).single();
  const loadOwnerId = loadRec?.user_id;
  const isCarrier = assignment.carrier_user_id === user.id;
    const isOwner = loadOwnerId === user.id;
    if (!isCarrier && !isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const current = assignment.status as string;
    let nextStatus: string | null = null;
    let timestampField: string | null = null;
    function set(ns: string, tf: string) { nextStatus = ns; timestampField = tf; }

    switch(action) {
      case 'accept': if(isOwner && current==='requested'){ set('accepted','accepted_at'); } break;
      case 'decline': if(isOwner && current==='requested'){ set('declined','declined_at'); } break;
      case 'book': if(isOwner && (current==='accepted' || current==='requested')){ set('booked','booked_at'); } break;
      case 'cancel': if((isCarrier && ['requested','accepted','booked'].includes(current)) || (isOwner && ['requested','accepted','booked'].includes(current))){ set('cancelled','cancelled_at'); } break;
      case 'start': if(isCarrier && current==='booked'){ set('in_transit','in_transit_at'); } break;
      case 'deliver': if(isCarrier && current==='in_transit'){ set('delivered','delivered_at'); } break;
      case 'complete': if(isOwner && current==='delivered'){ set('completed','completed_at'); } break;
      default: return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }
    if(!nextStatus) return NextResponse.json({ error: 'transition_not_allowed' }, { status: 400 });

    const update: any = { status: nextStatus };
    if (timestampField) update[timestampField] = new Date().toISOString();
    const { error: upErr } = await sb.from('assignments').update(update).eq('id', params.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch(e:any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
