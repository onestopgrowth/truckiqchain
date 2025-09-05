"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentUploader } from "@/components/document-uploader";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function UploadDocumentsModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        Upload Documents
      </Button>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded shadow p-6 z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Documents</h3>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <DocumentUploader
              onUploaded={() => {
                router.refresh();
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
