import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    if (branch) {
      return await ctx.db.query("products").withIndex("by_tenantId_branch", q => q.eq("tenantId", tenantId).eq("branch", branch)).collect();
    }
    return await ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const getLowStock = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const products = branch
      ? await ctx.db.query("products").withIndex("by_tenantId_branch", q => q.eq("tenantId", tenantId).eq("branch", branch)).collect()
      : await ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return products.filter(p => p.stock <= p.reorderLevel);
  },
});

export const create = mutation({
  args: {
    tenantId:     v.id("tenants"),
    sku:          v.string(),
    name:         v.string(),
    category:     v.string(),
    branch:       v.string(),
    costPrice:    v.number(),
    sellingPrice: v.number(),
    stock:        v.number(),
    reorderLevel: v.number(),
    supplier:     v.optional(v.string()),
    unit:         v.string(),
    description:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", args);
  },
});

export const update = mutation({
  args: {
    id:           v.id("products"),
    sku:          v.optional(v.string()),
    name:         v.optional(v.string()),
    category:     v.optional(v.string()),
    branch:       v.optional(v.string()),
    costPrice:    v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    stock:        v.optional(v.number()),
    reorderLevel: v.optional(v.number()),
    supplier:     v.optional(v.string()),
    unit:         v.optional(v.string()),
    description:  v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});

export const transferStock = mutation({
  args: {
    tenantId:   v.id("tenants"),
    productId:  v.id("products"),
    fromBranch: v.string(),
    toBranch:   v.string(),
    qty:        v.number(),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, productId, fromBranch, toBranch, qty, notes }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");
    const newStock = Math.max(0, product.stock - qty);
    await ctx.db.patch(productId, { stock: newStock });
    // Log transfer
    await ctx.db.insert("transfers", {
      tenantId,
      productId,
      productName: product.name,
      fromBranch,
      toBranch,
      qty,
      notes: notes || "",
      date:  new Date().toISOString().slice(0, 10),
    });
    return { newStock };
  },
});

export const adjustStock = mutation({
  args: { id: v.id("products"), qty: v.number() },
  handler: async (ctx, { id, qty }) => {
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");
    const newStock = Math.max(0, product.stock + qty);
    await ctx.db.patch(id, { stock: newStock });
    return newStock;
  },
});
