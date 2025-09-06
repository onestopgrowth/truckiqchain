"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export function ShowToastFromSearch() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  React.useEffect(() => {
    if (sp.get("needsProfile") === "1") {
      toast({
        id: "carrier-profile-required",
        title: "Complete your carrier profile",
        description:
          "You must create your carrier profile before you can add vehicles.",
      });
      const next = new URL(window.location.href);
      next.searchParams.delete("needsProfile");
      router.replace(next.pathname + next.search + next.hash);
    }
  }, [sp, router, toast]);
  return null;
}
