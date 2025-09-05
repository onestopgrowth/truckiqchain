import { NextResponse } from 'next/server';
import { createMutableServerClient } from '@/lib/supabase/server-mutable';

export const dynamic = 'force-dynamic';

// POST /api/assignments/:id/pod multipart/form-data (file)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = await createMutableServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const { data: assignment, error } = await sb.from('assignments').select('*').eq('id', params.id).single();
    if (error || !assignment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (assignment.carrier_user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (assignment.status !== 'in_transit' && assignment.status !== 'delivered') return NextResponse.json({ error: 'invalid_status' }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) return NextResponse.json({ error: 'missing_file' }, { status: 400 });
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const ext = (file as any).name?.split('.').pop() || 'dat';
    const path = `pods/${params.id}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await sb.storage.from('documents').upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: true });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    const { error: upErr } = await sb.from('assignments').update({ pod_file_path: path, pod_mime_type: file.type || null, pod_uploaded_at: new Date().toISOString(), status: assignment.status === 'in_transit' ? 'delivered' : assignment.status, delivered_at: assignment.status === 'in_transit' ? new Date().toISOString() : assignment.delivered_at }).eq('id', params.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, path });
  } catch(e:any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
