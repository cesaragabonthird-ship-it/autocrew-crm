import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await ctx.db.query("users").withIndex("by_uid", q => q.eq("uid", uid)).unique();
  },
});

export const getByTenant = query({
  args: { tenantId: v.id("tenants"), branchId: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branchId }) => {
    const users = await ctx.db.query("users").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (!branchId) return users;
    return users.filter(u => !u.branchId || u.branchId === branchId);
  },
});

export const create = mutation({
  args: {
    uid:        v.string(),
    tenantId:   v.id("tenants"),
    name:       v.string(),
    email:      v.string(),
    phone:      v.optional(v.string()),
    role:       v.string(),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
    status:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", { ...args, status: args.status || "active" });
  },
});

export const update = mutation({
  args: {
    id:         v.id("users"),
    name:       v.optional(v.string()),
    phone:      v.optional(v.string()),
    role:       v.optional(v.string()),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
    status:     v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
