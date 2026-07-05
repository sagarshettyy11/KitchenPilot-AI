import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/site/Logo";

export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Logo />
        </div>
        <div className="flex-1 space-y-1.5 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton
                className="h-3.5 flex-1 rounded"
                style={{ maxWidth: `${60 + ((i * 13) % 40)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 p-3">
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </aside>

      {/* Main column skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur md:px-6">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <Skeleton className="ml-auto h-9 w-9 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-4 h-64 w-full rounded-xl" />
              </div>
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
