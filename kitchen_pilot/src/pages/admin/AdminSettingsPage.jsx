import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Bell
} from "lucide-react";

export function AdminSettingsPage() {
  const [allowPublicSignups, setAllowPublicSignups] = useState(true);
  const [defaultPlan, setDefaultPlan] = useState("pro");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiApiKeyConfigured, setAiApiKeyConfigured] = useState(true);
  const [platformName, setPlatformName] = useState("KitchenPilot AI");

  function handleSave(e) {
    e.preventDefault();
    toast.success("Global platform configuration saved successfully!");
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-7 w-7 text-indigo-400" />
          Global Platform Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure multi-tenant defaults, AI copilot engine parameters, and platform-wide security controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="h-10 rounded-xl bg-slate-950 border-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">Allow Public Restaurant Signups</p>
                <p className="text-[11px] text-slate-400">If disabled, only SuperAdmins can onboard hotels</p>
              </div>
              <Switch
                checked={allowPublicSignups}
                onCheckedChange={setAllowPublicSignups}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">Default Signup Plan Tier</p>
                <p className="text-[11px] text-slate-400">Auto-allocated tier for self-service signups</p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-1 rounded-lg border border-indigo-800">
                PRO PLAN
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AI & Copilot Engine */}
        <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-400" />
              KitchenPilot AI Engine
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Global intelligence and automated chef recommendation status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/30">
              <div>
                <p className="text-xs font-bold text-cyan-300">Google Gemini AI Engine</p>
                <p className="text-[11px] text-slate-400">Active model: Gemini 2.5 Flash High-Speed</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                CONNECTED
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div>
                <p className="text-xs font-bold text-white">Automated Menu Insights</p>
                <p className="text-[11px] text-slate-400">Allow AI to suggest pricing & combo optimizations</p>
              </div>
              <Switch
                checked={aiApiKeyConfigured}
                onCheckedChange={setAiApiKeyConfigured}
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
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end">
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-indigo-600/25 gap-2"
          >
            <Save className="h-4 w-4" /> Save Global Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
