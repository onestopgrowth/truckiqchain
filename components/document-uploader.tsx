"use client";
import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";

export function DocumentUploader({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>("w9");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(async () => {
    if (!file) return setMessage("No file selected");
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("doc_type", type);
      fd.append("file", file);

      const resp = await fetch("/api/carrier-documents", {
        method: "POST",
        body: fd,
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || "Upload failed");
      }
      setMessage("Uploaded");
      onUploaded?.();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [file, type, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) setFile(f);
  }, []);

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm">Document Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full rounded border p-2"
        >
          <option value="w9">W-9</option>
          <option value="coi">COI</option>
          <option value="authority">Operating Authority</option>
        </select>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-2 p-4 border-dashed rounded ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
        }`}
      >
        <div className="text-sm text-muted-foreground">
          Drag & drop a file here, or click to choose
        </div>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2"
        />
        {file && <div className="mt-2 text-sm">Selected: {file.name}</div>}
      </div>

      <div className="flex gap-2">
        <Button onClick={upload} disabled={loading || !file}>
          {loading ? "Uploading..." : "Upload Document"}
        </Button>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
