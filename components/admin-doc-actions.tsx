"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminDocActions({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus || "pending");
  const [loading, setLoading] = useState(false);

  async function patch(newStatus: string) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/carrier-documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: newStatus }),
      });
      if (!resp.ok) throw new Error("Failed");
      setStatus(newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => patch("approved")}
        disabled={loading || status === "approved"}
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        onClick={() => patch("rejected")}
        disabled={loading || status === "rejected"}
      >
        Reject
      </Button>
    </div>
  );
}
