"use client";

import Link from "next/link";
import { useCurrentUser } from "../services/supabase/hooks/useCurrentUser";
import { Button } from "./ui/button";
import { LogoutButton } from "../services/supabase/components/logout-button";

export default function Navbar() {
  const { user, isLoading } = useCurrentUser();

  return (
    <div className="border-b bg-background h-header">
      <nav className="container  mx-auto px-4 flex items-center justify-between h-full gap-4">
        <Link href="/" className="text-xl font-bold">
          Pachat
        </Link>

        {isLoading || user == null ? (
          <Button asChild>
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user.user_metadata?.preferred_username || user.email}
            </span>
            <LogoutButton />
          </div>
        )}
      </nav>
    </div>
  );
}
