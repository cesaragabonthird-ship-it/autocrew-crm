import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db.query("customers").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const getById = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const search = query({
  args: { tenantId: v.id("tenants"), query: v.string() },
  handler: async (ctx, { tenantId, query: q }) => {
    return await ctx.db
      .query("customers")
      .withSearchIndex("search_name", s => s.search("name", q).eq("tenantId", tenantId))
      .take(20);
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name:     v.string(),
    phone:    v.string(),
    email:    v.optional(v.string()),
    address:  v.optional(v.string()),
    vehicles: v.array(v.object({ make:v.string(), model:v.string(), year:v.number(), color:v.optional(v.string()), plate:v.optional(v.string()) })),
    notes:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", { ...args, jobsCount:0, totalSpent:0 });
  },
});

export const update = mutation({
  args: {
    id:       v.id("customers"),
    name:     v.optional(v.string()),
    phone:    v.optional(v.string()),
    email:    v.optional(v.string()),
    address:  v.optional(v.string()),
    vehicles: v.optional(v.array(v.object({ make:v.string(), model:v.string(), year:v.number(), color:v.optional(v.string()), plate:v.optional(v.string()) }))),
    notes:    v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
