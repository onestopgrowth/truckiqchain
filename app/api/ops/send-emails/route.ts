import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return NextResponse.json({ error: 'missing_service_env' }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false }});

  // fetch batch of pending emails
  const { data: queue, error } = await admin.from('email_queue').select('id,to_address,subject,html,attempts').eq('status','pending').lt('attempts',5).order('created_at').limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!queue?.length) return NextResponse.json({ processed: 0 });

  if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return NextResponse.json({ error: 'smtp_not_configured' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  let success = 0; let failed = 0;
  for (const row of queue) {
    try {
      await admin.from('email_queue').update({ status: 'sending' }).eq('id', row.id);
      await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: row.to_address, subject: row.subject, html: row.html || '' });
      await admin.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id);
      success++;
    } catch (e: any) {
      await admin.from('email_queue').update({ status: 'pending', attempts: row.attempts + 1, last_error: String(e.message || e) }).eq('id', row.id);
      failed++;
    }
  }

  return NextResponse.json({ processed: queue.length, success, failed });
}
