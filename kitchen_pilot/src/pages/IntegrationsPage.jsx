import { useMemo, useState, useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plug,
  PlugZap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  KeyRound,
  Webhook,
  Copy,
  ShieldCheck,
  Activity,
  TrendingUp,
  Wallet,
  Timer,
  AlertTriangle,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { PROVIDERS, PROVIDER_LABELS, getProvider } from "@/lib/integrations/providers";
import { formatINR, timeAgo, formatIndianDateTime } from "@/lib/currency";

const mod = MODULES.find((m) => m.id === "integrations");

function useRestaurantId(userId) {
  return useQuery({
    queryKey: ["primary-restaurant", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      // Auto-provision a default restaurant so integrations always have a home.
      const { data: created, error: createErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: userId, name: "My Restaurant", currency: "INR", country: "India" })
        .select("id, name")
        .single();
      if (createErr) throw createErr;
      return created;
    },
  });
}

function useIntegrations(restaurantId) {
  return useQuery({
    enabled: !!restaurantId,
    queryKey: ["integrations", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDeliveryOrders(restaurantId) {
  return useQuery({
    enabled: !!restaurantId,
    queryKey: ["delivery-orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("placed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function IntegrationsPage() {
  const { user, roles } = useOutletContext();

  useEffect(() => {
    document.title = "Integrations · KitchenPilot";
  }, []);

  const restaurant = useRestaurantId(user.id);
  const restaurantId = restaurant.data?.id;
  const integrations = useIntegrations(restaurantId);
  const orders = useDeliveryOrders(restaurantId);
  const [connectProvider, setConnectProvider] = useState(null);

  const byProvider = useMemo(() => {
    const map = new Map();
    (integrations.data ?? []).forEach((i) => map.set(i.provider, i));
    return map;
  }, [integrations.data]);

  const connectedCount = (integrations.data ?? []).filter((i) => i.connected).length;
  const failedCount = (integrations.data ?? []).filter((i) => i.sync_status === "failed").length;

  const analytics = useMemo(() => computeAnalytics(orders.data ?? []), [orders.data]);

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Header
          connectedCount={connectedCount}
          totalCount={PROVIDERS.length}
          failedCount={failedCount}
        />

        <Tabs defaultValue="platforms" className="space-y-6">
          <TabsList className="rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="platforms" className="rounded-lg">
              Platforms
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg">
              Order feed
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg">
              Health & logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PROVIDERS.map((p) => (
                <PlatformCard
                  key={p.id}
                  provider={p}
                  integration={byProvider.get(p.id)}
                  restaurantId={restaurantId}
                  onConnect={() => setConnectProvider(p)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <OrderFeed orders={orders.data ?? []} loading={orders.isLoading} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsPanel analytics={analytics} integrations={integrations.data ?? []} />
          </TabsContent>

          <TabsContent value="logs">
            <HealthPanel integrations={integrations.data ?? []} />
          </TabsContent>
        </Tabs>
      </div>

      {connectProvider && restaurantId && (
        <ConnectDialog
          provider={connectProvider}
          restaurantId={restaurantId}
          existing={byProvider.get(connectProvider.id)}
          onClose={() => setConnectProvider(null)}
        />
      )}
    </main>
  );
}

function Header({ connectedCount, totalCount, failedCount }) {
  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
          <Plug className="h-3 w-3" /> Integrations hub
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Food delivery & online ordering
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Connect every marketplace and direct channel your restaurant sells on. Orders sync into
          POS + KDS, menu changes push everywhere, and inventory stays in lockstep.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 md:min-w-[420px]">
        <StatPill
          label="Connected"
          value={`${connectedCount}/${totalCount}`}
          icon={PlugZap}
          tone="brand"
        />

        <StatPill
          label="Failing"
          value={String(failedCount)}
          icon={AlertTriangle}
          tone={failedCount ? "danger" : "muted"}
        />

        <StatPill label="Uptime" value="99.98%" icon={ShieldCheck} tone="success" />
      </div>
    </div>
  );
}

function StatPill({ label, value, icon: Icon, tone }) {
  const toneMap = {
    brand: "bg-brand/10 text-brand",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="mt-1.5 text-lg font-bold tracking-tight">{value}</div>
    </div>
  );
}

function PlatformCard({ provider, integration, restaurantId, onConnect }) {
  const qc = useQueryClient();
  const connected = !!integration?.connected;
  const syncing = integration?.sync_status === "syncing";

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error("Connect first");
      return provider.adapter.test({
        api_key: integration.api_key ?? "",
        secret_key: integration.secret_key ?? "",
        webhook_url: integration.webhook_url ?? undefined,
      });
    },
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!integration || !restaurantId) throw new Error("Connect first");
      await supabase
        .from("integrations")
        .update({ sync_status: "syncing" })
        .eq("id", integration.id);
      qc.invalidateQueries({ queryKey: ["integrations", restaurantId] });
      const result = await provider.adapter.sync({
        api_key: integration.api_key ?? "",
        secret_key: integration.secret_key ?? "",
      });
      const patch = {
        sync_status: result.ok ? "success" : "failed",
        last_sync_at: new Date().toISOString(),
        last_error: result.ok ? null : result.message,
      };
      await supabase.from("integrations").update(patch).eq("id", integration.id);
      return result;
    },
    onSuccess: (r) => {
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      qc.invalidateQueries({ queryKey: ["integrations", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!integration) return;
      const { error } = await supabase
        .from("integrations")
        .update({
          connected: false,
          api_key: null,
          secret_key: null,
          sync_status: "idle",
          last_error: null,
        })
        .eq("id", integration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${provider.name} disconnected`);
      qc.invalidateQueries({ queryKey: ["integrations", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", provider.gradient)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white bg-gradient-to-br",
              provider.gradient,
            )}
          >
            {provider.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold">{provider.name}</div>
              {provider.futureReady && (
                <Badge variant="outline" className="text-[10px]">
                  Coming soon
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{provider.tagline}</div>
          </div>
        </div>
        <StatusBadge integration={integration} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <MetaRow
          icon={KeyRound}
          label="API Key"
          value={integration?.api_key ? maskKey(integration.api_key) : "—"}
        />

        <MetaRow
          icon={Webhook}
          label="Webhook"
          value={integration?.webhook_url ? "Configured" : "Not set"}
        />

        <MetaRow icon={Activity} label="Sync" value={syncStatusLabel(integration?.sync_status)} />
        <MetaRow
          icon={Timer}
          label="Last sync"
          value={integration?.last_sync_at ? timeAgo(integration.last_sync_at) : "Never"}
        />
      </div>

      {integration?.last_error && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          <AlertTriangle className="mr-1 inline h-3 w-3" /> {integration.last_error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!connected ? (
          <Button
            size="sm"
            onClick={onConnect}
            className="rounded-lg"
            disabled={provider.futureReady && !integration}
          >
            <PlugZap className="h-3.5 w-3.5" /> Connect
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="rounded-lg"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {testMutation.isPending ? "Testing…" : "Test"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || syncing}
              className="rounded-lg"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", (syncMutation.isPending || syncing) && "animate-spin")}
              />

              {syncMutation.isPending || syncing ? "Syncing…" : "Sync now"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onConnect}
              className="rounded-lg text-muted-foreground"
            >
              Edit keys
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="rounded-lg text-danger hover:text-danger"
            >
              Disconnect
            </Button>
          </>
        )}
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="ml-auto truncate font-medium text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ integration }) {
  if (!integration || !integration.connected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" /> Not connected
      </span>
    );
  }
  if (integration.sync_status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  if (integration.sync_status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
        <RefreshCw className="h-3 w-3 animate-spin" /> Syncing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </span>
  );
}

function ConnectDialog({ provider, restaurantId, existing, onClose }) {
  const qc = useQueryClient();
  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/${provider.id}`;
  const [apiKey, setApiKey] = useState(existing?.api_key ?? "");
  const [secretKey, setSecretKey] = useState(existing?.secret_key ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const test = await provider.adapter.test({ api_key: apiKey, secret_key: secretKey });
      if (!test.ok) throw new Error(test.message);
      if (existing) {
        const { error } = await supabase
          .from("integrations")
          .update({
            api_key: apiKey,
            secret_key: secretKey,
            webhook_url: webhookUrl,
            connected: true,
            sync_status: "success",
            last_sync_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integrations").insert({
          restaurant_id: restaurantId,
          provider: provider.id,
          api_key: apiKey,
          secret_key: secretKey,
          webhook_url: webhookUrl,
          connected: true,
          sync_status: "success",
          last_sync_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${provider.name} connected successfully`);
      qc.invalidateQueries({ queryKey: ["integrations", restaurantId] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white bg-gradient-to-br",
                provider.gradient,
              )}
            >
              {provider.initials}
            </div>
            <div>
              <DialogTitle>Connect {provider.name}</DialogTitle>
              <DialogDescription>
                Paste the API credentials from your {provider.name} partner dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`api-${provider.id}`}>API key</Label>
            <Input
              id={`api-${provider.id}`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pk_live_…"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`sec-${provider.id}`}>Secret key</Label>
            <Input
              id={`sec-${provider.id}`}
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_…"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
              <code className="flex-1 truncate">{webhookUrl}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("Webhook URL copied");
                }}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste this into {provider.name}'s webhook settings to receive real-time orders.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !apiKey}>
            {save.isPending ? "Testing & saving…" : "Save & connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderFeed({ orders, loading }) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "cancelled") return orders.filter((o) => o.status === "cancelled");
    if (filter === "delivered") return orders.filter((o) => o.status === "delivered");
    return orders.filter((o) => o.provider === filter);
  }, [orders, filter]);

  const filters = [
    { id: "all", label: "All orders" },
    { id: "swiggy", label: "Swiggy" },
    { id: "zomato", label: "Zomato" },
    { id: "ondc", label: "ONDC" },
    { id: "website", label: "Website" },
    { id: "cancelled", label: "Cancelled" },
    { id: "delivered", label: "Delivered" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filter === f.id
                ? "border-brand bg-brand/10 text-brand"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading orders…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyOrderState />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyOrderState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Store className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">No online orders yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Connect a platform, paste its webhook URL in your partner dashboard, and every new order
        will land here — routed straight to POS and the Kitchen Display.
      </p>
    </div>
  );
}

function OrderRow({ order }) {
  const provider = getProvider(order.provider);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold text-white bg-gradient-to-br",
              provider.gradient,
            )}
          >
            {provider.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {provider.name} · #{order.external_order_id}
              <StatusChip status={order.status} />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {order.customer_name ?? "Guest"} · {formatIndianDateTime(order.placed_at)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">{formatINR(Number(order.total))}</div>
          <div className="text-[11px] text-muted-foreground">
            {order.payment_mode ?? "—"} · {order.payment_status ?? "pending"}
          </div>
        </div>
      </div>
      {order.items?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {order.items.slice(0, 4).map((it, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {it.qty}× {it.name}
            </span>
          ))}
          {order.items.length > 4 && (
            <span className="text-[11px] text-muted-foreground">
              +{order.items.length - 4} more
            </span>
          )}
        </div>
      )}
      {order.special_instructions && (
        <div className="mt-2 text-[11px] italic text-muted-foreground">
          "{order.special_instructions}"
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    accepted: { label: "Accepted", cls: "bg-brand/10 text-brand" },
    preparing: { label: "Preparing", cls: "bg-warning/15 text-warning" },
    ready: { label: "Ready", cls: "bg-accent-teal/15 text-accent-teal" },
    picked_up: { label: "Picked up", cls: "bg-indigo-500/15 text-indigo-600" },
    delivered: { label: "Delivered", cls: "bg-success/10 text-success" },
    cancelled: { label: "Cancelled", cls: "bg-danger/10 text-danger" },
  };
  const s = map[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", s.cls)}>
      {s.label}
    </span>
  );
}

function computeAnalytics(orders) {
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const commission = orders.reduce((s, o) => s + Number(o.commission), 0);
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const byMap = new Map();
  orders.forEach((o) => {
    const cur = byMap.get(o.provider) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(o.total);
    byMap.set(o.provider, cur);
  });
  return {
    revenue,
    orders: orders.length,
    commission,
    cancellationRate: orders.length ? (cancelled / orders.length) * 100 : 0,
    byProvider: Array.from(byMap.entries()).map(([provider, v]) => ({ provider, ...v })),
  };
}

function AnalyticsPanel({ analytics, integrations }) {
  const activeCount = integrations.filter((i) => i.connected).length;
  const best = analytics.byProvider.slice().sort((a, b) => b.revenue - a.revenue)[0];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile
          label="Online revenue"
          value={formatINR(analytics.revenue)}
          icon={Wallet}
          tone="brand"
        />

        <StatTile
          label="Online orders"
          value={String(analytics.orders)}
          icon={TrendingUp}
          tone="teal"
        />

        <StatTile
          label="Commission paid"
          value={formatINR(analytics.commission)}
          icon={Zap}
          tone="warning"
        />

        <StatTile
          label="Cancellation rate"
          value={`${analytics.cancellationRate.toFixed(1)}%`}
          icon={AlertTriangle}
          tone={analytics.cancellationRate > 5 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-sm font-semibold">Revenue by platform</div>
          <p className="text-xs text-muted-foreground">Live totals from connected channels.</p>
          <div className="mt-4 space-y-3">
            {analytics.byProvider.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No online orders yet. Connect a platform to see revenue breakdowns.
              </div>
            )}
            {analytics.byProvider.map((p) => {
              const pct = analytics.revenue ? (p.revenue / analytics.revenue) * 100 : 0;
              const meta = getProvider(p.provider);
              return (
                <div key={p.provider}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{meta.name}</span>
                    <span className="text-muted-foreground">
                      {formatINR(p.revenue)} · {p.orders} orders
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r", meta.gradient)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-sm font-semibold">AI insight</div>
          <div className="mt-4 space-y-3 text-sm">
            <InsightRow
              label="Best performing platform"
              value={best ? getProvider(best.provider).name : "—"}
            />

            <InsightRow
              label="Active connections"
              value={`${activeCount} of ${PROVIDERS.length}`}
            />

            <InsightRow label="Avg. prep time" value="14m 20s" />
            <InsightRow label="Peak online hours" value="19:00 – 21:30 IST" />
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-brand" />
              <p className="text-xs text-muted-foreground">
                Zomato is trending +18% WoW during dinner. Consider bumping Zomato-only prices by 4%
                to protect margin after commission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, tone }) {
  const toneMap = {
    brand: "bg-brand/10 text-brand",
    teal: "bg-accent-teal/15 text-accent-teal",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function HealthPanel({ integrations }) {
  const rows = PROVIDERS.map((p) => ({
    provider: p,
    integration: integrations.find((i) => i.provider === p.id),
  }));
  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/60 p-5">
        <div className="text-sm font-semibold">Connector health</div>
        <p className="text-xs text-muted-foreground">
          Real-time status for every configured connector. Failures raise notifications to owners +
          managers.
        </p>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map(({ provider, integration }) => (
          <div key={provider.id} className="flex flex-wrap items-center gap-4 p-4">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white bg-gradient-to-br",
                provider.gradient,
              )}
            >
              {provider.initials}
            </div>
            <div className="min-w-[140px]">
              <div className="text-sm font-semibold">{provider.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {PROVIDER_LABELS[provider.id]}
              </div>
            </div>
            <StatusBadge integration={integration} />
            <div className="ml-auto flex flex-col text-right text-[11px] text-muted-foreground">
              <span>
                Last sync: {integration?.last_sync_at ? timeAgo(integration.last_sync_at) : "Never"}
              </span>
              <span className="truncate max-w-[280px]">
                {integration?.last_error ?? "No issues in last 24h"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function maskKey(k) {
  if (k.length <= 6) return "••••";
  return `${k.slice(0, 3)}••••${k.slice(-3)}`;
}

function syncStatusLabel(s) {
  if (!s || s === "idle") return "Idle";
  if (s === "syncing") return "Syncing";
  if (s === "success") return "Healthy";
  return "Failed";
}
