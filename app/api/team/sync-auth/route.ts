import { createClerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, email, clerkId } = await req.json();

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    if (action === 'invite') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Missing email' }, { status: 400 });
      }

      // Check current origin header to format the signup link dynamically
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const redirectUrl = `${origin}/sign-up`;

      // Create an invitation in Clerk (sends an invitation email automatically)
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: redirectUrl,
        ignoreExisting: true,
      });

      return NextResponse.json({ success: true, invitationId: invitation.id });
    }

    if (action === 'delete') {
      if (!clerkId) {
        return NextResponse.json({ success: false, error: 'Missing clerkId' }, { status: 400 });
      }

      // Delete the user from Clerk
      await clerk.users.deleteUser(clerkId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Clerk sync-auth error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to sync authentication.' }, { status: 500 });
  }
}
