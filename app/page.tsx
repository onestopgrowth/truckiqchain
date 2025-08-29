import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">FreightMatch</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Connect Carriers with Capacity</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            FreightMatch is the modern platform that connects carriers with capacity finders, streamlining freight
            operations with XP scoring and intelligent matching.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Matching</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>For Carriers</CardTitle>
                <CardDescription>Showcase your equipment and experience</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Create detailed carrier profiles</li>
                  <li>• Display equipment types and capacity</li>
                  <li>• Build your XP score and reputation</li>
                  <li>• Browse available capacity calls</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>For Capacity Finders</CardTitle>
                <CardDescription>Find qualified carriers quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Post detailed capacity requirements</li>
                  <li>• Set minimum XP score requirements</li>
                  <li>• Filter by equipment type and location</li>
                  <li>• View matching carrier profiles</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>Intelligent freight matching system</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• XP-based carrier qualification</li>
                  <li>• Equipment type matching</li>
                  <li>• Location-based filtering</li>
                  <li>• Real-time availability status</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 FreightMatch. Built for the freight industry.</p>
        </div>
      </footer>
    </div>
  )
}
