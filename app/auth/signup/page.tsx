"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const emailTrim = email.trim();
    const companyTrim = companyName.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }
    if (!role) {
      setError("Please select your role");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const redirectUrl =
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${window.location.origin}/auth/callback`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailTrim,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          // Storing in user metadata (still need profiles row)
          data: {
            role,
            company_name: companyTrim || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      // If email confirmation disabled, we get a session now; create profiles row.
      if (data.session) {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "SIGNED_IN", session: data.session }),
        });
        // Upsert profile server-side via API route so cookies / service client can be used
        try {
          await fetch("/api/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.session.user.id,
              role,
              company_name: companyTrim || null,
              email: emailTrim,
            }),
          });
        } catch (err) {
          console.warn("Profile upsert failed", err);
        }
        // Route based on role
        if (role === "carrier") {
          router.replace("/onboarding/carrier");
        } else {
          router.replace("/dashboard");
        }
      } else {
        // Email confirmation required scenario
        router.replace("/auth/signup-success");
      }
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">FreightMatch</CardTitle>
            <CardDescription>
              Create your freight matching account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} noValidate>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">I am a</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carrier">
                        Carrier - I have trucks and want to find loads
                      </SelectItem>
                      <SelectItem value="capacity_finder">
                        Capacity Finder - I need to find carriers
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Company Name (optional)</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Company LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
