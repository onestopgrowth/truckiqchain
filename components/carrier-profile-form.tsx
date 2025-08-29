"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"

interface CarrierProfile {
  id?: string
  equipment_type: string
  xp_score: number
  availability_status: string
  location_city: string
  location_state: string
  location_zip: string
  capacity_weight?: number
  capacity_length?: number
  capacity_width?: number
  capacity_height?: number
  notes?: string
}

interface CarrierProfileFormProps {
  initialData?: CarrierProfile
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
]

const availabilityOptions = [
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "unavailable", label: "Unavailable" },
]

export function CarrierProfileForm({ initialData }: CarrierProfileFormProps) {
  const [formData, setFormData] = useState<CarrierProfile>({
    equipment_type: initialData?.equipment_type || "",
    xp_score: initialData?.xp_score || 50,
    availability_status: initialData?.availability_status || "available",
    location_city: initialData?.location_city || "",
    location_state: initialData?.location_state || "",
    location_zip: initialData?.location_zip || "",
    capacity_weight: initialData?.capacity_weight || undefined,
    capacity_length: initialData?.capacity_length || undefined,
    capacity_width: initialData?.capacity_width || undefined,
    capacity_height: initialData?.capacity_height || undefined,
    notes: initialData?.notes || "",
  })

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createSupabaseClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      const profileData = {
        user_id: user.user.id,
        ...formData,
      }

      if (initialData?.id) {
        // Update existing profile
        const { error } = await supabase
          .from("carrier_profiles")
          .update(profileData)
          .eq("id", initialData.id)
          .eq("user_id", user.user.id)
        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase.from("carrier_profiles").insert(profileData)
        if (error) throw error
      }

      router.push("/dashboard")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof CarrierProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="equipment_type">Equipment Type</Label>
          <Select value={formData.equipment_type} onValueChange={(value) => updateFormData("equipment_type", value)}>
            <SelectTrigger>
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
          <Select
            value={formData.availability_status}
            onValueChange={(value) => updateFormData("availability_status", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availabilityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
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
          Rate your experience level from 0 (new) to 100 (expert). This helps capacity finders find qualified carriers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
          <CardDescription>Your primary operating location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => updateFormData("location_city", e.target.value)}
                placeholder="Chicago"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_state">State</Label>
              <Input
                id="location_state"
                value={formData.location_state}
                onChange={(e) => updateFormData("location_state", e.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>Capacity Information</CardTitle>
          <CardDescription>Your equipment specifications (optional)</CardDescription>
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
                  updateFormData("capacity_weight", e.target.value ? Number.parseInt(e.target.value) : undefined)
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
                  updateFormData("capacity_length", e.target.value ? Number.parseInt(e.target.value) : undefined)
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
                  updateFormData("capacity_width", e.target.value ? Number.parseInt(e.target.value) : undefined)
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
                  updateFormData("capacity_height", e.target.value ? Number.parseInt(e.target.value) : undefined)
                }
                placeholder="13.6"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormData("notes", e.target.value)}
          placeholder="Any additional information about your equipment or services..."
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : initialData ? "Update Profile" : "Create Profile"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
