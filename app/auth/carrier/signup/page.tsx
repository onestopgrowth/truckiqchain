"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CarrierSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">Carrier Sign up</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Sign up logic not implemented yet");
        }}
        className="space-y-3"
      >
        <input
          className="w-full input"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className="w-full input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/auth/carrier/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
