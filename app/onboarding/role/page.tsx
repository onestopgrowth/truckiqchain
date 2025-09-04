import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RoleOnboardingPage() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "carrier") redirect("/onboarding/carrier");
  if (profile?.role === "capacity_finder") redirect("/dashboard");

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Your Role</CardTitle>
          <CardDescription>Choose how you will use FreightMatch</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            method="post"
            action="/onboarding/role/set"
            className="flex flex-col gap-3"
          >
            <Button type="submit" name="role" value="carrier" className="w-full">
              I am a Carrier
            </Button>
            <Button
              type="submit"
              name="role"
              value="capacity_finder"
              variant="outline"
              className="w-full"
            >
              I am a Capacity Finder
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}