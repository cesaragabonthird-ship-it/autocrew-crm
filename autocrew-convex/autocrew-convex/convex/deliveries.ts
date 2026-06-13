import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ITEM = v.object({ name:v.string(), qtyExpected:v.number(), qtyReceived:v.number(), condition:v.optional(v.string()) });

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("deliveries").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(d => d.branch === branch) : all;
  },
});

export const create = mutation({
  args: {
    tenantId:       v.id("tenants"),
    deliveryNumber: v.string(),
    poNumber:       v.optional(v.string()),
    supplier:       v.string(),
    branch:         v.string(),
    deliveryDate:   v.string(),
    items:          v.array(ITEM),
    receivedBy:     v.optional(v.string()),
    notes:          v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allDone = args.items.every(i => i.qtyReceived >= i.qtyExpected);
    const anyDone = args.items.some(i => i.qtyReceived > 0);
    const status  = allDone ? "received" : anyDone ? "partial" : "pending";
    return await ctx.db.insert("deliveries", { ...args, status });
  },
});

export const update = mutation({
  args: {
    id:         v.id("deliveries"),
    status:     v.optional(v.string()),
    items:      v.optional(v.array(ITEM)),
    receivedBy: v.optional(v.string()),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
