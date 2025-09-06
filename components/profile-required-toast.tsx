"use client";

import * as React from "react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export function ProfileRequiredToast({ redirectTo }: { redirectTo?: string }) {
  const { toast } = useToast();
  React.useEffect(() => {
    const handle = toast({
      id: "carrier-profile-required",
      title: "Complete your carrier profile",
      description:
        "You must create your carrier profile before you can manage vehicles.",
      action: redirectTo ? (
        <Link
          href={redirectTo}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
        >
          Go to Profile
        </Link>
      ) : undefined,
    }) as any;
    return () => handle?.dismiss?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
