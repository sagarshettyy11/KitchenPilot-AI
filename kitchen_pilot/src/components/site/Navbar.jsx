import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-4 max-w-7xl px-4">
        <div className="glass shadow-elevated flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#modules"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Modules
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="rounded-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/auth">Start free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
