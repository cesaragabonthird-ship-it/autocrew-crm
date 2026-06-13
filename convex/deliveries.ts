import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ITEM = v.object({ name:v.string(), qtyExpected:v.number(), qtyReceived:v.number(), condition:v.optional(v.string()) });

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
    const all = await ctx.db.query("deliveries").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    if (branch) {
      const resolved = await resolveBranchName(ctx, branch);
      return all.filter(d => matchBranch(d.branch, resolved));
    }
    return all;
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

    // Adjust product stock for received items in the delivery
    for (const item of args.items) {
      if (item.qtyReceived > 0) {
        let product = await ctx.db.query("products")
          .filter(q => q.and(
            q.eq(q.field("tenantId"), args.tenantId),
            q.eq(q.field("name"), item.name),
            q.eq(q.field("branch"), args.branch)
          ))
          .first();
        if (!product) {
          product = await ctx.db.query("products")
            .filter(q => q.and(
              q.eq(q.field("tenantId"), args.tenantId),
              q.eq(q.field("name"), item.name)
            ))
            .first();
        }
        if (product) {
          await ctx.db.patch(product._id, { stock: product.stock + item.qtyReceived });
        }
      }
    }

    // Link and update corresponding PO if provided
    if (args.poNumber && args.poNumber.trim() !== "") {
      const poNum = args.poNumber.trim();
      const po = await ctx.db.query("purchaseOrders")
        .withIndex("by_tenantId", q => q.eq("tenantId", args.tenantId))
        .filter(q => q.eq(q.field("poNumber"), poNum))
        .first();
      if (po) {
        const updatedPOItems = po.items.map(poItem => {
          const delItem = args.items.find(di => di.name === poItem.name);
          if (delItem) {
            return {
              ...poItem,
              received: (poItem.received || 0) + delItem.qtyReceived
            };
          }
          return poItem;
        });
        const allRcvd = updatedPOItems.every(i => (i.received || 0) >= i.qty);
        const anyRcvd = updatedPOItems.some(i => (i.received || 0) > 0);
        const poStatus = allRcvd ? "received" : anyRcvd ? "partial" : po.status;

        await ctx.db.patch(po._id, {
          items: updatedPOItems,
          status: poStatus,
          receivedDate: allRcvd ? new Date().toISOString().slice(0, 10) : po.receivedDate
        });
      }
    }

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
    const old = await ctx.db.get(id);
    if (!old) throw new Error("Delivery not found");

    if (fields.items) {
      for (const [i, newItem] of fields.items.entries()) {
        const oldItem = old.items?.[i];
        const oldRcv = oldItem ? (oldItem.qtyReceived || 0) : 0;
        const newRcv = newItem.qtyReceived || 0;
        const diff = newRcv - oldRcv;

        if (diff !== 0) {
          const productName = newItem.name || (oldItem && oldItem.name) || "";
          const product = await ctx.db.query("products")
            .filter(q => q.and(
              q.eq(q.field("tenantId"), old.tenantId),
              q.eq(q.field("name"), productName)
            ))
            .first();
          if (product) {
            await ctx.db.patch(product._id, { stock: Math.max(0, product.stock + diff) });
          }
        }
      }
    }

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
