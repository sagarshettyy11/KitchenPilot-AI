import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Boxes,
  Users,
  LineChart,
  Settings,
  Sparkles,
  Table,
  Utensils,
  Wallet,
  Plug,
} from "lucide-react";

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen",
  inventory: "Inventory",
  accountant: "Accountant",
  delivery: "Delivery",
};

// Everyone signed in with any role can see dashboard.
const ALL = [
  "super_admin",
  "owner",
  "manager",
  "cashier",
  "waiter",
  "kitchen",
  "inventory",
  "accountant",
  "delivery",
];

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ALL },
  {
    id: "pos",
    label: "POS",
    path: "/pos",
    icon: ShoppingCart,
    roles: ["super_admin", "owner", "manager", "cashier"],
  },
  {
    id: "tables",
    label: "Tables",
    path: "/tables",
    icon: Table,
    roles: ["super_admin", "owner", "manager", "waiter", "cashier"],
  },
  {
    id: "menu",
    label: "Menu",
    path: "/menu",
    icon: Utensils,
    roles: ["super_admin", "owner", "manager", "kitchen", "inventory"],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    path: "/kitchen",
    icon: ChefHat,
    roles: ["super_admin", "owner", "manager", "kitchen"],
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: Boxes,
    roles: ["super_admin", "owner", "manager", "inventory"],
  },
  {
    id: "customers",
    label: "Customers",
    path: "/customers",
    icon: Users,
    roles: ["super_admin", "owner", "manager", "cashier"],
  },
  {
    id: "finance",
    label: "Finance",
    path: "/finance",
    icon: Wallet,
    roles: ["super_admin", "owner", "accountant"],
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: LineChart,
    roles: ["super_admin", "owner", "manager", "accountant"],
  },
  {
    id: "integrations",
    label: "Integrations",
    path: "/integrations",
    icon: Plug,
    roles: ["super_admin", "owner", "manager"],
  },
  {
    id: "ai",
    label: "AI Assistant",
    path: "/ai",
    icon: Sparkles,
    roles: ["super_admin", "owner", "manager"],
    badge: "AI",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["super_admin", "owner", "manager"],
  },
];

export function hasAnyRole(userRoles, allowed) {
  if (userRoles.includes("super_admin")) return true;
  return allowed.some((r) => userRoles.includes(r));
}

export function visibleModules(userRoles) {
  return MODULES.filter((m) => hasAnyRole(userRoles, m.roles));
}

export function moduleByPath(path) {
  return MODULES.find((m) => m.path === path);
}

export function primaryRoleLabel(userRoles) {
  const priority = [
    "super_admin",
    "owner",
    "manager",
    "accountant",
    "kitchen",
    "inventory",
    "cashier",
    "waiter",
    "delivery",
  ];
  for (const r of priority) if (userRoles.includes(r)) return ROLE_LABELS[r];
  return "Member";
}
