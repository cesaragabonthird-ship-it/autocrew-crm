# AutoCrew CRM — Clerk Integration Guide

Replaces Firebase Authentication with Clerk.
Supports email/password + Google login out of the box.

---

## What changes

| Before (Firebase) | After (Clerk) |
|---|---|
| `lib/firebase.js` | Removed |
| `components/AuthProvider.js` | Clerk shim (backwards compatible) |
| `components/AuthGuard.js` | Uses Clerk `useAuth()` |
| `app/page.js` (custom login form) | Clerk `<SignIn/>` component |
| `app/signup/page.js` (custom form) | Clerk `<SignUp/>` component |
| `lib/UserContext.js` | Uses Clerk `clerkId` |
| Manual Google OAuth setup | ✅ One click in Clerk dashboard |
| `users` table keyed by Firebase `uid` | Keyed by Clerk `clerkId` |

---

## Step 1 — Create Clerk account and app

1. Go to [clerk.com](https://clerk.com) → Sign up free
2. Create application → name it **AutoCrew**
3. Enable sign-in methods:
   - ✅ Email + Password
   - ✅ Google (one click — no OAuth setup needed)
   - ✅ (optional) Facebook, Apple, etc.
4. Go to **API Keys** → copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## Step 2 — Install dependencies

```bash
npm install @clerk/nextjs svix
npm uninstall firebase   # no longer needed
```

---

## Step 3 — Copy the new files

Copy everything from this zip into your project:

```
app/layout.js                          ← replace existing
app/page.js                            ← replace existing
app/sign-in/[[...sign-in]]/page.js     ← new (replaces custom login form)
app/sign-up/[[...sign-up]]/page.js     ← new (replaces custom signup form)
app/onboarding/page.js                 ← new (replaces 3-step signup)
app/api/webhooks/clerk/route.ts        ← new (Clerk → Convex sync)
components/AuthProvider.js             ← replace existing
components/AuthGuard.js                ← replace existing
components/ConvexClientProvider.js     ← replace existing
lib/UserContext.js                     ← replace existing
convex/schema.ts                       ← replace existing (clerkId changes)
convex/users.ts                        ← replace existing (clerkId functions)
middleware.ts                          ← new (route protection)
.env.example                           ← update your .env.local
package.json                           ← update dependencies
```

---

## Step 4 — Update .env.local

```env
# ADD these:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
CLERK_WEBHOOK_SECRET=whsec_...   (set up in Step 5)

# KEEP these:
NEXT_PUBLIC_CONVEX_URL=...
RESEND_API_KEY=...
NEXT_PUBLIC_ADMIN_EMAIL=...
NEXT_PUBLIC_GCASH_NUMBER=...
# ... all payment/support details

# REMOVE these (no longer needed):
# NEXT_PUBLIC_FIREBASE_API_KEY=
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
# NEXT_PUBLIC_FIREBASE_APP_ID=
# NEXT_PUBLIC_APPS_SCRIPT_URL=
```

---

## Step 5 — Set up Clerk Webhook

This keeps your Convex user profiles in sync with Clerk automatically.

1. Clerk Dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://yourapp.vercel.app/api/webhooks/clerk`
3. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
4. Copy the **Signing Secret** → add to `.env.local` as `CLERK_WEBHOOK_SECRET`
5. Also add to Convex environment:
   ```bash
   npx convex env set CLERK_WEBHOOK_SECRET whsec_xxxx
   ```

---

## Step 6 — Update Convex schema

The `users` table now uses `clerkId` instead of Firebase `uid`.

```bash
npx convex deploy
```

This deploys the updated schema + new user functions automatically.

---

## Step 7 — Enable Google login in Clerk

1. Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Toggle on **Google** ✅
3. That's it — no Google Cloud Console setup needed for development
4. For production: follow Clerk's guide to add your own Google OAuth credentials

---

## Step 8 — Update page imports

Pages that used `useAuth` from Firebase now use Clerk's version.

The `AuthProvider.js` shim keeps backwards compatibility, but for any
page that explicitly imports from firebase, update it:

```js
// REMOVE this line in any page that has it:
import { auth } from '@/lib/firebase';

// The AuthProvider shim handles useAuth() automatically
```

Also update the `lib/convex-api.js` to use `clerkId` instead of `uid`:

```js
// In convex-api.js, change:
const getTenantId = () => localStorage.getItem('autocrew_tenantId');

// This is already correct — no change needed since UserContext
// still stores tenantId in localStorage the same way.
```

---

## How login now works

```
User visits /sign-in
        ↓
Clerk shows branded login form
(email/password OR "Continue with Google" button)
        ↓
User signs in with Google (one click!)
        ↓
Clerk fires user.created webhook
        ↓
Webhook creates user profile in Convex
        ↓
User redirected to /onboarding (first time)
or /dashboard (returning user)
        ↓
UserContext loads profile from Convex in real-time
```

---

## User flow for new signups

```
/sign-up → Clerk handles account creation
        ↓
Clerk webhook fires → user profile created in Convex
        ↓
Redirect to /onboarding
        ↓
User picks plan + enters shop name + phone
        ↓
Convex creates tenant + links user as super_admin
        ↓
Redirect to /dashboard
```

---

## User flow for returning users

```
/sign-in → Clerk handles auth
        ↓
Redirect to /dashboard
        ↓
UserContext loads profile from Convex
        ↓
If installer → redirect to /installer
If staff → redirect to /staff
If admin/manager/sales → stay on /dashboard
```

---

## Role-based routing

Add this to `app/dashboard/layout.js` to handle installer/staff redirects:

```js
// In the DashboardLayout component:
const { profile } = useUser();
const router = useRouter();

useEffect(() => {
  if (!profile) return;
  if (profile.role === 'installer') router.replace('/installer');
  if (profile.role === 'staff')     router.replace('/staff');
}, [profile?.role]);
```

---

## Summary — what you touch

| Action | File | Effort |
|---|---|---|
| Copy files | 15 files from this zip | 2 min |
| Update .env.local | Add Clerk keys, remove Firebase keys | 2 min |
| npm install | `@clerk/nextjs svix` | 1 min |
| npm uninstall | `firebase` | 30 sec |
| Clerk Dashboard | Enable Google, set up webhook | 5 min |
| npx convex deploy | Push updated schema | 2 min |
| **Total** | | **~15 minutes** |

---

## Clerk free tier limits

| Feature | Free |
|---|---|
| Monthly active users | 10,000 |
| Social connections (Google etc.) | Unlimited |
| Webhook events | Unlimited |
| Custom domain | ✅ |
| Multi-session | ✅ |

More than enough to scale to hundreds of shops.
