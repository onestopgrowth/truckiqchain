"use client";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { Button } from "@/components/ui/button";

export function DeleteVehicleButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await fetch(`/api/carrier-vehicles/${id}`, { method: "DELETE" });
    setLoading(false);
    setOpen(false);
    location.reload();
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        Delete
      </Button>
      <ConfirmModal
        open={open}
        title="Delete Vehicle?"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  );
}
