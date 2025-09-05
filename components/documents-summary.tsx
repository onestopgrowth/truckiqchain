"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function DocumentsSummary() {
  const [status, setStatus] = useState<
    "verified" | "pending" | "required" | "loading"
  >("loading");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch("/api/carrier-documents");
        if (!resp.ok) return setStatus("required");
        const body = await resp.json().catch(() => ({}));
        const list = body.data || [];
        const required = ["w9", "coi", "authority"];
        const map = {} as Record<string, any>;
        for (const d of list) map[d.doc_type] = d;
        const allUploaded = required.every((r) => !!map[r]);
        const allApproved = required.every(
          (r) => map[r]?.review_status === "approved"
        );
        if (allApproved) {
          if (mounted) setStatus("verified");
        } else if (allUploaded) {
          if (mounted) setStatus("pending");
        } else {
          if (mounted) setStatus("required");
        }
      } catch (err) {
        if (mounted) setStatus("required");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <Badge variant="outline">Loading…</Badge>;
  if (status === "verified") return <Badge>Verified</Badge>;
  if (status === "pending")
    return <Badge variant="secondary">Pending Review</Badge>;
  return <Badge variant="outline">Docs Required</Badge>;
}
