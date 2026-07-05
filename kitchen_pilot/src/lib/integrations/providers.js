/**
 * Modular adapter registry for delivery / online-ordering platforms.
 *
 * Each provider is described by static metadata (id, label, colors, docs URL,
 * accent) plus an `adapter` — the interface any real integration must implement.
 * The default `mockAdapter` simulates test/sync so the UI works end-to-end
 * before real credentials are wired to server-side webhooks + edge functions.
 *
 * To add a new platform (e.g. UberEats):
 *   1. Add a new value to the `delivery_provider` enum via a migration.
 *   2. Add an entry to PROVIDERS below with its own adapter.
 *   3. The Integrations page picks it up automatically.
 */

/** Default mock adapter — deterministic delay + success unless key is blank. */
const mockAdapter = (label) => ({
  test: async ({ api_key }) => {
    await new Promise((r) => setTimeout(r, 800));
    if (!api_key || api_key.length < 6) {
      return { ok: false, message: `${label}: API key looks invalid.` };
    }
    return { ok: true, message: `${label}: connection healthy.` };
  },
  sync: async ({ api_key }) => {
    await new Promise((r) => setTimeout(r, 1200));
    if (!api_key) return { ok: false, message: `${label}: missing credentials.` };
    return { ok: true, message: `${label}: menu + orders synced.` };
  },
});

export const PROVIDERS = [
  {
    id: "swiggy",
    name: "Swiggy",
    tagline: "India's largest food delivery marketplace",
    category: "aggregator",
    accent: "text-orange-600",
    gradient: "from-orange-500 to-orange-600",
    initials: "SW",
    docsUrl: "https://partner.swiggy.com/",
    adapter: mockAdapter("Swiggy"),
  },
  {
    id: "zomato",
    name: "Zomato",
    tagline: "Discovery + delivery across 1000+ cities",
    category: "aggregator",
    accent: "text-red-600",
    gradient: "from-red-500 to-rose-600",
    initials: "ZO",
    docsUrl: "https://www.zomato.com/business",
    adapter: mockAdapter("Zomato"),
  },
  {
    id: "ondc",
    name: "ONDC",
    tagline: "Open Network for Digital Commerce",
    category: "network",
    accent: "text-indigo-600",
    gradient: "from-indigo-500 to-violet-600",
    initials: "ON",
    docsUrl: "https://ondc.org/",
    adapter: mockAdapter("ONDC"),
  },
  {
    id: "magicpin",
    name: "Magicpin",
    tagline: "Hyperlocal discovery + delivery",
    category: "aggregator",
    accent: "text-pink-600",
    gradient: "from-pink-500 to-fuchsia-600",
    initials: "MP",
    docsUrl: "https://magicpin.in/",
    adapter: mockAdapter("Magicpin"),
  },
  {
    id: "rapido",
    name: "Rapido Food",
    tagline: "Bike-first fast delivery (future ready)",
    category: "aggregator",
    accent: "text-yellow-600",
    gradient: "from-yellow-500 to-amber-600",
    initials: "RA",
    docsUrl: "https://rapido.bike/",
    futureReady: true,
    adapter: mockAdapter("Rapido"),
  },
  {
    id: "website",
    name: "Own Website",
    tagline: "Direct orders from your restaurant website",
    category: "direct",
    accent: "text-brand",
    gradient: "from-blue-500 to-indigo-600",
    initials: "WB",
    docsUrl: "#",
    adapter: mockAdapter("Website"),
  },
  {
    id: "mobile_app",
    name: "Mobile App",
    tagline: "Direct orders from your branded mobile app",
    category: "direct",
    accent: "text-accent-teal",
    gradient: "from-teal-500 to-cyan-600",
    initials: "MA",
    docsUrl: "#",
    adapter: mockAdapter("Mobile App"),
  },
];

export function getProvider(id) {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export const PROVIDER_LABELS = Object.fromEntries(PROVIDERS.map((p) => [p.id, p.name]));
