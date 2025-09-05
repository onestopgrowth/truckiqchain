"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FinderLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">Finder Sign in</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Sign in logic not implemented yet");
        }}
        className="space-y-3"
      >
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
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-sm">
        New?{" "}
        <Link href="/auth/freight-finder/signup" className="underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
