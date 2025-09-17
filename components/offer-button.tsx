"use client";
import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export function OfferButton({
  carrierUserId,
  loads,
  offerSent,
}: {
  carrierUserId: string;
  loads: any[];
  offerSent?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" onClick={() => setOpen(true)} disabled={offerSent}>
          {offerSent ? "Offer Sent" : "Send Load Offer"}
        </Button>
      </div>
      {open && !offerSent && (
        <OfferModal
          onClose={() => setOpen(false)}
          carrierUserId={carrierUserId}
          loads={loads}
        />
      )}
    </>
  );
}

function OfferModal({
  onClose,
  carrierUserId,
  loads,
}: {
  onClose: () => void;
  carrierUserId: string;
  loads: any[];
}) {
  const [selected, setSelected] = React.useState<string>("");
  const [pending, start] = useTransition();
  async function sendOffer() {
    if (!selected) return;
    start(async () => {
      const res = await fetch("/api/owner/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier_user_id: carrierUserId,
          load_id: selected,
        }),
      });
      if (res.ok) onClose();
    });
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-md rounded-md border p-4 space-y-4">
        <h3 className="font-semibold">Send Load Offer</h3>
        <div className="text-xs text-muted-foreground">
          Choose one of your open/active loads to offer this carrier.
        </div>
        <Select onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a load" />
          </SelectTrigger>
          <SelectContent>
            {loads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title ||
                  `${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}`} {" "}
                ({l.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!selected || pending} onClick={sendOffer}>
            {pending ? "Sending…" : "Send Offer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
