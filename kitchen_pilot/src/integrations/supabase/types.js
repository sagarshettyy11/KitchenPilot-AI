export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "owner",
        "manager",
        "cashier",
        "waiter",
        "kitchen",
        "inventory",
        "accountant",
        "delivery",
      ],
      delivery_order_status: [
        "accepted",
        "preparing",
        "ready",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      delivery_provider: [
        "swiggy",
        "zomato",
        "ondc",
        "magicpin",
        "rapido",
        "website",
        "mobile_app",
      ],
      sync_status: ["idle", "syncing", "success", "failed"],
    },
  },
};
