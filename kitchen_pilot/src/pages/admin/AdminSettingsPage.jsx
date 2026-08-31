import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sliders,
  Server,
  ShieldAlert,
  Save,
  Sparkles,
  Bot,
  Database,
  Lock,
  Globe,
  Bell,
  Loader2,
  CheckCircle2,
  Activity
} from "lucide-react";

export function AdminSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch platform settings from Supabase
  const { data: dbSettings = {}, isLoading } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*");
      if (error) return {};

      const map = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      return map;
    },
  });

  const [generalConfig, setGeneralConfig] = useState({
    platform_name: "KitchenPilot AI",
    allow_public_signups: true,
    default_plan: "pro",
    maintenance_mode: false,
    announcement_banner: "",
  });

  const [aiConfig, setAiConfig] = useState({
    provider: "gemini",
    model: "gemini-2.5-flash",
    smart_insights_enabled: true,
    auto_pricing_enabled: true,
  });

  useEffect(() => {
    if (dbSettings.general) {
      setGeneralConfig((prev) => ({ ...prev, ...dbSettings.general }));
    }
    if (dbSettings.ai_config) {
      setAiConfig((prev) => ({ ...prev, ...dbSettings.ai_config }));
    }
  }, [dbSettings]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("platform_settings").upsert([
        { key: "general", value: generalConfig, updated_at: new Date().toISOString() },
        { key: "ai_config", value: aiConfig, updated_at: new Date().toISOString() },
      ]);

      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        admin_email: user?.email,
        action: "UPDATE_PLATFORM_SETTINGS",
        target_type: "platform",
        target_id: "global",
        target_name: "Global Configuration",
        details: { general: generalConfig, ai: aiConfig },
      });
    },
    onSuccess: () => {
      toast.success("Global platform configuration saved and synced to database!");
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    },
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-7 w-7 text-indigo-400" />
          Global Platform Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure multi-tenant defaults, AI copilot engine parameters, and platform-wide security controls with live sync.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading platform settings...</span>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Onboarding & Signup Defaults */}
          <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-400" />
                Tenant Registration Defaults
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Rules applied when new restaurants or hotel properties sign up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Platform Brand Name</Label>
                <Input
                  value={generalConfig.platform_name}
                  onChange={(e) =>
                    setGeneralConfig({ ...generalConfig, platform_name: e.target.value })
                  }
                  className="h-10 rounded-xl bg-slate-950 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Default Self-Service Tier</Label>
                <Select
                  value={generalConfig.default_plan}
                  onValueChange={(val) =>
                    setGeneralConfig({ ...generalConfig, default_plan: val })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-slate-950 border-slate-800 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="starter">Starter Plan</SelectItem>
                    <SelectItem value="pro">Pro Plan (Standard)</SelectItem>
                    <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <p className="text-xs font-bold text-white">Allow Public Restaurant Signups</p>
                  <p className="text-[11px] text-slate-400">If disabled, only SuperAdmins can onboard hotels</p>
                </div>
                <Switch
                  checked={generalConfig.allow_public_signups}
                  onCheckedChange={(val) =>
                    setGeneralConfig({ ...generalConfig, allow_public_signups: val })
                  }
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI & Copilot Engine */}
          <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                KitchenPilot AI Copilot Engine
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Intelligence layer parameters and automated menu forecasting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/30">
                <div>
                  <p className="text-xs font-bold text-cyan-300">Model: Gemini 2.5 Flash Engine</p>
                  <p className="text-[11px] text-slate-400">Ultra-fast chef intelligence & kitchen telemetry</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <p className="text-xs font-bold text-white">Smart Inventory & Demand Predictions</p>
                  <p className="text-[11px] text-slate-400">Predict daily ingredient requirements with AI</p>
                </div>
                <Switch
                  checked={aiConfig.smart_insights_enabled}
                  onCheckedChange={(val) =>
                    setAiConfig({ ...aiConfig, smart_insights_enabled: val })
                  }
                  className="data-[state=checked]:bg-cyan-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <p className="text-xs font-bold text-white">Automated Menu Pricing Optimization</p>
                  <p className="text-[11px] text-slate-400">Suggest margin improvements on top sellers</p>
                </div>
                <Switch
                  checked={aiConfig.auto_pricing_enabled}
                  onCheckedChange={(val) =>
                    setAiConfig({ ...aiConfig, auto_pricing_enabled: val })
                  }
                  className="data-[state=checked]:bg-cyan-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Maintenance */}
          <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 md:col-span-2 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Platform Maintenance & Safety
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                System-wide maintenance flags and emergency controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30">
                <div>
                  <p className="text-sm font-bold text-amber-300">Maintenance Mode</p>
                  <p className="text-xs text-slate-400">
                    Temporarily lock restaurant portals for all non-admin users during updates.
                  </p>
                </div>
                <Switch
                  checked={generalConfig.maintenance_mode}
                  onCheckedChange={(val) =>
                    setGeneralConfig({ ...generalConfig, maintenance_mode: val })
                  }
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-indigo-600/25 gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Global Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
