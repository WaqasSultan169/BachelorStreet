"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      loading={pending}
      onClick={() => startTransition(() => void logout())}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}