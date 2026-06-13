import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ITEM = v.object({ name:v.string(), qty:v.number(), unitCost:v.number(), received:v.optional(v.number()), sku:v.optional(v.string()) });

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("purchaseOrders").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(o => o.branch === branch) : all;
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
    return await ctx.db.insert("purchaseOrders", { ...args, status: "draft" });
  },
});

export const update = mutation({
  args: {
    id:           v.id("purchaseOrders"),
    status:       v.optional(v.string()),
    expectedDate: v.optional(v.string()),
    receivedDate: v.optional(v.string()),
    items:        v.optional(v.array(ITEM)),
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
        const product = await ctx.db.query("products")
          .withIndex("by_sku", q => q.eq("tenantId", po.tenantId).eq("sku", item.sku || ""))
          .unique();
        if (product) await ctx.db.patch(product._id, { stock: product.stock + addQty });
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
