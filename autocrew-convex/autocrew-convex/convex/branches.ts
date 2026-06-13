import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db.query("branches").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name:     v.string(),
    address:  v.optional(v.string()),
    phone:    v.optional(v.string()),
    email:    v.optional(v.string()),
    manager:  v.optional(v.string()),
    notes:    v.optional(v.string()),
    isMain:   v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("branches", { ...args, status: "active", isMain: args.isMain ?? false });
  },
});

export const update = mutation({
  args: {
    id:      v.id("branches"),
    name:    v.optional(v.string()),
    address: v.optional(v.string()),
    phone:   v.optional(v.string()),
    email:   v.optional(v.string()),
    manager: v.optional(v.string()),
    notes:   v.optional(v.string()),
    status:  v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
