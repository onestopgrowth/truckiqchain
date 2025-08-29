"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

const equipmentTypes = [
  { value: "", label: "All Equipment" },
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
  { value: "", label: "All Statuses" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "unavailable", label: "Unavailable" },
]

export function MatchingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [equipment, setEquipment] = useState(searchParams.get("equipment") || "")
  const [minXp, setMinXp] = useState(searchParams.get("minXp") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [availability, setAvailability] = useState(searchParams.get("availability") || "")

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (equipment) params.set("equipment", equipment)
    if (minXp) params.set("minXp", minXp)
    if (location) params.set("location", location)
    if (availability) params.set("availability", availability)

    router.push(`/dashboard/matching?${params.toString()}`)
  }

  const clearFilters = () => {
    setEquipment("")
    setMinXp("")
    setLocation("")
    setAvailability("")
    router.push("/dashboard/matching")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="equipment">Equipment Type</Label>
        <Select value={equipment} onValueChange={setEquipment}>
          <SelectTrigger>
            <SelectValue placeholder="Select equipment" />
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
            <SelectValue placeholder="Select status" />
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

      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={clearFilters} variant="outline">
          Clear
        </Button>
      </div>
    </div>
  )
}
