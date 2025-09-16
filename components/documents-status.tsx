"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

type DocRecord = {
  id: string;
  doc_type: string;
  file_name: string;
  review_status?: string | null;
};

const REQUIRED = ["w9", "coi", "authority"];


export function DocumentsStatus({ refreshKey = 0 }: { refreshKey?: number }) {
  const [docs, setDocs] = useState<Record<string, DocRecord | null>>({});
  const [loading, setLoading] = useState(false);

  async function fetchDocs() {
    setLoading(true);
    try {
      // Wait 500ms to allow backend to update after upload
      await new Promise((res) => setTimeout(res, 500));
      const resp = await fetch("/api/carrier-documents?ts=" + Date.now());
      if (!resp.ok) return;
      const body = await resp.json();
      const list: DocRecord[] = body.data || [];
      const map: Record<string, DocRecord | null> = {};
      REQUIRED.forEach((r) => (map[r] = null));
      for (const d of list) {
        if (REQUIRED.includes(d.doc_type)) map[d.doc_type] = d;
      }
      setDocs(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const allUploaded = REQUIRED.every((r) => !!docs[r]);
  const allApproved = REQUIRED.every(
    (r) => docs[r]?.review_status === "approved"
  );

  return (
    <div className="space-y-3">
      {loading && (
        <div className="text-sm text-blue-600">Refreshing documents...</div>
      )}
      <div className="flex items-center gap-3">
        {allApproved ? (
          <Badge variant="default">
            <CheckCircle className="w-4 h-4 text-white" /> Verified Carrier
          </Badge>
        ) : allUploaded ? (
          <Badge variant="secondary">Pending Review</Badge>
        ) : (
          <Badge variant="outline">Documents Required</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {REQUIRED.map((r) => {
          const rec = docs[r];
          return (
            <div key={r} className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <div className="capitalize">{r}</div>
                {rec ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {rec.review_status || "Uploaded"}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Missing</span>
                )}
              </div>
              {rec && (
                <div className="text-xs text-muted-foreground mt-2">
                  {rec.file_name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
