import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(p => p.branch === branch) : all;
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
