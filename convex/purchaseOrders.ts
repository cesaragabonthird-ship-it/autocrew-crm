import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ITEM = v.object({ name:v.string(), qty:v.number(), unitCost:v.number(), received:v.optional(v.number()), sku:v.optional(v.string()) });

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
    const all = await ctx.db.query("purchaseOrders").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (branch) {
      const resolved = await resolveBranchName(ctx, branch);
      return all.filter(o => matchBranch(o.branch, resolved));
    }
    return all;
  },
});

export const create = mutation({
  args: {
    tenantId:     v.id("tenants"),
    poNumber:     v.string(),
    supplier:     v.string(),
    branch:       v.string(),
    orderDate:    v.string(),
    expectedDate: v.optional(v.string()),
    items:        v.array(ITEM),
    totalCost:    v.number(),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("purchaseOrders", { ...args, status: "ordered" });
  },
});

export const update = mutation({
  args: {
    id:           v.id("purchaseOrders"),
    poNumber:     v.optional(v.string()),
    supplier:     v.optional(v.string()),
    branch:       v.optional(v.string()),
    orderDate:    v.optional(v.string()),
    status:       v.optional(v.string()),
    expectedDate: v.optional(v.string()),
    receivedDate: v.optional(v.string()),
    items:        v.optional(v.array(ITEM)),
    totalCost:    v.optional(v.number()),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const receive = mutation({
  args: {
    id:            v.id("purchaseOrders"),
    receivedQtys:  v.array(v.number()),
  },
  handler: async (ctx, { id, receivedQtys }) => {
    const po = await ctx.db.get(id);
    if (!po) throw new Error("PO not found");
    const updatedItems = po.items.map((item, i) => ({
      ...item,
      received: (item.received || 0) + (receivedQtys[i] || 0),
    }));
    const allDone = updatedItems.every(i => (i.received || 0) >= i.qty);
    const anyDone = updatedItems.some(i => (i.received || 0) > 0);
    const status  = allDone ? "received" : anyDone ? "partial" : po.status;
    await ctx.db.patch(id, {
      items: updatedItems, status,
      receivedDate: allDone ? new Date().toISOString().slice(0,10) : po.receivedDate,
    });
    // Update product stock for received items
    for (const [i, item] of updatedItems.entries()) {
      const addQty = receivedQtys[i] || 0;
      if (addQty > 0) {
        let product = null;
        const sku = item.sku;
        if (sku && sku.trim() !== "") {
          product = await ctx.db.query("products")
            .withIndex("by_sku", q => q.eq("tenantId", po.tenantId).eq("sku", sku.trim()))
            .first();
        }
        if (!product) {
          product = await ctx.db.query("products")
            .filter(q => q.and(
              q.eq(q.field("tenantId"), po.tenantId),
              q.eq(q.field("name"), item.name)
            ))
            .first();
        }
        if (product) {
          await ctx.db.patch(product._id, { stock: product.stock + addQty });
        }
      }
    }
    return { status, items: updatedItems };
  },
});

export const remove = mutation({
  args: { id: v.id("purchaseOrders") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
