import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { api, internal } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

/**
 * Clerk Webhook Handler
 *
 * Listens for Clerk user events and syncs them to Convex.
 *
 * Events handled:
 *   user.created  → create user profile in Convex
 *   user.updated  → sync name / imageUrl changes
 *   user.deleted  → remove user profile from Convex
 *
 * Setup in Clerk Dashboard:
 *   Webhooks → Add endpoint → https://yourapp.com/api/webhooks/clerk
 *   Events: user.created, user.updated, user.deleted
 *   Copy Signing Secret → CLERK_WEBHOOK_SECRET in .env.local
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });
  }

  // Verify the webhook signature using svix
  const headerPayload  = await headers();
  const svix_id        = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body    = JSON.stringify(payload);
  const wh      = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid webhook signature', { status: 400 });
  }

  // ── Handle events ──────────────────────────────────────────
  const { type, data } = event;

  if (type === 'user.created') {
    const email   = data.email_addresses?.[0]?.email_address || '';
    const name    = `${data.first_name || ''} ${data.last_name || ''}`.trim() || email;
    const imageUrl = data.image_url || '';

    await convex.mutation(internal.users.createFromClerk, {
      clerkId:  data.id,
      email,
      name,
      imageUrl,
    });
  }

  if (type === 'user.updated') {
    const email    = data.email_addresses?.[0]?.email_address || '';
    const name     = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    const imageUrl = data.image_url || '';

    await convex.mutation(internal.users.syncFromClerk, {
      clerkId: data.id,
      name:    name || undefined,
      email:   email || undefined,
      imageUrl: imageUrl || undefined,
    });
  }

  if (type === 'user.deleted') {
    if (data.id) {
      await convex.mutation(internal.users.deleteByClerkId, {
        clerkId: data.id,
      });
    }
  }

  return new Response('OK', { status: 200 });
}
