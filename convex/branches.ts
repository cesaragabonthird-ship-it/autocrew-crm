import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkPlanLimit } from "./utils";

export const getAll = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .collect();

    const users = await ctx.db
      .query("users")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .collect();

    const products = await ctx.db
      .query("products")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .collect();

    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    return branches.map(b => {
      const bId = b._id;
      const bName = b.name;

      const matchBranch = (branchField?: string) => {
        if (!branchField) return false;
        const bf = branchField.toLowerCase().trim();
        const id = String(bId).toLowerCase().trim();
        const nm = bName.toLowerCase().trim();
        return bf === id || bf === nm || nm.includes(bf) || bf.includes(nm);
      };

      const staffCount = users.filter(u => matchBranch(u.branchId) || matchBranch(u.branchName)).length;
      const productCount = products.filter(p => matchBranch(p.branch)).length;

      // Calculate monthly revenue for this branch
      const monthRevenue = payments
        .filter(p => p.date?.startsWith(currentMonthPrefix) && matchBranch(p.branch))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        ...b,
        id: b._id, // Map database _id to id for client-side compatibility
        staffCount,
        productCount,
        monthRevenue,
      };
    });
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
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    geofenceRadius: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkPlanLimit(ctx.db, args.tenantId, "branches");
    return await ctx.db.insert("branches", { ...args, status: "active", isMain: args.isMain ?? false });
  },
});

export async function renameBranchDocuments(ctx: any, tenantId: any, oldName: string, newName: string) {
  if (oldName === newName) return;

  const collections = [
    "products",
    "jobs",
    "invoices",
    "payments",
    "purchaseOrders",
    "deliveries",
    "quotes",
    "payrollEmployees",
    "attendance"
  ] as const;

  for (const coll of collections) {
    const docs = await ctx.db
      .query(coll)
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", tenantId))
      .collect();

    for (const doc of docs) {
      if (doc.branch === oldName) {
        await ctx.db.patch(doc._id, { branch: newName });
      }
    }
  }

  // Also sync users branchName
  const users = await ctx.db
    .query("users")
    .withIndex("by_tenantId", (q: any) => q.eq("tenantId", tenantId))
    .collect();
  for (const u of users) {
    if (u.branchName === oldName) {
      await ctx.db.patch(u._id, { branchName: newName });
    }
  }
}

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
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    geofenceRadius: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const oldBranch = await ctx.db.get(id);
    if (!oldBranch) throw new Error("Branch not found");

    await ctx.db.patch(id, fields);

    // If editing the main branch, keep the tenant root registration synced
    if (oldBranch.isMain) {
      const tenantUpdates: any = {};
      if (fields.name) tenantUpdates.shopName = fields.name;
      if (fields.phone) tenantUpdates.phone = fields.phone;
      if (fields.email) tenantUpdates.email = fields.email;

      if (Object.keys(tenantUpdates).length > 0) {
        await ctx.db.patch(oldBranch.tenantId, tenantUpdates);
      }
    }

    // If name is changed, rename documents across all tables
    if (fields.name && fields.name !== oldBranch.name) {
      await renameBranchDocuments(ctx, oldBranch.tenantId, oldBranch.name, fields.name);
    }

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

export const backfillBranchNames = mutation({
  args: { tenantId: v.id("tenants"), targetBranchName: v.string() },
  handler: async (ctx, { tenantId, targetBranchName }) => {
    const collections = [
      "products",
      "jobs",
      "invoices",
      "payments",
      "purchaseOrders",
      "deliveries",
      "quotes",
      "payrollEmployees",
      "attendance"
    ] as const;

    let count = 0;
    for (const coll of collections) {
      const docs = await ctx.db
        .query(coll)
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect();

      for (const doc of docs) {
        if (doc.branch === "Main Branch") {
          await ctx.db.patch(doc._id, { branch: targetBranchName });
          count++;
        }
      }
    }
    return count;
  }
});
