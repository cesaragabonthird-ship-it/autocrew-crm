# AutoCrew CRM
### Car Accessories Installer & Seller Management System

Full-stack business management for car accessories shops — inventory, job orders, installer portal, invoicing, multi-branch, and subscription billing.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Auth | Firebase Authentication |
| Database | Google Sheets via Apps Script |
| Hosting | Vercel (free tier) |
| Styling | Tailwind CSS + DM Sans |

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | KPIs, weekly revenue chart, recent jobs, low stock alerts |
| **Inventory** | SKU tracking, stock levels, low-stock alerts, branch transfer |
| **Purchase Orders** | Order from suppliers, receive delivery workflow, partial receipts |
| **Deliveries** | Record arrivals, condition tracking, progress bars |
| **Customers** | Multi-vehicle profiles, job history, search by plate number |
| **Quotations** | Line items, discount, convert to Job Order in one click |
| **Job Orders** | Parts + labor, technician assignment, status pipeline |
| **Invoices** | Partial payments, balance due, tax, mark paid |
| **Payments** | Transaction log, by method breakdown |
| **Reports** | Weekly/monthly revenue, top products, installer performance, branch comparison |
| **Team** | Roles (Super Admin / Branch Manager / Sales / Installer), activate/deactivate |
| **Branches** | Multi-branch config, per-branch stats |
| **Installer Portal** | Dark mobile UI, job checklist, parts confirmation, Start/Complete buttons |
| **Subscription** | 14-day trial, GCash/bank payment, auto reminders at 7/3/1 day |

---

## Roles

| Role | Access |
|---|---|
| **Super Admin** | Everything — all branches, admin panel |
| **Branch Manager** | Their branch only |
| **Sales Staff** | Customers, quotes, jobs, invoices |
| **Installer** | Installer portal only — assigned jobs, mark complete |

---

## Subscription Plans

| Plan | PHP/mo | Branches | Installers | Products |
|---|---|---|---|---|
| Starter | ₱999 | 1 | 3 | 100 |
| Growth | ₱2,499 | 3 | 15 | 500 |
| Pro | ₱4,999 | Unlimited | Unlimited | Unlimited |

Payment: Manual — GCash or Bank Transfer. You collect and activate.

---

## Setup Guide

### 1. Firebase
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project
3. Enable **Email/Password** authentication
4. Project Settings → Your Apps → Add Web App → copy config

### 2. Google Apps Script
1. Create a new Google Spreadsheet at [sheets.google.com](https://sheets.google.com)
2. Extensions → Apps Script
3. Paste `scripts/Code.gs` into the editor
4. **Set Script Properties** (Project Settings → Script Properties):

| Key | Value |
|---|---|
| `ADMIN_EMAIL` | your personal email |
| `GCASH_NUMBER` | your GCash number |
| `GCASH_NAME` | your GCash account name |
| `BANK_NAME` | BDO / BPI / etc |
| `BANK_ACCT` | your account number |
| `BANK_ACCT_NAME` | your account name |

5. Deploy → New Deployment → **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the `/exec` URL

### 3. Daily Reminder Trigger
In Apps Script:
- Triggers → Add trigger
- Function: `runDailyReminders`
- Event: Time-driven → Day timer → 8am–9am

This sends payment reminder emails at 7, 3, and 1 day before billing and auto-suspends overdue accounts.

### 4. Environment Variables
```bash
cp .env.example .env.local
# Fill in all values
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
NEXT_PUBLIC_ADMIN_EMAIL=your@email.com
NEXT_PUBLIC_DEFAULT_BRANCH=Main Branch

NEXT_PUBLIC_GCASH_NUMBER=0917-XXX-XXXX
NEXT_PUBLIC_GCASH_NAME=Your Name
NEXT_PUBLIC_BANK_NAME=BDO
NEXT_PUBLIC_BANK_ACCT_NO=XXXX-XXXX-XXXX
NEXT_PUBLIC_BANK_ACCT_NAME=Your Name
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourshop.com
NEXT_PUBLIC_VIBER_NUMBER=+63 917 XXX XXXX
```

### 5. Run Locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel
```bash
npm i -g vercel
vercel
```
Add all `NEXT_PUBLIC_*` variables in Vercel → Project Settings → Environment Variables.

---

## Project Structure

```
autocrew-crm/
├── app/
│   ├── page.js                    # Login
│   ├── signup/page.js             # 3-step signup
│   ├── billing/page.js            # Client billing page
│   ├── suspended/page.js          # Payment wall
│   │
│   ├── dashboard/                 # Main app (all roles)
│   │   ├── layout.js              # Sidebar + auth guard
│   │   ├── page.js                # Dashboard home
│   │   ├── inventory/             # Products + stock alerts
│   │   ├── purchase-orders/       # POs + receive workflow
│   │   ├── deliveries/            # Delivery records
│   │   ├── customers/             # Customer + vehicle profiles
│   │   ├── quotations/            # Quotes + convert to job
│   │   ├── job-orders/            # Jobs + assign + parts
│   │   ├── invoices/              # Invoicing + payments
│   │   ├── payments/              # Payment log
│   │   ├── reports/               # Sales analytics
│   │   ├── team/                  # Staff management
│   │   ├── branches/              # Branch management
│   │   └── settings/              # Shop settings
│   │
│   └── installer/                 # Installer Portal (dark mobile UI)
│       ├── layout.js              # Mobile header + auth
│       ├── page.js                # My jobs list
│       └── jobs/[id]/page.js      # Job detail + checklist + complete
│
├── components/
│   ├── AuthProvider.js            # Firebase auth context
│   └── AuthGuard.js               # Route protection
│
├── lib/
│   ├── constants.js               # Categories, roles, plans, job types
│   ├── firebase.js                # Firebase init
│   ├── api.js                     # All API calls to Apps Script
│   └── UserContext.js             # User profile + subscription state
│
└── scripts/
    └── Code.gs                    # Complete Google Apps Script backend
```

---

## Subscription Lifecycle

```
Signup → Trial (14 days)
           │
           ├─ Pays before trial ends → Active
           │         │
           │         ├─ Pays each month → stays Active
           │         │
           │         └─ Misses payment → Grace (3 days)
           │                    │
           │                    ├─ Pays → Active
           │                    └─ No pay → Suspended (payment wall)
           │
           └─ Doesn't pay → Trial Ended (payment wall)
```

---

## Your Monthly Admin Workflow

1. **AutoCrew runs `runDailyReminders` every morning** — clients get email at 7, 3, and 1 day before billing
2. **Client sends GCash or bank payment** → screenshots receipt → sends to you
3. **You go to `/admin/clients`** → find client → click **Log Payment** → fill amount + reference → Confirm
4. **Account auto-activates** and billing date advances by 1 month ✅

---

## Installer Portal

Installers log in at the **same URL** (`/`) with their credentials.

The app automatically redirects them to `/installer` (mobile-first dark UI) where they can:
- See only their assigned jobs
- View job details, customer vehicle, special notes
- Tap through the installation checklist step by step
- Confirm parts used
- Tap **Start Job** → **Mark as Complete** with optional notes

Admin/managers see jobs update to `completed` in real time.

---

## Google Sheets Structure (auto-created)

| Sheet | Purpose |
|---|---|
| Tenants | One row per shop subscription |
| Users | All staff logins with roles |
| Products | Inventory with SKU, stock, cost, selling price |
| POs | Purchase orders from suppliers |
| Deliveries | Stock arrival records |
| Customers | Customer + vehicle info |
| Quotes | Pre-job estimates |
| Jobs | Job orders with parts, labor, status |
| Invoices | Invoicing with payment tracking |
| Payments | All transactions |
| Branches | Branch locations and config |
| Team | Staff members with roles |
| Transfers | Stock movement between branches |

---

## Troubleshooting

**Login works but dashboard shows mock data**
→ Apps Script URL not set. Add `NEXT_PUBLIC_APPS_SCRIPT_URL` to `.env.local`.

**"User not found" error**
→ The Firebase user exists but no row in the `Users` sheet. Manually add a row or re-signup.

**Installer gets redirected to dashboard**
→ Their `role` in the Users sheet is not `installer`. Update it.

**Emails not sending in Apps Script**
→ Run `runDailyReminders()` manually once → click Review Permissions → Allow.

**Account not activating after payment**
→ Go to Vercel/local → `/admin/clients` → find the client → Log Payment → Confirm.

**Apps Script "Script function not found"**
→ Make sure `Code.gs` is saved and the correct function name is used.
