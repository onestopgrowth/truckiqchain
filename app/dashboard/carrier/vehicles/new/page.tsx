import { redirect } from "next/navigation";

export default function NewVehicleRedirect() {
  // The vehicles page includes the Add Vehicle form; redirect here to keep a simple URL
  redirect("/dashboard/carrier/vehicles#add");
}
