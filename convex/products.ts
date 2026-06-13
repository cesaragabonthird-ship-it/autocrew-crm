import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkPlanLimit } from "./utils";

async function resolveBranchName(ctx: any, branchArg?: string): Promise<string | undefined> {
  if (!branchArg) return undefined;
  if (branchArg.length >= 20) {
    try {
      const bDoc = await ctx.db.get(branchArg as any);
      if (bDoc) return bDoc.name;
    } catch (_) {}
  }
  return branchArg;
}

function matchBranch(docBranch: string, filterBranch?: string): boolean {
  if (!filterBranch) return true;
  const db = docBranch.toLowerCase().trim();
  const fb = filterBranch.toLowerCase().trim();
  return db === fb || db.includes(fb) || fb.includes(db);
}

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const products = await ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (branch) {
      const resolved = await resolveBranchName(ctx, branch);
      return products.filter(p => matchBranch(p.branch, resolved));
    }
    return products;
  },
});

export const getLowStock = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const products = await ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (branch) {
      const resolved = await resolveBranchName(ctx, branch);
      return products.filter(p => p.stock <= p.reorderLevel && matchBranch(p.branch, resolved));
    }
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
    await checkPlanLimit(ctx.db, args.tenantId, "products");
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

    // Find if product already exists in the destination branch
    const destProduct = await ctx.db
      .query("products")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .filter(q => q.and(
        q.eq(q.field("sku"), product.sku),
        q.eq(q.field("branch"), toBranch)
      ))
      .first();

    if (destProduct) {
      // Increment target branch product stock
      await ctx.db.patch(destProduct._id, {
        stock: destProduct.stock + qty
      });
    } else {
      // Create new target branch product record
      await ctx.db.insert("products", {
        tenantId,
        sku: product.sku,
        name: product.name,
        category: product.category,
        branch: toBranch,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stock: qty,
        reorderLevel: product.reorderLevel,
        supplier: product.supplier,
        unit: product.unit,
        description: product.description,
      });
    }

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
