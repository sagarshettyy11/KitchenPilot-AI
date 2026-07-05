# KitchenPilot — The AI Operating System for Modern Restaurants

KitchenPilot is a premium, AI-powered operating system designed to run modern restaurant operations in one unified interface. It replaces disjointed POS, inventory, CRM, and kitchen display systems with a single platform powered by real-time analytics and an AI services copilot.

---

## 🚀 Key Modules

KitchenPilot is structured into key operational modules:

- **Lightning-Fast POS**: Quick bill-ringups (card, cash, UPI, splits), working offline-first.
- **Kitchen Display System (KDS)**: Real-time ticket queues, prep timers, and station-level service alerts.
- **Smart Inventory & Recipe Costing**: Expire date tracking, automated recipe costing, and AI reordering.
- **CRM & Guests Hub**: Manage customer profiles, loyalty programs, and purchase history.
- **Finance & Accounting**: GST compliance, invoice matching, expense logs, and profit payouts.
- **Reports & Live Analytics**: Real-time dashboard with service KPIs (occupancy, waste, revenue).
- **AI Assistant**: Plain English queries (e.g., *"What is my predicted ingredient waste for dinner service?"*) to query restaurant telemetry instantly.
- **Platform Integrations**: Sync online aggregators (Swiggy, Zomato, ONDC) straight to your KDS.

---

## 🛠️ Technology Stack

- **Frontend**: [React (v19)](https://react.dev/) + [Vite](https://vite.dev/)
- **Routing**: [React Router DOM (v6)](https://reactrouter.com/)
- **Query Management**: [TanStack React Query (v5)](https://tanstack.com/query)
- **Styling**: [Tailwind CSS (v4)](https://tailwindcss.com/) + [Radix UI primitives](https://www.radix-ui.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (Auth, Database, Row Level Security)
- **Component Styling**: [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Project Structure

```text
KitchenPilot AI/
├── public/                 # Static assets (favicons, icons)
├── src/
│   ├── assets/             # Project assets (images, logos)
│   ├── components/
│   │   ├── dashboard/      # Layout components for the dashboard shell
│   │   ├── site/           # General public website components (Navbar, Footer, Logo)
│   │   └── ui/             # Radix + Shadcn UI base components
│   ├── hooks/              # Custom React hooks
│   ├── integrations/
│   │   ├── lovable/        # Lovable Cloud Auth utilities
│   │   └── supabase/       # Supabase Client and Database types
│   ├── layouts/            # Page layouts (AuthenticatedLayout, etc.)
│   ├── lib/                # Utility modules (currency formatters, role helpers)
│   ├── pages/              # Page components (Auth, Dashboard, Landing, Integrations)
│   ├── styles.css          # Tailwind CSS style imports
│   ├── App.jsx             # Main router and shell layout
│   └── main.jsx            # Application entry point
├── supabase/               # Supabase database configurations & migration scripts
├── eslint.config.js        # ESLint linter settings
├── jsconfig.json           # IDE paths configuration for @/* imports
├── package.json            # Manifest file for scripts and dependencies
└── vite.config.js          # Vite compilation configurations
```

---

## 💻 Local Development Setup

Follow these steps to run the project locally on your machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd "KitchenPilot AI"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Ensure you have a `.env` file in the root containing your Supabase keys:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
   ```

### Execution Commands

- **Start local development server**:
  ```bash
  npm run dev
  ```
  *(Runs the local dev server on `http://localhost:8080/`)*

- **Build production package**:
  ```bash
  npm run build
  ```
  *(Compiles source files into a optimized production bundle inside the `dist/` directory)*

- **Lint checking**:
  ```bash
  npm run lint
  ```
  *(Runs ESLint code validation checks)*

- **Code formatting**:
  ```bash
  npm run format
  ```
  *(Formats files using Prettier)*
