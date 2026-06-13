import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("quotes").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(q => !q.branch || q.branch === branch) : all;
  },
});

export const create = mutation({
  args: {
    tenantId:    v.id("tenants"),
    quoteNumber: v.string(),
    customerId:  v.optional(v.id("customers")),
    customer:    v.string(),
    phone:       v.optional(v.string()),
    vehicle:     v.optional(v.string()),
    type:        v.optional(v.string()),
    validUntil:  v.optional(v.string()),
    items:       v.array(v.object({ desc:v.string(), qty:v.number(), price:v.number() })),
    discount:    v.number(),
    notes:       v.optional(v.string()),
    branch:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quotes", { ...args, status: "draft" });
  },
});

export const update = mutation({
  args: {
    id:         v.id("quotes"),
    status:     v.optional(v.string()),
    validUntil: v.optional(v.string()),
    items:      v.optional(v.array(v.object({ desc:v.string(), qty:v.number(), price:v.number() }))),
    discount:   v.optional(v.number()),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const convertToJob = mutation({
  args: { id: v.id("quotes"), jobNumber: v.string() },
  handler: async (ctx, { id, jobNumber }) => {
    const quote = await ctx.db.get(id);
    if (!quote) throw new Error("Quote not found");
    const total = quote.items.reduce((s, i) => s + i.qty * i.price, 0) - (quote.discount || 0);
    const jobId = await ctx.db.insert("jobs", {
      tenantId:    quote.tenantId,
      jobNumber,
      customer:    quote.customer,
      customerId:  quote.customerId,
      phone:       quote.phone,
      vehicle:     quote.vehicle || "",
      type:        quote.type || "General",
      description: `From quote ${quote.quoteNumber}`,
      status:      "pending",
      branch:      quote.branch || "Main",
      parts:       quote.items.map(i => ({ name:i.desc, qty:i.qty, price:i.price })),
      labor:       0,
      amount:      total,
      notes:       quote.notes || "",
    });
    await ctx.db.patch(id, { status: "accepted" });
    return jobId;
  },
});

export const remove = mutation({
  args: { id: v.id("quotes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
