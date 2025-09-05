import React from "react";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdminDocActions } from "@/components/admin-doc-actions";

export const dynamic = "force-dynamic";

export default async function AdminCarrierDocs() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  // naive guard: require a profile with role 'admin'
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();
  if (profile?.role !== "admin")
    return <div className="p-6">Not authorized</div>;

  const { data: docs } = await sb
    .from("carrier_documents")
    .select(
      "id, user_id, carrier_profile_id, doc_type, file_name, file_path, file_hash, review_status, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Carrier Documents (Admin)</h1>
      <div className="grid gap-4">
        {docs?.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle>
                {d.doc_type.toUpperCase()} — {d.file_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">Uploaded: {d.created_at}</div>
              <div className="mb-2">Status: {d.review_status}</div>
              <AdminDocActions id={d.id} initialStatus={d.review_status} />
              <div className="mt-2">
                <a target="_blank" rel="noreferrer" href={d.file_path}>
                  Open file
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
