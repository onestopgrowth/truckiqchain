"use client";
import React, { useTransition } from 'react';
import { Button } from './ui/button';

export default function RequestAssignmentButton({ loadId }: { loadId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            setMsg(null);
            const res = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ load_id: loadId }) });
            const json = await res.json();
            if (!res.ok) setMsg(json.error || 'error'); else setMsg('Requested');
          });
        }}
      >{pending ? '...' : 'Request'}</Button>
      {msg && <span className="text-[10px] text-muted-foreground">{msg}</span>}
    </div>
  );
}
