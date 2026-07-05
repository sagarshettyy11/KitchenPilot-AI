import { Link } from "react-router-dom";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";
import {
  ShoppingCart,
  ChefHat,
  Boxes,
  Users,
  LineChart,
  Sparkles,
  Wallet,
  Utensils,
  BarChart3,
  Bell,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Logos />
      <Features />
      <Modules />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 bg-mesh">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-brand" />
            New · AI menu engineering is live
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            The AI Operating System <br className="hidden md:block" />
            for modern{" "}
            <span className="bg-gradient-to-r from-brand to-accent-teal bg-clip-text text-transparent">
              restaurants
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            KitchenPilot unifies POS, kitchen display, inventory, CRM and analytics — with an AI
            assistant that turns every service into a smarter one.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/auth">
                Start 14-day free trial <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <a href="#modules">See modules</a>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-success" /> No credit card
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-success" /> Cancel anytime
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-success" /> GST-ready
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl">
          <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-brand/20 via-accent-teal/10 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated">
            <img
              src={hero}
              alt="KitchenPilot dashboard preview"
              width={1600}
              height={1024}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Logos() {
  const names = [
    "Northside Bistro",
    "Kōji Ramen",
    "The Fork & Vine",
    "Mesa 47",
    "Blue Harbor",
    "Copper Kitchen",
  ];
  return (
    <section className="border-y border-border/60 bg-card/40 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by ambitious kitchens worldwide
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 text-center text-sm font-semibold text-muted-foreground/80 md:grid-cols-6">
          {names.map((n) => (
            <div key={n} className="tracking-tight">
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    {
      i: Zap,
      t: "Lightning-fast POS",
      d: "Ring up orders in under two seconds. Works offline. Cash, card, UPI, wallet, split bills.",
    },
    {
      i: ChefHat,
      t: "Kitchen display",
      d: "Real-time tickets, priority queue, prep timers, and station-level insights.",
    },
    {
      i: Boxes,
      t: "Smart inventory",
      d: "Recipe costing, expiry tracking, low-stock alerts, and AI reorder suggestions.",
    },
    {
      i: BarChart3,
      t: "Live analytics",
      d: "Every KPI you need — revenue, occupancy, waste, staff — in one glance.",
    },
    {
      i: Sparkles,
      t: "AI copilot",
      d: "Ask anything: 'What should I 86 tonight?' KitchenPilot answers with the data.",
    },
    {
      i: Shield,
      t: "GST & compliance",
      d: "Invoicing, tax reports, and audit trails built in. Ready for any market.",
    },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">
            Everything you need
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            One platform. Every station. Zero chaos.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Replace six tools with one — and give your team an interface they'll actually love
            using.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <div
              key={f.t}
              className="group rounded-2xl border border-border/60 bg-card p-6 transition hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Modules() {
  const mods = [
    { i: ShoppingCart, n: "POS" },
    { i: Utensils, n: "Menu" },
    { i: ChefHat, n: "Kitchen" },
    { i: Boxes, n: "Inventory" },
    { i: Users, n: "CRM" },
    { i: Wallet, n: "Finance" },
    { i: LineChart, n: "Reports" },
    { i: Bell, n: "Notifications" },
    { i: Sparkles, n: "AI Assistant" },
  ];
  return (
    <section id="modules" className="border-y border-border/60 bg-card/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-teal">
            The full stack
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Nine modules, one login.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Turn on what you need. Every module works with the others out of the box.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-9">
          {mods.map((m) => (
            <div
              key={m.n}
              className="glass flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <m.i className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold">{m.n}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      n: "Starter",
      p: "₹0",
      d: "For single-outlet cafés getting started.",
      f: ["1 outlet", "Basic POS", "Menu & orders", "Community support"],
    },
    {
      n: "Pro",
      p: "₹2,999",
      d: "The complete OS for growing restaurants.",
      f: [
        "Unlimited outlets",
        "Kitchen display",
        "Inventory + AI",
        "Swiggy + Zomato + ONDC",
        "Analytics + reports",
        "Priority support",
      ],
      highlight: true,
    },
    {
      n: "Enterprise",
      p: "Custom",
      d: "For chains and franchises.",
      f: ["SLA & SSO", "Dedicated success", "Custom integrations", "On-prem option"],
    },
  ];
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">Pricing</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Simple, per-outlet pricing.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.n}
              className={
                "relative rounded-2xl border p-6 " +
                (t.highlight ? "border-brand bg-card shadow-elevated" : "border-border/60 bg-card")
              }
            >
              {t.highlight && (
                <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-foreground">
                  Most popular
                </div>
              )}
              <div className="text-sm font-semibold">{t.n}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{t.p}</span>
                {t.p !== "Custom" && (
                  <span className="text-sm text-muted-foreground">/outlet/mo</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.d}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.f.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {x}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full rounded-xl"
                variant={t.highlight ? "default" : "outline"}
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Do I need special hardware?",
      a: "No. KitchenPilot runs on any modern tablet, phone, or PC. Bring your own printers and QR codes.",
    },
    {
      q: "Can I import my existing menu?",
      a: "Yes. CSV, Excel, or a quick migration from Toast, Square, or Petpooja is one click away.",
    },
    {
      q: "Does it work offline?",
      a: "Yes. The POS keeps working when the internet doesn't. Everything syncs the moment you're back online.",
    },
    {
      q: "How does the AI copilot work?",
      a: "Ask anything about your restaurant in plain English. Sales, waste, staffing, forecasts — you get answers in seconds.",
    },
  ];
  return (
    <section id="faq" className="border-t border-border/60 bg-card/40 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          Frequently asked
        </h2>
        <div className="mt-10 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                {f.q}
                <span className="text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand to-accent-teal p-10 text-brand-foreground md:p-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to run a better restaurant?
          </h2>
          <p className="mt-3 max-w-xl text-white/90">
            Set up in minutes. Free for 14 days. No credit card required.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full px-6">
            <Link to="/auth">
              Start your free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
