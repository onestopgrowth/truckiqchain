"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

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

export function MatchingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [equipment, setEquipment] = useState<string | undefined>(searchParams.get("equipment") || undefined)
  const [minXp, setMinXp] = useState(searchParams.get("minXp") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [availability, setAvailability] = useState<string | undefined>(searchParams.get("availability") || undefined)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (equipment) params.set("equipment", equipment)
    if (minXp) params.set("minXp", minXp)
    if (location) params.set("location", location)
    if (availability) params.set("availability", availability)

    router.push(`/dashboard/matching?${params.toString()}`)
  }

  const clearFilters = () => {
    setEquipment(undefined)
    setMinXp("")
    setLocation("")
    setAvailability(undefined)
    router.push("/dashboard/matching")
  }

  return (
    <div className="space-y-4">
      {/* Filter fields */}
      <div className="space-y-2">
        <Label htmlFor="equipment">Equipment Type</Label>
        <Select value={equipment} onValueChange={setEquipment}>
          <SelectTrigger>
            <SelectValue placeholder="All Equipment" />
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
        <Label htmlFor="minXp">Minimum XP Score</Label>
        <Input
          id="minXp"
          type="number"
          min="0"
          max="100"
          value={minXp}
          onChange={(e) => setMinXp(e.target.value)}
          placeholder="e.g. 75"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or State"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability">Availability</Label>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
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

      <div className="flex gap-2 justify-end items-center mt-4">
        <Button onClick={applyFilters}>
          Apply Filters
        </Button>
        <Button onClick={clearFilters} variant="outline">
          Clear
        </Button>
      </div>
    </div>
  )
}
