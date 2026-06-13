import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const PLAN_PRICES: Record<string, number> = { starter:999, growth:2499, pro:4999 };

export const runDailyReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active/trial tenants
    const tenants = await ctx.runQuery(internal.reminders.getAllTenantsForReminders, {});
    const log: {email:string,days:number,sent:boolean,error?:string}[] = [];

    for (const tenant of tenants) {
      if (["cancelled","suspended"].includes(tenant.status)) continue;
      if (!tenant.nextBillingDate) continue;

      const daysLeft = Math.ceil((new Date(tenant.nextBillingDate).getTime() - Date.now()) / 864e5);

      // Send reminders at 7, 3, and 1 days before billing
      if ([7, 3, 1].includes(daysLeft)) {
        const price   = PLAN_PRICES[tenant.plan] || 2499;
        const dueDate = new Date(tenant.nextBillingDate).toLocaleDateString("en-PH", { month:"long", day:"numeric", year:"numeric" });
        const subject = daysLeft === 1
          ? `[AutoCrew] ⚡ Subscription renews TOMORROW — ₱${price.toLocaleString()}`
          : `[AutoCrew] Reminder — Due in ${daysLeft} days (₱${price.toLocaleString()})`;
        const body    = `Hi ${tenant.ownerName},\n\nYour AutoCrew subscription renews in ${daysLeft} day${daysLeft!==1?"s":""}.\n\nShop: ${tenant.shopName}\nPlan: ${tenant.plan} — ₱${price.toLocaleString()}/mo\nDue: ${dueDate}\n\nContact support to make payment.\n\n— AutoCrew Team`;

        try {
          // In production, use Resend / SendGrid / Nodemailer via HTTP action
          await ctx.runAction(internal.reminders.sendEmail, { to: tenant.email, subject, body });
          log.push({ email: tenant.email, days: daysLeft, sent: true });
        } catch (err: any) {
          log.push({ email: tenant.email, days: daysLeft, sent: false, error: err.message });
        }
      }

      // Auto-suspend overdue accounts after grace period
      if (daysLeft < -3 && tenant.status === "active") {
        await ctx.runMutation(internal.reminders.suspendOverdue, { tenantId: tenant._id });
      } else if (daysLeft < 0 && daysLeft >= -3 && tenant.status === "active") {
        await ctx.runMutation(internal.reminders.setGrace, { tenantId: tenant._id });
      }
    }

    return { sent: log.filter(l=>l.sent).length, total: log.length };
  },
});

export const getAllTenantsForReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.tenants.getAll, {});
  },
});

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, { to, subject, body }) => {
    // Replace with your email provider (Resend recommended)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) { console.log("No RESEND_API_KEY — email not sent to", to); return; }
    await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from:"AutoCrew <noreply@autocrew.app>", to, subject, text: body }),
    });
  },
});

export const suspendOverdue = internalAction({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    await ctx.runMutation(internal.tenants.suspend, { tenantId });
  },
});

export const setGrace = internalAction({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const graceEnd = new Date(Date.now() + 3 * 864e5).toISOString();
    await ctx.runMutation(internal.tenants.update, { tenantId, status: "grace", graceEndsAt: graceEnd });
  },
});
