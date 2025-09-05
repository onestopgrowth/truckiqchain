"use client";
import { useTransition } from "react";

export function DeleteVehicleButton({ id }: { id: string }) {
  const [isPending, start] = useTransition();
  return (
    <form
      action={async () => {
        start(() => {});
        await fetch(`/api/carrier-vehicles/${id}`, { method: "DELETE" });
        // FRAGILE: best to refresh via router.refresh() from parent; here we rely on navigating to same page
        location.reload();
      }}
      className="inline"
    >
      <button
        type="button"
        className="text-red-600"
        onClick={async () => {
          if (!confirm("Delete vehicle?")) return;
          await fetch(`/api/carrier-vehicles/${id}`, { method: "DELETE" });
          location.reload();
        }}
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>
    </form>
  );
}
