import { NextResponse } from 'next/server';
import { createMutableServerClient } from '@/lib/supabase/server-mutable';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = await createMutableServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const body = await req.json();
    const update: any = {};
    if (body.start_at) update.start_at = body.start_at;
    if (body.end_at) update.end_at = body.end_at;
    if (body.location !== undefined) update.location = body.location || null;
    if (body.radius_miles !== undefined) update.radius_miles = body.radius_miles ? Number(body.radius_miles) : null;
    if (body.equipment) {
      update.equipment = Array.isArray(body.equipment) ? body.equipment : String(body.equipment).split(',').map((s)=>s.trim()).filter(Boolean);
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
    const { error } = await sb.from('carrier_availability').update(update).eq('id', params.id).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch(e:any) {
    console.error(e); return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = await createMutableServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const { error } = await sb.from('carrier_availability').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch(e:any) { console.error(e); return NextResponse.json({ error: 'server_error' }, { status: 500 }); }
}
