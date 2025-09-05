"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const statusBadgeClass = cn(
    "px-2 py-1 rounded text-[10px] font-medium capitalize border",
    status === "approved" &&
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-600/20 dark:text-green-300 dark:border-green-700",
    status === "rejected" &&
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-600/20 dark:text-red-300 dark:border-red-700",
    status === "pending" &&
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-700"
  );

  return (
  <div className="flex flex-wrap gap-2 items-center justify-end w-full">
      <Button
        variant="success"
        onClick={() => patch("approved")}
        disabled={loading || status === "approved"}
        size="sm"
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        onClick={() => patch("rejected")}
        disabled={loading || status === "rejected"}
        size="sm"
      >
        Reject
      </Button>
    </div>
  );
}

export default AdminDocActions;
