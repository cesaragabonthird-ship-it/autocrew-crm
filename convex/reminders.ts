import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// ── HTML Template Builder ─────────────────────────────────────
function buildReminderHtml(
  ownerName: string,
  shopName: string,
  planName: string,
  daysLeft: number,
  price: number,
  dueDate: string,
  subject: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-top: 4px solid #f97316;" border="0" cellspacing="0" cellpadding="0">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f3f4f6;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <img src="https://autocrew-crm.vercel.app/logo.png" alt="AutoCrew" height="24" style="height: 24px; display: block; border: 0;" />
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; background-color: #f3f4f6; padding: 6px 12px; border-radius: 9999px;">
                            ${planName} Plan
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">Subscription Renewal Notice</h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                      Hi ${ownerName},<br><br>
                      This is a friendly reminder that your AutoCrew subscription for <strong>${shopName}</strong> will renew in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${dueDate}</strong>.
                    </p>

                    <!-- Summary Box -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-bottom: 10px; font-size: 13px; color: #6b7280;">Monthly Cost:</td>
                              <td align="right" style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #111827;">₱${price.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 10px; font-size: 13px; color: #6b7280;">Renewal Date:</td>
                              <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 600; color: #111827;">${dueDate}</td>
                            </tr>
                            <tr>
                              <td style="border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 13px; font-weight: 600; color: #374151;">Total Due:</td>
                              <td align="right" style="border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 16px; font-weight: 800; color: #f97316;">₱${price.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Payment Instructions -->
                    <h2 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">Payment Options</h2>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                      Please send your payment through any of the channels below before the due date. Once completed, reply to this email or send your screenshot to cesaragabonthird@gmail.com.
                    </p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                      <tr>
                        <td width="48%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 4px;">GCash</div>
                          <div style="font-size: 14px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; margin-bottom: 2px;">0906-227-1620</div>
                          <div style="font-size: 11px; color: #0284c7; opacity: 0.8;">Cesar Agabon III</div>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 4px;">Bank Transfer (BPI)</div>
                          <div style="font-size: 14px; font-weight: 800; color: #047857; letter-spacing: 0.05em; margin-bottom: 2px;">2889-2594-29</div>
                          <div style="font-size: 11px; color: #059669; opacity: 0.8;">Cesar Agabon III</div>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="https://autocrew-crm.vercel.app/dashboard/billing" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.2); transition: background-color 0.2s;">
                            Manage Subscription
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #9ca3af;">
                      Questions? Email us at <a href="mailto:support@autocrew.app" style="color: #f97316; text-decoration: none;">support@autocrew.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                      &copy; 2026 AutoCrew. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// ─── Crons Handler ────────────────────────────────────────────
export const runDailyReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.getAll, {});
    const plans: any[] = await ctx.runQuery(api.plans.getList, {});
    const log: { email: string; days: number; sent: boolean; error?: string }[] = [];

    for (const tenant of tenants) {
      if (["cancelled", "suspended"].includes(tenant.status)) continue;
      if (!tenant.nextBillingDate) continue;

      const daysLeft = Math.ceil((new Date(tenant.nextBillingDate).getTime() - Date.now()) / 864e5);

      if ([7, 3, 1].includes(daysLeft)) {
        const plan = plans.find(p => p.id === tenant.plan);
        const price = plan ? plan.priceMonthly : 2499;

        // Skip reminders for free plans (Starter/Free)
        if (price === 0) continue;

        const planName = plan ? plan.name : tenant.plan;
        const dueDate = new Date(tenant.nextBillingDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
        const subject = daysLeft === 1
          ? `[AutoCrew] ⚡ Subscription renews TOMORROW — ₱${price.toLocaleString()}`
          : `[AutoCrew] Reminder — Due in ${daysLeft} days (₱${price.toLocaleString()})`;

        const html = buildReminderHtml(tenant.ownerName, tenant.shopName, planName, daysLeft, price, dueDate, subject);

        try {
          await ctx.runAction(internal.reminders.sendEmail, { to: tenant.email, subject, html });
          log.push({ email: tenant.email, days: daysLeft, sent: true });
        } catch (err: any) {
          log.push({ email: tenant.email, days: daysLeft, sent: false, error: err.message });
        }
      }

      // Auto-suspend overdue accounts after grace period
      if (daysLeft < -3 && tenant.status === "active") {
        await ctx.runMutation(api.tenants.suspend, { tenantId: tenant._id });
      } else if (daysLeft < 0 && daysLeft >= -3 && tenant.status === "active") {
        const graceEnd = new Date(Date.now() + 3 * 864e5).toISOString();
        await ctx.runMutation(api.tenants.update, { tenantId: tenant._id, status: "grace", graceEndsAt: graceEnd });
      }
    }

    return { sent: log.filter(l => l.sent).length, total: log.length };
  },
});

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string() },
  handler: async (ctx, { to, subject, html }) => {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY || RESEND_API_KEY === "re_xxxxxxxxxxxx") {
      throw new Error("RESEND_API_KEY is not configured or is still the default placeholder. Please set a valid Resend API key in your Convex environment variables.");
    }
    
    // For free Resend plans without custom domain verification, send from Resend's default onboarding domain
    const fromDomain = RESEND_API_KEY.startsWith("re_") ? "AutoCrew <onboarding@resend.dev>" : "AutoCrew <noreply@autocrew.app>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromDomain, to, subject, html }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend email delivery failed with status ${res.status}: ${errText}`);
    }
  },
});

// ── Trigger daily reminders check manually (admin action) ───────────
export const triggerDailyReminders = action({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }): Promise<{ sent: number; total: number }> => {
    const user = await ctx.runQuery(api.users.getByClerkId, { clerkId });
    if (!user || user.email !== "cesaragabonthird@gmail.com") {
      throw new Error("Unauthorized access");
    }
    const res: { sent: number; total: number } = await ctx.runAction(internal.reminders.runDailyReminders, {});
    return res;
  },
});

// ── Send a test email containing the custom template instantly ────────
export const testEmail = action({
  args: { to: v.string() },
  handler: async (ctx, { to }) => {
    const subject = `[AutoCrew] Test Reminder — Due in 3 days (₱2,499)`;
    const dueDate = new Date(Date.now() + 3 * 864e5).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
    const html = buildReminderHtml("Codex Test User", "Codex Test Shop", "Growth", 3, 2499, dueDate, subject);
    await ctx.runAction(internal.reminders.sendEmail, { to, subject, html });
    return { success: true };
  },
});
