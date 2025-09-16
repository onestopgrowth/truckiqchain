"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentsStatus } from "@/components/documents-status";

interface CarrierProfile {
  id?: string;
  equipment_type: string;
  xp_score: number;
  availability_status: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  photo_url?: string;
  capacity_weight?: number;
  capacity_length?: number;
  capacity_width?: number;
  capacity_height?: number;
  notes?: string;
}

interface CarrierProfileFormProps {
  initialData?: CarrierProfile;
}

const equipmentTypes = [
  { value: "flatbed", label: "Flatbed" },
  { value: "dry_van", label: "Dry Van" },
  { value: "refrigerated", label: "Refrigerated" },
  { value: "tanker", label: "Tanker" },
  { value: "container", label: "Container" },
  { value: "lowboy", label: "Lowboy" },
  { value: "step_deck", label: "Step Deck" },
  { value: "double_drop", label: "Double Drop" },
  { value: "removable_gooseneck", label: "Removable Gooseneck" },
];

const availabilityOptions = [
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "unavailable", label: "Unavailable" },
];

export function CarrierProfileForm({ initialData }: CarrierProfileFormProps) {
  const [formData, setFormData] = useState<CarrierProfile>({
    equipment_type: initialData?.equipment_type || "",
    xp_score: initialData?.xp_score || 50,
    availability_status: initialData?.availability_status || "busy",
    location_city: initialData?.location_city || "",
    location_state: initialData?.location_state || "",
    location_zip: initialData?.location_zip || "",
    photo_url: (initialData as any)?.photo_url || "",
    capacity_weight: initialData?.capacity_weight || undefined,
    capacity_length: initialData?.capacity_length || undefined,
    capacity_width: initialData?.capacity_width || undefined,
    capacity_height: initialData?.capacity_height || undefined,
    notes: initialData?.notes || "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [docsReady, setDocsReady] = useState(true); // default true; will validate on mount
  const [checkingDocs, setCheckingDocs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createSupabaseClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Prevent accidental 'available' before docs are approved
      const effectiveStatus =
        formData.availability_status === "available" && !docsReady
          ? "busy"
          : formData.availability_status;

      const profileData = {
        user_id: user.user.id,
        ...formData,
        availability_status: effectiveStatus,
      };

      // Send payload to server API to create/update carrier profile
      const resp = await fetch("/api/carrier-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save profile");
      }

      // Best-effort sync of DOT/MC identifiers from profiles
      try {
        await fetch("/api/carrier-profiles/sync-identifiers", {
          method: "POST",
        });
      } catch {}

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof CarrierProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // check required documents approval status (client hint only; server enforces)
  useEffect(() => {
    let active = true;
    (async () => {
      setCheckingDocs(true);
      try {
        const supabase = createSupabaseClient();
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        const { data: docs } = await supabase
          .from("carrier_documents")
          .select("doc_type,review_status")
          .eq("user_id", user.user.id)
          .in("doc_type", ["w9", "coi", "authority"]);
        const approved = new Set(
          (docs || [])
            .filter((d: any) => d.review_status === "approved")
            .map((d: any) => String(d.doc_type).toLowerCase())
        );
        const allMet = ["w9", "coi", "authority"].every((d) => approved.has(d));
        if (active) setDocsReady(allMet);
      } catch {
        if (active) setDocsReady(true); // fail open
      } finally {
        if (active) setCheckingDocs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-6 md:grid-cols-2 lg:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="equipment_type">Equipment Type</Label>
          <Select
            value={formData.equipment_type}
            onValueChange={(value) => updateFormData("equipment_type", value)}
          >
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select equipment type" />
            </SelectTrigger>
            <SelectContent>
              {equipmentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability_status">Availability Status</Label>
          <div className="flex items-center gap-2 w-full">
            <Select
              value={formData.availability_status}
              onValueChange={(value) =>
                updateFormData("availability_status", value)
              }
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((option) => {
                  const disabled = option.value === "available" && !docsReady;
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={disabled}
                    >
                      {option.label}
                      {disabled && " (upload & approve docs first)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {!docsReady && (
            <p className="text-xs text-amber-600">
              Complete and get W-9, COI & Authority approved to set Available.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label>Experience Score: {formData.xp_score}</Label>
        <Slider
          value={[formData.xp_score]}
          onValueChange={(value) => updateFormData("xp_score", value[0])}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Rate your experience level from 0 (new) to 100 (expert). This helps
          capacity finders find qualified carriers.
        </p>
      </div>
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
          <CardDescription>Your primary operating location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="photo_url">Profile Photo URL</Label>
            <Input
              id="photo_url"
              value={formData.photo_url || ""}
              onChange={(e) => updateFormData("photo_url", e.target.value)}
              placeholder="https://.../logo.png"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) =>
                  updateFormData("location_city", e.target.value)
                }
                placeholder="Chicago"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_state">State</Label>
              <Input
                id="location_state"
                value={formData.location_state}
                onChange={(e) =>
                  updateFormData("location_state", e.target.value)
                }
                placeholder="IL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_zip">ZIP Code</Label>
              <Input
                id="location_zip"
                value={formData.location_zip}
                onChange={(e) => updateFormData("location_zip", e.target.value)}
                placeholder="60601"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Capacity Information</CardTitle>
          <CardDescription>
            Your equipment specifications (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacity_weight">Weight Capacity (lbs)</Label>
              <Input
                id="capacity_weight"
                type="number"
                value={formData.capacity_weight || ""}
                onChange={(e) =>
                  updateFormData(
                    "capacity_weight",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                placeholder="80000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_length">Length (ft)</Label>
              <Input
                id="capacity_length"
                type="number"
                value={formData.capacity_length || ""}
                onChange={(e) =>
                  updateFormData(
                    "capacity_length",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                placeholder="53"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_width">Width (ft)</Label>
              <Input
                id="capacity_width"
                type="number"
                value={formData.capacity_width || ""}
                onChange={(e) =>
                  updateFormData(
                    "capacity_width",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                placeholder="8.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_height">Height (ft)</Label>
              <Input
                id="capacity_height"
                type="number"
                value={formData.capacity_height || ""}
                onChange={(e) =>
                  updateFormData(
                    "capacity_height",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                placeholder="13.6"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormData("notes", e.target.value)}
          placeholder="Any additional information about your equipment or services..."
          rows={3}
        />
      </div>
      {initialData && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Upload W-9, COI, and Operating Authority
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <DocumentsStatus refreshKey={refreshKey} />
              <DocumentUploader onUploaded={() => setRefreshKey(k => k + 1)} />
            </div>
          </CardContent>
        </Card>
      )}
      {error && (
        <p className="text-sm text-destructive lg:col-span-2">{error}</p>
      )}

      <div className="flex gap-4 justify-end lg:col-span-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : initialData
            ? "Update Profile"
            : "Create Profile"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
