import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoMark}
        alt="KitchenPilot"
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg"
      />

      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Kitchen<span className="text-brand">Pilot</span>
        </span>
      )}
    </div>
  );
}
