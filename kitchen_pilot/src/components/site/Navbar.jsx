import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

export function Navbar() {
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
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">Start free</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
