import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthLandingPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        FreightMatch — Sign in or Sign up
      </h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Carrier</CardTitle>
            <CardDescription>
              Sign in / Sign up as a Carrier (manage vehicles, upload docs)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/auth/carrier/login">
                <Button className="w-full">Sign in</Button>
              </Link>
              <Link href="/auth/carrier/signup">
                <Button variant="outline" className="w-full">
                  Create Carrier account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity Finder</CardTitle>
            <CardDescription>
              Sign in / Sign up to post loads and find carriers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/auth/capacity/login">
                <Button className="w-full">Sign in</Button>
              </Link>
              <Link href="/auth/capacity/signup">
                <Button variant="outline" className="w-full">
                  Create Capacity Finder account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
