import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
  Grid,
  List,
  FolderPlus,
  ArrowUpDown,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CATEGORIES_STORAGE_KEY = "kitchenpilot_menu_categories_data";
const ITEMS_STORAGE_KEY = "kitchenpilot_menu_items_data";

const DEFAULT_CATEGORIES = [
  { id: "c-1", name: "Burgers", sort_order: 1 },
  { id: "c-2", name: "Fries", sort_order: 2 },
  { id: "c-3", name: "Wraps", sort_order: 3 },
  { id: "c-4", name: "Smash Burgers", sort_order: 4 },
  { id: "c-5", name: "Nachos", sort_order: 5 },
  { id: "c-6", name: "Nuggets & Chicken Pops", sort_order: 6 },
  { id: "c-7", name: "Momos", sort_order: 7 },
  { id: "c-8", name: "Desserts", sort_order: 8 },
  { id: "c-9", name: "Shakes", sort_order: 9 },
  { id: "c-10", name: "Milkshakes", sort_order: 10 },
  { id: "c-11", name: "Juices", sort_order: 11 },
  { id: "c-12", name: "Combos", sort_order: 12 },
  { id: "c-13", name: "Extras", sort_order: 13 },
];

const DEFAULT_ITEMS = [
  // Burgers
  { id: "i-1", category_id: "c-1", name: "Aloo Tikki Burger", price: 99, item_type: "veg", description: "Crispy aloo tikki patty with fresh veggies and mayonnaise.", is_available: true },
  { id: "i-2", category_id: "c-1", name: "Paneer Tikka Burger", price: 129, item_type: "veg", description: "Spicy grilled paneer tikka patty with premium sauce.", is_available: true },
  { id: "i-3", category_id: "c-1", name: "Veggie Delight Burger", price: 119, item_type: "veg", description: "Classic vegetable patty with cheese and lettuce.", is_available: true },
  { id: "i-4", category_id: "c-1", name: "Spicy Corn & Cheese Burger", price: 139, item_type: "veg", description: "Golden corn and melting cheese patty with spicy sauce.", is_available: true },
  { id: "i-5", category_id: "c-1", name: "Mushroom Magic Burger", price: 139, item_type: "veg", description: "Savory mushroom patty with melted cheese and herbs.", is_available: true },
  { id: "i-6", category_id: "c-1", name: "Classic Chicken Burger", price: 139, item_type: "non-veg", description: "Juicy grilled chicken patty with fresh lettuce and mayo.", is_available: true },
  { id: "i-7", category_id: "c-1", name: "Crispy Chicken Burger", price: 149, item_type: "non-veg", description: "Crispy batter-fried chicken breast with custom dressing.", is_available: true },
  { id: "i-8", category_id: "c-1", name: "Grilled Chicken Burger", price: 159, item_type: "non-veg", description: "Premium flame-grilled chicken breast with herbs.", is_available: true },
  { id: "i-9", category_id: "c-1", name: "Chicken Cheese Burger", price: 169, item_type: "non-veg", description: "Chicken patty loaded with melted cheddar cheese slice.", is_available: true },
  { id: "i-10", category_id: "c-1", name: "Double Chicken Burger", price: 199, item_type: "non-veg", description: "Two flame-grilled chicken patties with double cheese.", is_available: true },
  { id: "i-11", category_id: "c-1", name: "Peri-Peri Chicken Burger", price: 169, item_type: "non-veg", description: "Spicy peri-peri marinated chicken patty with hot sauce.", is_available: true },
  { id: "i-12", category_id: "c-1", name: "BBQ Chicken Burger", price: 179, item_type: "non-veg", description: "Grilled chicken patty glazed with smoky BBQ sauce.", is_available: true },
  { id: "i-13", category_id: "c-1", name: "Mexican Fiesta Burger", price: 179, item_type: "non-veg", description: "Zesty salsa, nachos, and jalapeños with grilled chicken patty.", is_available: true },
  { id: "i-14", category_id: "c-1", name: "Butter Chicken Burger", price: 189, item_type: "non-veg", description: "Rich makhani gravy coated chicken patty with cream.", is_available: true },

  // Fries
  { id: "i-15", category_id: "c-2", name: "Classic Salted Fries", price: 79, item_type: "veg", is_available: true },
  { id: "i-16", category_id: "c-2", name: "Peri-Peri Fries", price: 99, item_type: "veg", is_available: true },
  { id: "i-17", category_id: "c-2", name: "Masala Fries", price: 99, item_type: "veg", is_available: true },
  { id: "i-18", category_id: "c-2", name: "Cheese Loaded Fries", price: 129, item_type: "veg", is_available: true },
  { id: "i-19", category_id: "c-2", name: "BBQ Fries", price: 119, item_type: "veg", is_available: true },

  // Wraps
  { id: "i-20", category_id: "c-3", name: "Classic Veg Wrap", price: 109, item_type: "veg", is_available: true },
  { id: "i-21", category_id: "c-3", name: "Paneer Tikka Wrap", price: 139, item_type: "veg", is_available: true },
  { id: "i-22", category_id: "c-3", name: "Spicy Corn & Jalapeno Wrap", price: 129, item_type: "veg", is_available: true },
  { id: "i-23", category_id: "c-3", name: "Peri-Peri Chicken Wrap", price: 149, item_type: "non-veg", is_available: true },
  { id: "i-24", category_id: "c-3", name: "BBQ Chicken Wrap", price: 149, item_type: "non-veg", is_available: true },
  { id: "i-25", category_id: "c-3", name: "Crispy Chicken Wrap", price: 139, item_type: "non-veg", is_available: true },

  // Smash Burgers
  { id: "i-26", category_id: "c-4", name: "Classic Smash Burger", price: 149, item_type: "non-veg", description: "Smashed patty, cheese, pickles, onions, café sauce.", is_available: true },
  { id: "i-27", category_id: "c-4", name: "Cheesy Smash Burger", price: 169, item_type: "non-veg", description: "Double smashed patty, cheese, grilled onions, chipotle mayo.", is_available: true },
  { id: "i-28", category_id: "c-4", name: "BBQ Smash Burger", price: 179, item_type: "non-veg", description: "Smashed patty, BBQ sauce, cheese, onion rings.", is_available: true },
  { id: "i-29", category_id: "c-4", name: "Spicy Smash Burger", price: 179, item_type: "non-veg", description: "Smashed patty, spicy mayo, jalapeños, cheese.", is_available: true },
  { id: "i-30", category_id: "c-4", name: "Mushroom Swiss Smash Burger", price: 189, item_type: "non-veg", description: "Smashed patty, Swiss cheese, sautéed mushrooms, mayo.", is_available: true },

  // Nachos
  { id: "i-31", category_id: "c-5", name: "Classic Cheese Nachos", price: 119, item_type: "veg", is_available: true },
  { id: "i-32", category_id: "c-5", name: "Salsa Nachos", price: 129, item_type: "veg", is_available: true },
  { id: "i-33", category_id: "c-5", name: "Peri-Peri Nachos", price: 139, item_type: "veg", is_available: true },
  { id: "i-34", category_id: "c-5", name: "BBQ Chicken Nachos", price: 159, item_type: "non-veg", is_available: true },
  { id: "i-35", category_id: "c-5", name: "Loaded Supreme Nachos", price: 179, item_type: "veg", is_available: true },

  // Nuggets & Chicken Pops
  { id: "i-36", category_id: "c-6", name: "Classic Chicken Nuggets", price: 119, item_type: "non-veg", is_available: true },
  { id: "i-37", category_id: "c-6", name: "Peri-Peri Nuggets", price: 129, item_type: "non-veg", is_available: true },
  { id: "i-38", category_id: "c-6", name: "Cheese Stuffed Nuggets", price: 149, item_type: "veg", is_available: true },
  { id: "i-39", category_id: "c-6", name: "Chicken Pops (Classic)", price: 109, item_type: "non-veg", is_available: true },
  { id: "i-40", category_id: "c-6", name: "Spicy Chicken Pops", price: 119, item_type: "non-veg", is_available: true },
  { id: "i-41", category_id: "c-6", name: "Peri-Peri Chicken Pops", price: 129, item_type: "non-veg", is_available: true },

  // Momos
  { id: "i-42", category_id: "c-7", name: "Steamed Momos (Veg)", price: 99, item_type: "veg", is_available: true },
  { id: "i-43", category_id: "c-7", name: "Fried Momos (Veg)", price: 109, item_type: "veg", is_available: true },
  { id: "i-44", category_id: "c-7", name: "Paneer Momos", price: 129, item_type: "veg", is_available: true },
  { id: "i-45", category_id: "c-7", name: "Corn & Cheese Momos", price: 129, item_type: "veg", is_available: true },
  { id: "i-46", category_id: "c-7", name: "Steamed Momos (Chicken)", price: 119, item_type: "non-veg", is_available: true },
  { id: "i-47", category_id: "c-7", name: "Fried Momos (Chicken)", price: 129, item_type: "non-veg", is_available: true },
  { id: "i-48", category_id: "c-7", name: "Peri-Peri Momos (Chicken)", price: 139, item_type: "non-veg", is_available: true },
  { id: "i-49", category_id: "c-7", name: "Cheese Momos (Chicken)", price: 149, item_type: "non-veg", is_available: true },

  // Desserts
  { id: "i-50", category_id: "c-8", name: "Brownie Sundae", price: 149, item_type: "veg", is_available: true },
  { id: "i-51", category_id: "c-8", name: "Choco Fudge Sundae", price: 139, item_type: "veg", is_available: true },
  { id: "i-52", category_id: "c-8", name: "Oreo Overload", price: 149, item_type: "veg", is_available: true },
  { id: "i-53", category_id: "c-8", name: "Waffle Bowl Ice Cream", price: 159, item_type: "veg", is_available: true },
  { id: "i-54", category_id: "c-8", name: "Caramel Crunch Sundae", price: 139, item_type: "veg", is_available: true },
  { id: "i-55", category_id: "c-8", name: "Strawberry Cheesecake Sundae", price: 149, item_type: "veg", is_available: true },

  // Shakes
  { id: "i-56", category_id: "c-9", name: "Chocolate Shake", price: 119, item_type: "veg", is_available: true },
  { id: "i-57", category_id: "c-9", name: "Oreo Shake", price: 129, item_type: "veg", is_available: true },
  { id: "i-58", category_id: "c-9", name: "KitKat Shake", price: 139, item_type: "veg", is_available: true },
  { id: "i-59", category_id: "c-9", name: "Nutella Shake", price: 149, item_type: "veg", is_available: true },
  { id: "i-60", category_id: "c-9", name: "Strawberry Shake", price: 119, item_type: "veg", is_available: true },
  { id: "i-61", category_id: "c-9", name: "Vanilla Shake", price: 109, item_type: "veg", is_available: true },
  { id: "i-62", category_id: "c-9", name: "Butterscotch Shake", price: 129, item_type: "veg", is_available: true },
  { id: "i-63", category_id: "c-9", name: "Cold Coffee Shake", price: 129, item_type: "veg", is_available: true },

  // Milkshakes
  { id: "i-64", category_id: "c-10", name: "Chocolate Milkshake", price: 149, item_type: "veg", is_available: true },
  { id: "i-65", category_id: "c-10", name: "Strawberry Milkshake", price: 149, item_type: "veg", is_available: true },
  { id: "i-66", category_id: "c-10", name: "Vanilla Milkshake", price: 139, item_type: "veg", is_available: true },
  { id: "i-67", category_id: "c-10", name: "Oreo Milkshake", price: 159, item_type: "veg", is_available: true },
  { id: "i-68", category_id: "c-10", name: "Nutella Milkshake", price: 169, item_type: "veg", is_available: true },
  { id: "i-69", category_id: "c-10", name: "KitKat Milkshake", price: 169, item_type: "veg", is_available: true },

  // Juices
  { id: "i-70", category_id: "c-11", name: "Apple Juice", price: 89, item_type: "veg", is_available: true },
  { id: "i-71", category_id: "c-11", name: "Mango Juice", price: 89, item_type: "veg", is_available: true },
  { id: "i-72", category_id: "c-11", name: "Orange Juice", price: 89, item_type: "veg", is_available: true },

  // Combos
  { id: "i-73", category_id: "c-12", name: "Any Veg Burger + Fries + Drink", price: 199, item_type: "veg", is_available: true },
  { id: "i-74", category_id: "c-12", name: "Any Chicken Burger + Fries + Drink", price: 249, item_type: "non-veg", is_available: true },
  { id: "i-75", category_id: "c-12", name: "Smash Burger + Fries + Drink", price: 229, item_type: "non-veg", is_available: true },
  { id: "i-76", category_id: "c-12", name: "Wrap + Fries + Drink", price: 199, item_type: "non-veg", is_available: true },
  { id: "i-77", category_id: "c-12", name: "Nuggets + Fries + Drink", price: 149, item_type: "non-veg", is_available: true },
  { id: "i-78", category_id: "c-12", name: "Momos + Drink", price: 149, item_type: "non-veg", is_available: true },

  // Extras
  { id: "i-79", category_id: "c-13", name: "Extra Cheese", price: 20, item_type: "veg", is_available: true },
  { id: "i-80", category_id: "c-13", name: "Extra Sauce", price: 20, item_type: "veg", is_available: true },
  { id: "i-81", category_id: "c-13", name: "Extra Patty", price: 40, item_type: "non-veg", is_available: true },
];

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
      // Auto-provision a default restaurant
      const { data: created, error: createErr } = await supabase
        .from("restaurants")
        .insert({ owner_id: userId, name: "Cravo Good Food", currency: "INR", country: "India" })
        .select("id, name")
        .single();
      if (createErr) throw createErr;
      return created;
    },
    enabled: !!userId,
  });
}

export function MenuPage() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  // Queries
  const { data: restaurant, isLoading: isRestaurantLoading } = useRestaurantId(user?.id);
  const restaurantId = restaurant?.id;

  const { data: dbCategories, isLoading: isCategoriesLoading, error: dbCategoriesError } = useQuery({
    queryKey: ["menu_categories", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    retry: false,
  });

  const { data: dbItems, isLoading: isItemsLoading, error: dbItemsError } = useQuery({
    queryKey: ["menu_items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    retry: false,
  });

  // Check if table is missing or doesn't exist
  const isFallbackMode = useMemo(() => {
    if (dbCategoriesError) {
      const msg = dbCategoriesError.message || "";
      return dbCategoriesError.code === "PGRST205" || msg.includes("does not exist");
    }
    if (dbItemsError) {
      const msg = dbItemsError.message || "";
      return dbItemsError.code === "PGRST205" || msg.includes("does not exist");
    }
    return false;
  }, [dbCategoriesError, dbItemsError]);

  // Fallback states
  const [localCategories, setLocalCategories] = useState([]);
  const [localItems, setLocalItems] = useState([]);

  // Load from local storage
  useEffect(() => {
    if (isFallbackMode) {
      const storedCats = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      const storedItems = localStorage.getItem(ITEMS_STORAGE_KEY);

      if (storedCats && storedItems) {
        try {
          setLocalCategories(JSON.parse(storedCats));
          setLocalItems(JSON.parse(storedItems));
        } catch (e) {
          setLocalCategories(DEFAULT_CATEGORIES);
          setLocalItems(DEFAULT_ITEMS);
        }
      } else {
        setLocalCategories(DEFAULT_CATEGORIES);
        setLocalItems(DEFAULT_ITEMS);
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
      }
    }
  }, [isFallbackMode]);

  const saveLocalCategories = (newCats) => {
    setLocalCategories(newCats);
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCats));
  };

  const saveLocalItems = (newItems) => {
    setLocalItems(newItems);
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(newItems));
  };

  // Unified lists
  const categories = useMemo(() => {
    if (isFallbackMode) return localCategories;
    return dbCategories || [];
  }, [isFallbackMode, localCategories, dbCategories]);

  const items = useMemo(() => {
    if (isFallbackMode) return localItems;
    return dbItems || [];
  }, [isFallbackMode, localItems, dbItems]);

  // Filters & State
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Forms
  const [catName, setCatName] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(1);
  const [itemName, setItemName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemType, setItemType] = useState("veg");
  const [itemDesc, setItemDesc] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);

  // Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async (catData) => {
      if (isFallbackMode) {
        if (catData.id) {
          const updated = localCategories.map((c) => (c.id === catData.id ? { ...c, ...catData } : c));
          saveLocalCategories(updated);
        } else {
          const newCat = { ...catData, id: "c-" + Date.now() };
          saveLocalCategories([...localCategories, newCat]);
        }
        return;
      }

      if (catData.id) {
        const { error } = await supabase
          .from("menu_categories")
          .update({
            name: catData.name,
            sort_order: catData.sort_order,
          })
          .eq("id", catData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menu_categories")
          .insert({
            name: catData.name,
            sort_order: catData.sort_order,
            restaurant_id: restaurantId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCategory ? "Category updated successfully" : "Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu_categories", restaurantId] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatName("");
      setCatSortOrder(1);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (catId) => {
      if (isFallbackMode) {
        const updatedCats = localCategories.filter((c) => c.id !== catId);
        const updatedItems = localItems.filter((i) => i.category_id !== catId);
        saveLocalCategories(updatedCats);
        saveLocalItems(updatedItems);
        return;
      }
      const { error } = await supabase.from("menu_categories").delete().eq("id", catId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["menu_categories", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["menu_items", restaurantId] });
      if (selectedCategoryId === editingCategory?.id) {
        setSelectedCategoryId("all");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Item Mutation
  const saveItemMutation = useMutation({
    mutationFn: async (itemData) => {
      if (isFallbackMode) {
        if (itemData.id) {
          const updated = localItems.map((i) => (i.id === itemData.id ? { ...i, ...itemData } : i));
          saveLocalItems(updated);
        } else {
          const newItem = { ...itemData, id: "i-" + Date.now() };
          saveLocalItems([...localItems, newItem]);
        }
        return;
      }

      if (itemData.id) {
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: itemData.name,
            category_id: itemData.category_id || null,
            price: parseFloat(itemData.price),
            item_type: itemData.item_type,
            description: itemData.description,
            is_available: itemData.is_available,
          })
          .eq("id", itemData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("menu_items")
          .insert({
            name: itemData.name,
            category_id: itemData.category_id || null,
            price: parseFloat(itemData.price),
            item_type: itemData.item_type,
            description: itemData.description,
            is_available: itemData.is_available,
            restaurant_id: restaurantId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Item updated successfully" : "Item created successfully");
      queryClient.invalidateQueries({ queryKey: ["menu_items", restaurantId] });
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemName("");
      setItemCategoryId("");
      setItemPrice("");
      setItemType("veg");
      setItemDesc("");
      setItemAvailable(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ itemId, is_available }) => {
      if (isFallbackMode) {
        const updated = localItems.map((i) => (i.id === itemId ? { ...i, is_available } : i));
        saveLocalItems(updated);
        return;
      }
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu_items", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId) => {
      if (isFallbackMode) {
        const updated = localItems.filter((i) => i.id !== itemId);
        saveLocalItems(updated);
        return;
      }
      const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["menu_items", restaurantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Open modals helper
  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatSortOrder(cat.sort_order);
    } else {
      setEditingCategory(null);
      setCatName("");
      setCatSortOrder(categories.length + 1);
    }
    setIsCategoryModalOpen(true);
  };

  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategoryId(item.category_id || "");
      setItemPrice(item.price.toString());
      setItemType(item.item_type);
      setItemDesc(item.description || "");
      setItemAvailable(item.is_available);
    } else {
      setEditingItem(null);
      setItemName("");
      setItemCategoryId(selectedCategoryId !== "all" ? selectedCategoryId : (categories[0]?.id || ""));
      setItemPrice("");
      setItemType("veg");
      setItemDesc("");
      setItemAvailable(true);
    }
    setIsItemModalOpen(true);
  };

  // Submit handlers
  const handleCategorySubmit = (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }
    saveCategoryMutation.mutate({
      id: editingCategory?.id,
      name: catName,
      sort_order: parseInt(catSortOrder) || 1,
    });
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!itemPrice || isNaN(itemPrice) || parseFloat(itemPrice) < 0) {
      toast.error("Valid item price is required");
      return;
    }
    saveItemMutation.mutate({
      id: editingItem?.id,
      name: itemName,
      category_id: itemCategoryId || null,
      price: parseFloat(itemPrice),
      item_type: itemType,
      description: itemDesc,
      is_available: itemAvailable,
    });
  };

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const catId = item.category_id || "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = selectedCategoryId === "all" || item.category_id === selectedCategoryId;
      const matchType = typeFilter === "all" || item.item_type === typeFilter;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchType && matchSearch;
    });
  }, [items, selectedCategoryId, typeFilter, searchQuery]);

  const activeCategoryName = useMemo(() => {
    if (selectedCategoryId === "all") return "All Categories";
    const found = categories.find((c) => c.id === selectedCategoryId);
    return found ? found.name : "Uncategorized";
  }, [categories, selectedCategoryId]);

  const vegBadge = (type) => {
    const isVeg = type === "veg";
    const isEgg = type === "egg";
    const colorClass = isVeg 
      ? "border-green-600 bg-green-50 text-green-700" 
      : isEgg 
        ? "border-yellow-600 bg-yellow-50 text-yellow-700" 
        : "border-red-600 bg-red-50 text-red-700";
    
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : isEgg ? 'bg-yellow-600' : 'bg-red-600'}`}></span>
        {type}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 via-red-50 to-orange-100 p-6 rounded-2xl border border-orange-200/50 shadow-sm relative overflow-hidden">
        {/* Subtle decorative shapes */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"></div>
        <div className="absolute left-1/3 -bottom-8 w-24 h-24 bg-red-200/20 rounded-full blur-xl"></div>
        
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Menu Manager</h1>
            {isFallbackMode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <Database className="h-3 w-3" /> DEMO MODE
              </Badge>
            )}
          </div>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Configure your digital menu, organize products by category, update pricing, and toggle item availability instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10">
          <Button 
            onClick={() => handleOpenCategoryModal()} 
            variant="outline" 
            className="border-orange-200 hover:bg-orange-50 text-orange-700 font-semibold gap-1.5 rounded-xl transition-all duration-200 shadow-sm"
          >
            <FolderPlus className="h-4 w-4" /> Add Category
          </Button>
          <Button 
            onClick={() => handleOpenItemModal()} 
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold gap-1.5 rounded-xl shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all duration-200 border-none"
          >
            <Plus className="h-4 w-4" /> Add Menu Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Categories Panel */}
        <Card className="lg:col-span-1 border-slate-100 shadow-sm rounded-2xl overflow-hidden self-start">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              <span>Categories</span>
              <span>Items</span>
            </div>

            <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 group ${
                  selectedCategoryId === "all"
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Utensils className={`h-4 w-4 ${selectedCategoryId === 'all' ? 'text-white' : 'text-slate-400'}`} />
                  All Items
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0.5 rounded-full ${selectedCategoryId === 'all' ? 'bg-orange-600/30 text-white border-none' : 'bg-slate-100 text-slate-600'}`}
                >
                  {items.length}
                </Badge>
              </button>

              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const isSelected = selectedCategoryId === cat.id;

                return (
                  <div key={cat.id} className="relative group/cat flex items-center w-full">
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex-grow flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 pr-20 min-w-0 gap-2 ${
                        isSelected
                          ? "bg-orange-50 text-orange-700 border-l-4 border-orange-500 rounded-l-none"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {count}
                      </Badge>
                    </button>

                    <div className="absolute right-2 opacity-0 group-hover/cat:opacity-100 flex items-center gap-1 transition-opacity duration-200 bg-transparent pl-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-orange-600 hover:bg-slate-100 rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCategoryModal(cat);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete category "${cat.name}"? All items under it will become uncategorized.`)) {
                            deleteCategoryMutation.mutate(cat.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Menu Items list */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Controls / Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <Input
                placeholder="Search food items..."
                className="pl-10 pr-4 py-2.5 h-10 border-slate-200 hover:border-slate-300 focus-visible:ring-orange-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Type Filter Buttons */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-700">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'all' ? 'bg-white shadow text-slate-900 font-semibold' : 'hover:text-slate-900'}`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setTypeFilter("veg")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'veg' ? 'bg-white shadow text-green-700 font-semibold' : 'hover:text-green-700'}`}
                >
                  Veg
                </button>
                <button
                  onClick={() => setTypeFilter("non-veg")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'non-veg' ? 'bg-white shadow text-red-700 font-semibold' : 'hover:text-red-700'}`}
                >
                  Non-Veg
                </button>
                <button
                  onClick={() => setTypeFilter("egg")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${typeFilter === 'egg' ? 'bg-white shadow text-yellow-700 font-semibold' : 'hover:text-yellow-755'}`}
                >
                  Egg
                </button>
              </div>

              {/* View switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 rounded-lg ${viewMode === 'list' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4.5 w-4.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table Header/Legend if List view */}
          {viewMode === "list" && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-6 py-3 hidden md:grid md:grid-cols-12 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-5">Item details</div>
              <div className="col-span-2 text-center">Category</div>
              <div className="col-span-2 text-center">Price (INR)</div>
              <div className="col-span-2 text-center">Available</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
          )}

          {/* Items List container */}
          {filteredItems.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 py-12 text-center">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <AlertCircle className="h-10 w-10 text-slate-300" />
                <h3 className="font-semibold text-slate-700 text-lg">No Items Found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  We couldn't find any menu items matching your search or filters. Try choosing a different category or clearing the search.
                </p>
                <Button 
                  onClick={() => {
                    setSelectedCategoryId("all");
                    setTypeFilter("all");
                    setSearchQuery("");
                  }} 
                  variant="link" 
                  className="text-orange-600 font-semibold"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <div className="flex flex-col gap-2">
              {filteredItems.map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                return (
                  <Card 
                    key={item.id} 
                    className={`border-slate-100 hover:border-slate-200/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md hover:translate-y-[-1px] transition-all duration-200 ${
                      !item.is_available ? "opacity-60 bg-slate-50/50" : ""
                    }`}
                  >
                    <CardContent className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                      {/* Name/Type & Desc */}
                      <div className="col-span-1 md:col-span-5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {vegBadge(item.item_type)}
                          <span className="font-bold text-slate-800 text-base">{item.name}</span>
                        </div>
                        {item.description && (
                          <span className="text-xs text-slate-500 line-clamp-1">{item.description}</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="col-span-1 md:col-span-2 md:text-center flex md:block items-center justify-between text-sm text-slate-600">
                        <span className="md:hidden font-medium text-slate-400">Category: </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {cat ? cat.name : "Uncategorized"}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="col-span-1 md:col-span-2 md:text-center flex md:block items-center justify-between font-bold text-slate-800">
                        <span className="md:hidden font-medium text-slate-400">Price: </span>
                        <span>₹{item.price}</span>
                      </div>

                      {/* Availability Switch */}
                      <div className="col-span-1 md:col-span-2 flex md:justify-center items-center justify-between">
                        <span className="md:hidden font-medium text-slate-400">Available: </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={(checked) => 
                              toggleAvailabilityMutation.mutate({ itemId: item.id, is_available: checked })
                            }
                            className="data-[state=checked]:bg-green-500"
                          />
                          <span className={`text-xs font-semibold ${item.is_available ? 'text-green-600' : 'text-slate-400'}`}>
                            {item.is_available ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 md:col-span-1 flex justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8.5 w-8.5 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-lg"
                          onClick={() => handleOpenItemModal(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8.5 w-8.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete menu item "${item.name}"?`)) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                return (
                  <Card 
                    key={item.id} 
                    className={`border-slate-100 hover:border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                      !item.is_available ? "opacity-60 bg-slate-50/50" : ""
                    }`}
                  >
                    <CardContent className="p-5 flex flex-col gap-4 flex-grow">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {vegBadge(item.item_type)}
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                              {cat ? cat.name : "Uncategorized"}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base leading-tight mt-1">{item.name}</h3>
                        </div>
                        <span className="font-extrabold text-orange-600 text-lg">₹{item.price}</span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed flex-grow">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={(checked) => 
                              toggleAvailabilityMutation.mutate({ itemId: item.id, is_available: checked })
                            }
                            className="data-[state=checked]:bg-green-500"
                          />
                          <span className={`text-xs font-semibold ${item.is_available ? 'text-green-600' : 'text-slate-400'}`}>
                            {item.is_available ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-lg"
                            onClick={() => handleOpenItemModal(item)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete menu item "${item.name}"?`)) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCategorySubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription>
                Group your food items together under a header category.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="catName" className="font-semibold text-slate-700 text-sm">Category Name</Label>
                <Input
                  id="catName"
                  placeholder="e.g. Burgers, Shakes, Pizzas"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="catSortOrder" className="font-semibold text-slate-700 text-sm">Sort Order / Index</Label>
                <Input
                  id="catSortOrder"
                  type="number"
                  placeholder="e.g. 1"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-xl border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                disabled={saveCategoryMutation.isPending}
              >
                {saveCategoryMutation.isPending ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <form onSubmit={handleItemSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </DialogTitle>
              <DialogDescription>
                Define the name, category, price, type, and availability of your product.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="flex flex-col gap-2">
                <Label htmlFor="itemName" className="font-semibold text-slate-700 text-sm">Item Name</Label>
                <Input
                  id="itemName"
                  placeholder="e.g. Mushroom Swiss Burger"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="itemCategory" className="font-semibold text-slate-700 text-sm">Category</Label>
                  <Select 
                    value={itemCategoryId} 
                    onValueChange={setItemCategoryId}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 focus:ring-orange-500">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="itemPrice" className="font-semibold text-slate-700 text-sm">Price (INR)</Label>
                  <Input
                    id="itemPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 149"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="itemType" className="font-semibold text-slate-700 text-sm">Food Type</Label>
                  <Select 
                    value={itemType} 
                    onValueChange={setItemType}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 focus:ring-orange-500">
                      <SelectValue placeholder="Select Food Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                      <SelectItem value="egg">Egg-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <Switch
                    id="itemAvailable"
                    checked={itemAvailable}
                    onCheckedChange={setItemAvailable}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor="itemAvailable" className="font-semibold text-slate-700 text-sm cursor-pointer">
                    Available in stock
                  </Label>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="itemDesc" className="font-semibold text-slate-700 text-sm">Description (Optional)</Label>
                <textarea
                  id="itemDesc"
                  rows="3"
                  placeholder="Explain flavor profiles, ingredients, allergens..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsItemModalOpen(false)}
                className="rounded-xl border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                disabled={saveItemMutation.isPending}
              >
                {saveItemMutation.isPending ? "Saving..." : "Save Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
