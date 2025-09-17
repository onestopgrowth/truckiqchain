"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

export default function CancelLoad({ id }: { id: string }) {
  const [pending, start] = React.useTransition ? React.useTransition() : [false, (fn: any) => fn()];
  async function cancel() {
    start(async () => {
      await fetch(`/api/loads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      // naive refresh
      location.reload();
    });
  }
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
      Cancel
    </Button>
  );
}
