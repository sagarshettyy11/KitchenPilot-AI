# KitchenPilot AI — Multi-Tenant Restaurant OS & SuperAdmin Command Center

**KitchenPilot AI** is a multi-tenant cloud operating system designed for restaurants, dark kitchens, cafe chains, and fine-dining hotels. It unifies high-speed POS billing, dynamic tables management, kitchen display systems (KDS), menu catalogs, inventory tracking, customer CRM, business expense logging, and delivery aggregator integrations with Supabase PostgreSQL and real-time data replication.

---

## 🌟 Platform Highlights & Core Capabilities

### 1. 🏢 Executive SuperAdmin Portal (`/admin`)
* **Live Multi-Tenant Command Center**: High-level platform KPIs, live restaurant registries, and tenant subscription monitoring.
* **Feature Provisioning Engine**: Granular toggle switches to enable/disable any of the 11 feature modules per hotel with instant database sync.
* **Tier Presets**: One-click **Starter**, **Pro**, and **Enterprise** provisioning presets.
* **🚀 Instant Hotel Impersonation / Launch**: Direct action to switch context and launch into any hotel tenant's live portal.
* **🪄 One-Click Demo Seeder**: Auto-populates any newly onboarded hotel with starter categories, menu items, and dining tables in Supabase.
* **Global Platform Controls**: Control self-service registration policies, maintenance mode flags, and AI engine parameters in `public.platform_settings`.

---

### 2. 💸 Business Expense Tracker & Master Catalog (`/finance` & `/expenses`)
* **Master Items Catalog (`public.expense_master_items`)**:
  * Pre-configured catalog for Raw Materials, Dairy, Poultry, Packaging, Commercial LPG Cylinders, Utilities, Maintenance, Staff Advances, and Operations.
  * Owners can add, edit, or remove custom items with estimated unit costs and categories.
* **Dynamic Expense Logger with 'Other' Option**:
  * Dropdown selector connected to the master catalog with smart auto-fill.
  * **"✨ + Other (Custom Expense / Reason)"** option to input ad-hoc items on the fly.
  * Captures Amount (₹ INR), Quantity & Unit, Payment Mode (*Cash, UPI, Card, NetBanking, Vendor Credit*), Date, Vendor, and Bill/Invoice numbers.
* **Live Monthly Analytics & Graphs**:
  * Month selector (*Current Month, previous cycles, or All Time*).
  * Monthly KPI summary: Total Burn, Daily Average, Top Expense Category, and Net Financial Balance.
  * **Recharts Visualizations**: Interactive daily spending area gradient chart and category distribution donut/pie chart.
* **📑 Native Excel Export**: One-click export generating auto-formatted `.xlsx` workbooks with styled columns, remarks, and total sum rows.

---

### 3. 🍽️ Restaurant Operations Suite
* **Lightning-Fast POS (`/pos`)**: Fast search, variant selection, split checks, discount management, and multi-mode payment settlement.
* **Interactive Floor Plan & Tables (`/tables`)**: Visual seating layout, status indicators (*Available, Seated, Billed*), and table QR generation.
* **Menu Engineering (`/menu`)**: Dynamic category hierarchies, vegetarian/non-veg tags, pricing, and availability toggles.
* **Kitchen Display System (`/kitchen`)**: Live kitchen order tickets (KOT), course sequencing, prep timers, and audio-visual alerts.
* **Inventory & Stock Management (`/inventory`)**: Stock level tracking, low-stock warnings, and unit conversions.
* **Customer CRM (`/customers`)**: Guest database, VIP loyalty tags, visit frequency, and lifetime spend history.
* **Delivery Hub (`/integrations`)**: Centralized sync for Swiggy, Zomato, ONDC, and Magicpin aggregator feeds.

---

## 🗄️ Database Architecture & Schema Reference

The platform uses **Supabase PostgreSQL** with Row Level Security (RLS) and real-time logical replication.

```
                               ┌──────────────────────────┐
                               │       auth.users         │
                               └────────────┬─────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │ 1:1                   │ 1:N                   │ 1:N
                    ▼                       ▼                       ▼
          ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
          │  public.profiles  │   │ public.user_roles │   │public.restaurants │
          └───────────────────┘   └───────────────────┘   └─────────┬─────────┘
                                                                    │
         ┌──────────────────┬─────────────────┬─────────────────────┼────────────────────┬─────────────────┐
         │ 1:N              │ 1:N             │ 1:N                 │ 1:N                │ 1:N             │ 1:N
         ▼                  ▼                 ▼                     ▼                    ▼                 ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐
│public.menu_items  │ │ public.tables │ │delivery_orders│ │expense_master_item│ │  public.expenses  │ │ integrations  │
└───────────────────┘ └───────────────┘ └───────────────┘ └───────────────────┘ └───────────────────┘ └───────────────┘
```

### Table Specifications

#### 1. `public.restaurants`
Core multi-tenant entity representing individual hotels, restaurants, or cloud kitchen brands.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Unique restaurant identifier |
| `owner_id` | `uuid REFERENCES auth.users` | Supabase user ID of the primary owner |
| `name` | `text NOT NULL` | Restaurant / Hotel trade name |
| `business_type` | `text` | Business format (*Fine Dining, QSR, Cafe, Bar, Cloud Kitchen*) |
| `cuisine` | `text` | Primary cuisine focus (*Multi-Cuisine, Continental, Indian*) |
| `address` | `text` | Physical property address |
| `city` | `text` | Operational city |
| `country` | `text DEFAULT 'India'` | Country code / name |
| `currency` | `text DEFAULT 'INR'` | Base transaction currency |
| `gst_number` | `text` | Tax registration / GSTIN |
| `status` | `text DEFAULT 'active'` | Account status (`active`, `trial`, `suspended`) |
| `plan_tier` | `text DEFAULT 'pro'` | Subscription tier (`starter`, `pro`, `enterprise`, `custom`) |
| `enabled_modules` | `jsonb DEFAULT '[]'` | Array of provisioned module IDs |
| `max_tables` | `integer DEFAULT 40` | Quota limit for dining tables |
| `max_staff` | `integer DEFAULT 20` | Quota limit for staff accounts |
| `contact_email` | `text` | Primary manager/contact email |
| `contact_phone` | `text` | Primary contact phone |
| `created_at` | `timestamptz DEFAULT now()` | Registration timestamp |

---

#### 2. `public.user_roles`
Role-Based Access Control mappings scoping users to roles and specific properties.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Unique role assignment ID |
| `user_id` | `uuid REFERENCES auth.users` | Target user account |
| `restaurant_id` | `uuid REFERENCES restaurants` | Assigned restaurant (`NULL` for SuperAdmin) |
| `role` | `text NOT NULL` | `super_admin`, `owner`, `manager`, `cashier`, `kitchen`, `inventory`, `waiter`, `accountant`, `delivery` |
| `created_at` | `timestamptz DEFAULT now()` | Assignment timestamp |

---

#### 3. `public.expense_master_items`
Catalog of standard operational requirements and recurring supplies configured per restaurant.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Unique master requirement ID |
| `restaurant_id` | `uuid REFERENCES restaurants` | Associated restaurant |
| `name` | `text NOT NULL` | Item name (*e.g. Dairy Milk, Gas Cylinder, Veggies*) |
| `category` | `text NOT NULL` | *Raw Materials, Packaging, Utilities, Maintenance, Staff, Operations* |
| `default_unit` | `text DEFAULT 'units'` | Typical measurement unit (*kg, litres, boxes, cans, cylinders, month*) |
| `default_cost` | `numeric DEFAULT 0` | Standard estimated unit price |
| `description` | `text` | Vendor / brand specifications |
| `created_at` | `timestamptz DEFAULT now()` | Creation timestamp |

---

#### 4. `public.expenses`
Transactional ledger of all business expenses, ingredient purchases, utilities, and vouchers.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Unique expense transaction ID |
| `restaurant_id` | `uuid REFERENCES restaurants` | Associated restaurant |
| `master_item_id` | `uuid REFERENCES expense_master_items` | Linked master item (`NULL` if custom 'Other') |
| `item_name` | `text NOT NULL` | Item description or custom reason |
| `category` | `text NOT NULL` | Expense category |
| `amount` | `numeric NOT NULL` | Transaction total (₹) |
| `quantity` | `numeric DEFAULT 1` | Purchased quantity |
| `unit` | `text DEFAULT 'units'` | Unit of measure |
| `payment_mode` | `text DEFAULT 'cash'` | `cash`, `upi`, `card`, `bank_transfer`, `credit` |
| `expense_date` | `date NOT NULL DEFAULT CURRENT_DATE` | Date of expense |
| `vendor_name` | `text` | Supplier or merchant name |
| `invoice_number` | `text` | Bill / Invoice reference number |
| `remarks` | `text` | Additional notes / explanations |
| `created_by` | `uuid REFERENCES auth.users` | Staff/User who logged the entry |
| `created_at` | `timestamptz DEFAULT now()` | Entry creation timestamp |

---

#### 5. `public.platform_settings`
Global platform-wide runtime configurations and engine parameters.
| Column | Type | Description |
| :--- | :--- | :--- |
| `key` | `text PRIMARY KEY` | Configuration key (*`general`, `modules_default`, `ai_config`*) |
| `value` | `jsonb NOT NULL` | Structured JSON settings |
| `updated_at` | `timestamptz DEFAULT now()` | Last update timestamp |

---

#### 6. `public.admin_audit_logs`
Immutable security and administrative audit trail.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Unique audit record ID |
| `admin_id` | `uuid REFERENCES auth.users` | Performing SuperAdmin |
| `admin_email` | `text` | SuperAdmin email |
| `action` | `text NOT NULL` | Action code (`CREATE_HOTEL`, `UPDATE_PROVISIONING`, `ASSIGN_ROLE`, etc.) |
| `target_type` | `text` | `restaurant`, `user`, `platform` |
| `target_id` | `text` | Target entity identifier |
| `target_name` | `text` | Target entity display name |
| `details` | `jsonb` | State payload diff |
| `created_at` | `timestamptz DEFAULT now()` | Event timestamp |

---

#### 7. `public.tables`
Dining floor plan tables and seating occupancy.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Table ID |
| `restaurant_id` | `uuid REFERENCES restaurants` | Associated restaurant |
| `table_number` | `text NOT NULL` | Table identifier (*e.g. T-1, T-2, Rooftop-4*) |
| `capacity` | `integer DEFAULT 4` | Guest seating capacity |
| `status` | `text DEFAULT 'available'` | `available`, `occupied`, `reserved`, `billed` |
| `qr_code` | `text` | Dine-in digital ordering QR reference |

---

#### 8. `public.menu_categories` & `public.menu_items`
Structured digital menu catalog, categories, pricing, and availability.
* **`menu_categories`**: `id`, `restaurant_id`, `name`, `display_order`, `created_at`
* **`menu_items`**: `id`, `restaurant_id`, `category_id`, `name`, `description`, `price`, `is_veg`, `is_available`, `image_url`, `created_at`

---

#### 9. `public.delivery_orders`
Multi-channel delivery and online aggregator orders.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | Order ID |
| `restaurant_id` | `uuid REFERENCES restaurants` | Associated restaurant |
| `order_number` | `text NOT NULL` | Channel order code (*e.g. SWIGGY-9182*) |
| `provider` | `text` | `swiggy`, `zomato`, `ondc`, `magicpin`, `direct` |
| `status` | `text` | `pending`, `preparing`, `ready`, `delivered`, `cancelled` |
| `total_amount` | `numeric NOT NULL` | Total order value |
| `items` | `jsonb` | Line items payload |
| `placed_at` | `timestamptz DEFAULT now()` | Placement timestamp |

---

## 🔒 Security & Row Level Security (RLS)

All public tables enforce strict PostgreSQL Row Level Security (RLS) policies:

1. **SuperAdmin Privilege**: SuperAdmins (verified via `public.is_super_admin(auth.uid())`) possess full read/write access across all tables.
2. **Tenant Isolation**: Restaurant owners and staff can only access, modify, or query records associated with their assigned `restaurant_id`.
3. **Realtime Replication**: Realtime publications (`supabase_realtime`) are configured on `restaurants`, `user_roles`, `expenses`, `expense_master_items`, and `admin_audit_logs` for live client-side synchronization.

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Module | SuperAdmin | Owner | Manager | Cashier | Kitchen | Inventory | Accountant | Waiter |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SuperAdmin Console** (`/admin`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Dashboard** (`/dashboard`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POS Billing** (`/pos`) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Dine-In Tables** (`/tables`) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Menu Catalog** (`/menu`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Kitchen KDS** (`/kitchen`) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Inventory** (`/inventory`) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Customers CRM** (`/customers`) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Expenses & Finance** (`/finance`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Reports & Analytics** (`/reports`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Delivery Integrations** (`/integrations`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Hotel Settings** (`/settings`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 💻 Tech Stack & Local Setup

* **Frontend**: React 19, Vite, React Router DOM v6, TanStack Query v5
* **Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Shadcn UI
* **Charts & Analytics**: Recharts (Interactive Area, Bar, and Donut Pie charts)
* **Spreadsheet Engine**: SheetJS `xlsx` (native Excel workbook generation)
* **Backend**: Supabase (PostgreSQL, GoTrue Auth, Realtime Replication, Row Level Security)

### Running Locally

1. Clone and install dependencies:
   ```bash
   cd kitchen_pilot
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=https://vviiujgmsoqzrxizkbie.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   *(Access the app at `http://localhost:8080`)*

4. SuperAdmin Portal Credentials:
   * **URL**: `http://localhost:8080/admin/login`
   * **Email**: `admin@kitchenpilot.in`
   * **Password**: `kitchenpilot123`
