import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    
    const resolved = [];
    for (const p of all) {
      let jobId = p.jobId;
      let jobNumber = p.jobNumber;
      let invoiceCancelled = false;
      if (p.invoiceId) {
        try {
          const inv = await ctx.db.get(p.invoiceId);
          if (inv) {
            jobId = inv.jobId;
            jobNumber = inv.jobNumber;
            if (inv.status === "cancelled") {
              invoiceCancelled = true;
            }
          }
        } catch (_) {}
      }
      resolved.push({
        ...p,
        id: p._id,
        jobId,
        jobNumber,
        invoiceCancelled,
      });
    }
    
    return branch ? resolved.filter(p => p.branch === branch) : resolved;
  },
});

export const create = mutation({
  args: {
    tenantId:      v.id("tenants"),
    receiptNumber: v.string(),
    invoiceId:     v.optional(v.id("invoices")),
    invoiceNumber: v.optional(v.string()),
    jobId:         v.optional(v.id("jobs")),
    jobNumber:     v.optional(v.string()),
    customer:      v.string(),
    branch:        v.string(),
    amount:        v.number(),
    method:        v.string(),
    reference:     v.optional(v.string()),
    date:          v.string(),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", args);
  },
});

// ── Get all subscription payments (admin only) ──────────────────────────────
export const getSubscriptionPayments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", clerkId))
      .unique();
    if (!user || user.email !== "cesaragabonthird@gmail.com") {
      throw new Error("Unauthorized access");
    }
    const all = await ctx.db.query("payments").collect();
    return all.filter(p => p.branch === "—" || p.receiptNumber.startsWith("REC-SUB-"));
  },
});
