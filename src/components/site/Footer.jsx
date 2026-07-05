import { Logo } from "./Logo";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              The AI Operating System for modern restaurants. POS, kitchen, inventory, and insights
              — one premium platform.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold">Product</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>POS</li>
              <li>Kitchen Display</li>
              <li>Inventory</li>
              <li>Integrations</li>
              <li>Analytics</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold">Company</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
              <li>Privacy</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} KitchenPilot. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5">
            Powered by
            <Heart className="h-3 w-3 fill-brand text-brand" />
            <span className="font-semibold text-foreground">Working Dots</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
