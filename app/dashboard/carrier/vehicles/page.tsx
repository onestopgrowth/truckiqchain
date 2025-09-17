import FleetVehicles from "@/components/fleet-vehicles";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VehiclesPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Manage Vehicles</h1>
          <p className="text-muted-foreground">Add and manage your fleet</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
      <FleetVehicles />
    </div>
  );
}
