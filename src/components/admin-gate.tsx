"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockAdmin } from "@/app/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

export function AdminGate() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await unlockAdmin(passcode);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not unlock.");
    });
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Enter the admin passcode to manage the tournament.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="password"
              inputMode="text"
              autoFocus
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={pending || !passcode}>
              {pending ? "Checking…" : "Unlock"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
