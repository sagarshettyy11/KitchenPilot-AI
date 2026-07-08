import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Building2,
  MapPin,
  FileText,
  Save,
  Loader2,
  Database,
  Globe,
  UtensilsCrossed
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const LOCAL_STORAGE_KEY = "kitchenpilot_settings_fallback_data";

function useRestaurantDetails(userId) {
  return useQuery({
    queryKey: ["primary-restaurant-details", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;

      // Auto-provision a default restaurant if missing
      const { data: created, error: createErr } = await supabase
        .from("restaurants")
        .insert({ 
          owner_id: userId, 
          name: "Cravo Good Food", 
          currency: "INR", 
          country: "India",
          business_type: "QSR",
          cuisine: "Burgers, Fast Food"
        })
        .select("*")
        .single();

      if (createErr) throw createErr;
      return created;
    },
    enabled: !!userId,
    retry: false
  });
}

export function SettingsPage() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: dbRestaurant, isLoading, error: dbError } = useRestaurantDetails(user?.id);

  // Check fallback mode
  const isFallbackMode = !!dbError;

  // Local settings state
  const [settings, setSettings] = useState({
    name: "",
    business_type: "",
    cuisine: "",
    address: "",
    city: "",
    country: "",
    gst_number: "",
    currency: "INR"
  });

  // Load database values
  useEffect(() => {
    if (dbRestaurant) {
      setSettings({
        name: dbRestaurant.name || "",
        business_type: dbRestaurant.business_type || "",
        cuisine: dbRestaurant.cuisine || "",
        address: dbRestaurant.address || "",
        city: dbRestaurant.city || "",
        country: dbRestaurant.country || "",
        gst_number: dbRestaurant.gst_number || "",
        currency: dbRestaurant.currency || "INR"
      });
    }
  }, [dbRestaurant]);

  // Load from local storage in fallback mode
  useEffect(() => {
    if (isFallbackMode) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (e) {
          // ignore
        }
      } else {
        const defaultLocal = {
          name: "Cravo Good Food (Demo)",
          business_type: "QSR",
          cuisine: "Burgers & Milkshakes",
          address: "123 Food Street, Koramangala",
          city: "Bengaluru",
          country: "India",
          gst_number: "29AAAAA1111A1Z1",
          currency: "INR"
        };
        setSettings(defaultLocal);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultLocal));
      }
    }
  }, [isFallbackMode]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedData) => {
      if (isFallbackMode) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
        setSettings(updatedData);
        return;
      }

      if (!dbRestaurant?.id) {
        throw new Error("No restaurant profile found to update.");
      }

      const { error } = await supabase
        .from("restaurants")
        .update({
          name: updatedData.name,
          business_type: updatedData.business_type,
          cuisine: updatedData.cuisine,
          address: updatedData.address,
          city: updatedData.city,
          country: updatedData.country,
          gst_number: updatedData.gst_number,
          currency: updatedData.currency
        })
        .eq("id", dbRestaurant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Restaurant settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["primary-restaurant-details", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["primary-restaurant", user?.id] });
    },
    onError: (e) => {
      toast.error(e.message || "Failed to update settings");
    }
  });

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!settings.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="text-slate-500 text-sm">Loading settings details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 via-slate-50 to-orange-100 p-6 rounded-2xl border border-orange-200/50 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"></div>
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Settings</h1>
            {isFallbackMode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <Database className="h-3 w-3" /> DEMO MODE
              </Badge>
            )}
          </div>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Manage your restaurant profile details, location details, billing currency, and GST settings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Tabs defaultValue="general" className="w-full flex flex-col md:flex-row gap-6">
          {/* Tabs Sidebar */}
          <TabsList className="flex md:flex-col items-stretch justify-start bg-slate-100/80 p-1.5 rounded-2xl md:w-56 h-auto shrink-0 border border-slate-200/40">
            <TabsTrigger 
              value="general" 
              className="flex items-center gap-2 px-4 py-3 justify-start rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 text-slate-600"
            >
              <Building2 className="h-4.5 w-4.5" />
              General Details
            </TabsTrigger>
            <TabsTrigger 
              value="location" 
              className="flex items-center gap-2 px-4 py-3 justify-start rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 text-slate-600"
            >
              <MapPin className="h-4.5 w-4.5" />
              Location Details
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="flex items-center gap-2 px-4 py-3 justify-start rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 text-slate-600"
            >
              <FileText className="h-4.5 w-4.5" />
              Taxes & Currency
            </TabsTrigger>
          </TabsList>

          {/* Form Content */}
          <div className="flex-grow">
            {/* General Tab */}
            <TabsContent value="general" className="mt-0 focus-visible:outline-none">
              <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">General Information</CardTitle>
                  <CardDescription>Update your restaurant brand, store name, cuisine type, and business format.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="restName" className="font-semibold text-slate-700 text-sm">Restaurant Name</Label>
                    <Input
                      id="restName"
                      placeholder="e.g. Cravo Good Food"
                      value={settings.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restBizType" className="font-semibold text-slate-700 text-sm">Business Type</Label>
                      <Input
                        id="restBizType"
                        placeholder="e.g. QSR, Cafe, Fine Dining"
                        value={settings.business_type}
                        onChange={(e) => handleInputChange("business_type", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restCuisine" className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-slate-400" /> Cuisines Offered
                      </Label>
                      <Input
                        id="restCuisine"
                        placeholder="e.g. Burgers, Milkshakes, Fast Food"
                        value={settings.cuisine}
                        onChange={(e) => handleInputChange("cuisine", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="mt-0 focus-visible:outline-none">
              <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">Location Settings</CardTitle>
                  <CardDescription>Define physical store address and geography options for customer shipping.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="restAddress" className="font-semibold text-slate-700 text-sm">Street Address</Label>
                    <Input
                      id="restAddress"
                      placeholder="e.g. 123 Food Street, Koramangala 4th Block"
                      value={settings.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restCity" className="font-semibold text-slate-700 text-sm">City</Label>
                      <Input
                        id="restCity"
                        placeholder="e.g. Bengaluru"
                        value={settings.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restCountry" className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-slate-400" /> Country
                      </Label>
                      <Input
                        id="restCountry"
                        placeholder="e.g. India"
                        value={settings.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Taxes & Billing Tab */}
            <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
              <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">Taxes & Currency Settings</CardTitle>
                  <CardDescription>Configure currency tags, invoicing details, and tax reference IDs.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restGst" className="font-semibold text-slate-700 text-sm">GST / Tax Identification Number</Label>
                      <Input
                        id="restGst"
                        placeholder="e.g. 29AAAAA1111A1Z1"
                        value={settings.gst_number}
                        onChange={(e) => handleInputChange("gst_number", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="restCurrency" className="font-semibold text-slate-700 text-sm">Billing Currency</Label>
                      <Input
                        id="restCurrency"
                        placeholder="e.g. INR, USD, EUR"
                        value={settings.currency}
                        onChange={(e) => handleInputChange("currency", e.target.value)}
                        className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Form Actions Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-6">
          <Button 
            type="submit" 
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6 gap-1.5 shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
