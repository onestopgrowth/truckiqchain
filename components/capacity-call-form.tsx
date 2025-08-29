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

interface CapacityCall {
  title: string
  description: string
  origin_city: string
  origin_state: string
  origin_zip: string
  origin_address: string
  destination_city: string
  destination_state: string
  destination_zip: string
  destination_address: string
  equipment_needed: string
  minimum_xp_score: number
  weight?: number
  length?: number
  width?: number
  height?: number
  pickup_date?: string
  delivery_date?: string
  rate_per_mile?: number
  total_rate?: number
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

export function CapacityCallForm() {
  const [formData, setFormData] = useState<CapacityCall>({
    title: "",
    description: "",
    origin_city: "",
    origin_state: "",
    origin_zip: "",
    origin_address: "",
    destination_city: "",
    destination_state: "",
    destination_zip: "",
    destination_address: "",
    equipment_needed: "",
    minimum_xp_score: 50,
    weight: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    pickup_date: "",
    delivery_date: "",
    rate_per_mile: undefined,
    total_rate: undefined,
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

      const capacityCallData = {
        user_id: user.user.id,
        ...formData,
        pickup_date: formData.pickup_date || null,
        delivery_date: formData.delivery_date || null,
      }

      const { error } = await supabase.from("capacity_calls").insert(capacityCallData)
      if (error) throw error

      router.push("/dashboard/capacity/manage")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof CapacityCall, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Load Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
            placeholder="Chicago to Atlanta - Dry Van Load"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipment_needed">Equipment Needed</Label>
          <Select
            value={formData.equipment_needed}
            onValueChange={(value) => updateFormData("equipment_needed", value)}
          >
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Load Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          placeholder="Describe the load, any special requirements, loading/unloading instructions..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Minimum Experience Score: {formData.minimum_xp_score}</Label>
        <Slider
          value={[formData.minimum_xp_score]}
          onValueChange={(value) => updateFormData("minimum_xp_score", value[0])}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Set the minimum experience level required for carriers to bid on this load.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Origin Information</CardTitle>
            <CardDescription>Pickup location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="origin_city">City</Label>
                <Input
                  id="origin_city"
                  value={formData.origin_city}
                  onChange={(e) => updateFormData("origin_city", e.target.value)}
                  placeholder="Chicago"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin_state">State</Label>
                <Input
                  id="origin_state"
                  value={formData.origin_state}
                  onChange={(e) => updateFormData("origin_state", e.target.value)}
                  placeholder="IL"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_zip">ZIP Code</Label>
              <Input
                id="origin_zip"
                value={formData.origin_zip}
                onChange={(e) => updateFormData("origin_zip", e.target.value)}
                placeholder="60601"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_address">Full Address</Label>
              <Input
                id="origin_address"
                value={formData.origin_address}
                onChange={(e) => updateFormData("origin_address", e.target.value)}
                placeholder="123 Main St, Chicago, IL 60601"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destination Information</CardTitle>
            <CardDescription>Delivery location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="destination_city">City</Label>
                <Input
                  id="destination_city"
                  value={formData.destination_city}
                  onChange={(e) => updateFormData("destination_city", e.target.value)}
                  placeholder="Atlanta"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_state">State</Label>
                <Input
                  id="destination_state"
                  value={formData.destination_state}
                  onChange={(e) => updateFormData("destination_state", e.target.value)}
                  placeholder="GA"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_zip">ZIP Code</Label>
              <Input
                id="destination_zip"
                value={formData.destination_zip}
                onChange={(e) => updateFormData("destination_zip", e.target.value)}
                placeholder="30301"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_address">Full Address</Label>
              <Input
                id="destination_address"
                value={formData.destination_address}
                onChange={(e) => updateFormData("destination_address", e.target.value)}
                placeholder="456 Peachtree St, Atlanta, GA 30301"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Load Specifications</CardTitle>
          <CardDescription>Weight, dimensions, and timing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight || ""}
                onChange={(e) => updateFormData("weight", e.target.value ? Number.parseInt(e.target.value) : undefined)}
                placeholder="45000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Length (ft)</Label>
              <Input
                id="length"
                type="number"
                value={formData.length || ""}
                onChange={(e) => updateFormData("length", e.target.value ? Number.parseInt(e.target.value) : undefined)}
                placeholder="48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Width (ft)</Label>
              <Input
                id="width"
                type="number"
                value={formData.width || ""}
                onChange={(e) => updateFormData("width", e.target.value ? Number.parseInt(e.target.value) : undefined)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (ft)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height || ""}
                onChange={(e) => updateFormData("height", e.target.value ? Number.parseInt(e.target.value) : undefined)}
                placeholder="9"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup_date">Pickup Date</Label>
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => updateFormData("pickup_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => updateFormData("delivery_date", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Information</CardTitle>
          <CardDescription>Payment details (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rate_per_mile">Rate per Mile ($)</Label>
              <Input
                id="rate_per_mile"
                type="number"
                step="0.01"
                value={formData.rate_per_mile || ""}
                onChange={(e) =>
                  updateFormData("rate_per_mile", e.target.value ? Number.parseFloat(e.target.value) : undefined)
                }
                placeholder="2.50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_rate">Total Rate ($)</Label>
              <Input
                id="total_rate"
                type="number"
                step="0.01"
                value={formData.total_rate || ""}
                onChange={(e) =>
                  updateFormData("total_rate", e.target.value ? Number.parseFloat(e.target.value) : undefined)
                }
                placeholder="1500.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Posting..." : "Post Capacity Call"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
