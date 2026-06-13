# AutoCrew CRM — Google Sheets → Convex Migration Guide

Complete step-by-step guide. No UI files need to change.

---

## What you're replacing

| Before | After |
|--------|-------|
| Google Sheets (database) | Convex Database |
| Apps Script (API)        | Convex Functions |
| `lib/api.js`             | `lib/convex-api.js` |
| `lib/UserContext.js`     | New UserContext (Convex) |
| `scripts/Code.gs`        | `convex/` folder |
| Apps Script daily trigger | Convex cron (automatic) |

---

## Step 1 — Install Convex

```bash
cd your-autocrew-project
npm install convex
npx convex dev
```

This will:
- Ask you to log in to Convex (free account at convex.dev)
- Create your project
- Generate `convex/_generated/` files automatically
- Add `NEXT_PUBLIC_CONVEX_URL` to your `.env.local`

---

## Step 2 — Copy the Convex files

Copy the entire `convex/` folder from this zip into your project root:

```
your-project/
├── convex/              ← copy this entire folder
│   ├── schema.ts
│   ├── tenants.ts
│   ├── users.ts
│   ├── branches.ts
│   ├── products.ts
│   ├── jobs.ts
│   ├── customers.ts
│   ├── quotes.ts
│   ├── invoices.ts
│   ├── payments.ts
│   ├── purchaseOrders.ts
│   ├── deliveries.ts
│   ├── payroll.ts
│   ├── reports.ts
│   ├── crons.ts
│   └── reminders.ts
```

---

## Step 3 — Replace the API files

Copy these 2 files from `lib/` into your project's `lib/` folder:

```bash
# Replace your existing versions with:
lib/convex-api.js     ← new file (rename old api.js → api.old.js first)
lib/UserContext.js    ← replace existing file
```

---

## Step 4 — Wrap app with ConvexProvider

Open your `app/layout.js` and add ConvexProvider:

```jsx
// app/layout.js
import './globals.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from '@/components/AuthProvider';
import { UserProvider } from '@/lib/UserContext';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexProvider client={convex}>
          <AuthProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </AuthProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
```

---

## Step 5 — Update imports in page files

In every page file, change the import from `api` to `convex-api`:

```js
// BEFORE (in every page file):
import { productsAPI, jobsAPI } from '@/lib/api';

// AFTER:
import { productsAPI, jobsAPI } from '@/lib/convex-api';
```

**That's the only change needed per page file.**

To do this quickly across all files:

```bash
# Mac/Linux — find and replace in all files
find app/ -name "*.js" -exec sed -i "s|from '@/lib/api'|from '@/lib/convex-api'|g" {} +
```

```powershell
# Windows PowerShell
Get-ChildItem -Path "app" -Recurse -Filter "*.js" |
  ForEach-Object { (Get-Content $_.FullName) -replace "from '@/lib/api'", "from '@/lib/convex-api'" |
  Set-Content $_.FullName }
```

---

## Step 6 — Deploy Convex backend

```bash
npx convex deploy
```

This pushes all your `convex/*.ts` functions to the cloud.
The schema creates all tables automatically — nothing to set up manually.

---

## Step 7 — Set up email for reminders (optional)

The daily reminder cron uses Resend for email (replaces Apps Script GmailApp).

1. Sign up free at [resend.com](https://resend.com)
2. Get your API key
3. Add to Convex environment:

```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxxxx
```

That's it — reminders now fire automatically every day at 8am PHT.
No Apps Script trigger to configure.

---

## Step 8 — Migrate existing data (if any)

If you have existing data in Google Sheets, export and import it:

```bash
# Install migration helper
npm install convex-helpers

# Export from Sheets as JSON (use Google Sheets → Download → JSON)
# Then run the import script:
node scripts/migrate-from-sheets.js
```

Or start fresh — for a new shop, just begin using the app normally.
All tables create themselves on first use.

---

## Step 9 — Remove Apps Script

Once Convex is working:

1. You no longer need `NEXT_PUBLIC_APPS_SCRIPT_URL` in your `.env.local`
2. You can keep the Google Spreadsheet as a backup/export only
3. The Apps Script trigger can be deleted

---

## Environment variables

Update your `.env.local`:

```env
# ── ADD this (from npx convex dev output) ─────────────────────
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# ── KEEP these (Firebase auth stays the same) ─────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# ── KEEP these (shown to clients on billing page) ─────────────
NEXT_PUBLIC_GCASH_NUMBER=...
NEXT_PUBLIC_GCASH_NAME=...
NEXT_PUBLIC_BANK_NAME=...
NEXT_PUBLIC_BANK_ACCT_NO=...
NEXT_PUBLIC_BANK_ACCT_NAME=...
NEXT_PUBLIC_SUPPORT_EMAIL=...
NEXT_PUBLIC_VIBER_NUMBER=...
NEXT_PUBLIC_ADMIN_EMAIL=...

# ── REMOVE this (no longer needed) ────────────────────────────
# NEXT_PUBLIC_APPS_SCRIPT_URL=...   ← delete this line
```

---

## What you get after migration

| Feature | Google Sheets | Convex |
|---|---|---|
| Speed | 1–3 sec/call | 50–200ms |
| Real-time updates | ❌ Manual refresh | ✅ Auto live |
| Concurrent users | ~50 max | Unlimited |
| Scale | 5M cells | Unlimited rows |
| Daily reminders | Manual trigger setup | ✅ Auto cron |
| Type safety | ❌ | ✅ Full TypeScript |
| Offline resilience | ❌ | ✅ |
| Cost (small scale) | Free | Free tier |

---

## Summary — what you touch

| Action | File | Effort |
|--------|------|--------|
| Copy entire folder | `convex/` | 1 min |
| Replace file | `lib/convex-api.js` | 1 min |
| Replace file | `lib/UserContext.js` | 1 min |
| Edit 5 lines | `app/layout.js` | 2 min |
| Find & replace | All page imports | 2 min (one command) |
| Run command | `npx convex deploy` | 5 min |
| Set env var | `.env.local` | 1 min |
| **Total** | | **~15 minutes** |

**No UI files are modified.** The swap is entirely in the backend layer.
