"use client";
import React from "react";
import { UploadDocumentsModal } from "@/components/upload-documents-modal";
import { DocumentsSummary } from "@/components/documents-summary";

export default function DashboardUploadArea() {
  return (
    <div className="w-full flex gap-2 items-center">
      <div className="flex-1">
        <UploadDocumentsModal />
      </div>
      <div>
        <DocumentsSummary />
      </div>
    </div>
  );
}
