import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const all = await ctx.db.query("invoices").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
    return branch ? all.filter(i => i.branch === branch) : all;
  },
});

export const create = mutation({
  args: {
    tenantId:      v.id("tenants"),
    invoiceNumber: v.string(),
    jobId:         v.optional(v.id("jobs")),
    jobNumber:     v.optional(v.string()),
    customerId:    v.optional(v.id("customers")),
    customer:      v.string(),
    phone:         v.optional(v.string()),
    vehicle:       v.optional(v.string()),
    branch:        v.string(),
    issueDate:     v.string(),
    dueDate:       v.string(),
    items:         v.array(v.object({
      desc: v.string(),
      qty: v.number(),
      price: v.number(),
      productId: v.optional(v.string()),
      sku: v.optional(v.string()),
    })),
    discount:      v.number(),
    tax:           v.number(),
    amountPaid:    v.number(),
    paymentMethod: v.optional(v.string()),
    notes:         v.optional(v.string()),
    status:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const total = args.items.reduce((s,i)=>s+i.qty*i.price,0) - args.discount;
    const status = args.status || (args.amountPaid >= total ? "paid" : args.amountPaid > 0 ? "partial" : "sent");

    const id = await ctx.db.insert("invoices", { ...args, status });

    // Deduct stock if it is a shop sale
    const isShopSale = !args.jobId && (!args.jobNumber || args.invoiceNumber.startsWith("POS-"));
    if (isShopSale) {
      for (const item of args.items) {
        if (item.productId) {
          try {
            const pDoc: any = await ctx.db.get(item.productId as any);
            if (pDoc) {
              await ctx.db.patch(pDoc._id, { stock: Math.max(0, pDoc.stock - item.qty) });
            }
          } catch (_) {}
        }
      }
    }

    // Log payment if initial payment exists
    if (args.amountPaid > 0) {
      await ctx.db.insert("payments", {
        tenantId:      args.tenantId,
        receiptNumber: `REC-${args.invoiceNumber}`,
        invoiceId:     id,
        invoiceNumber: args.invoiceNumber,
        jobId:         args.jobId,
        jobNumber:     args.jobNumber,
        customer:      args.customer,
        branch:        args.branch,
        amount:        args.amountPaid,
        method:        args.paymentMethod || "Cash",
        reference:     "",
        date:          new Date().toISOString().slice(0, 10),
      });
    }

    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id:            v.id("invoices"),
    invoiceNumber: v.optional(v.string()),
    jobId:         v.optional(v.id("jobs")),
    jobNumber:     v.optional(v.string()),
    customerId:    v.optional(v.id("customers")),
    customer:      v.optional(v.string()),
    phone:         v.optional(v.string()),
    vehicle:       v.optional(v.string()),
    branch:        v.optional(v.string()),
    status:        v.optional(v.string()),
    issueDate:     v.optional(v.string()),
    dueDate:       v.optional(v.string()),
    paidDate:      v.optional(v.string()),
    items:         v.optional(v.array(v.object({
      desc: v.string(),
      qty: v.number(),
      price: v.number(),
      productId: v.optional(v.string()),
      sku: v.optional(v.string()),
    }))),
    discount:      v.optional(v.number()),
    tax:           v.optional(v.number()),
    amountPaid:    v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const oldDoc = await ctx.db.get(id);
    if (!oldDoc) throw new Error("Invoice not found");

    await ctx.db.patch(id, fields);

    // Log payment delta if amountPaid increased
    if (fields.amountPaid !== undefined && fields.amountPaid > (oldDoc.amountPaid || 0)) {
      const diff = fields.amountPaid - (oldDoc.amountPaid || 0);
      const invNum = fields.invoiceNumber || oldDoc.invoiceNumber;
      
      const existing = await ctx.db.query("payments")
        .withIndex("by_tenantId", q => q.eq("tenantId", oldDoc.tenantId))
        .collect();
      const invoicePayments = existing.filter(p => p.invoiceId === id);
      const seq = invoicePayments.length + 1;
      const receiptNumber = `REC-${invNum}${seq > 1 ? `-${seq}` : ""}`;

      await ctx.db.insert("payments", {
        tenantId:      oldDoc.tenantId,
        receiptNumber,
        invoiceId:     id,
        invoiceNumber: invNum,
        jobId:         fields.jobId || oldDoc.jobId,
        jobNumber:     fields.jobNumber || oldDoc.jobNumber,
        customer:      fields.customer || oldDoc.customer,
        branch:        fields.branch || oldDoc.branch,
        amount:        diff,
        method:        fields.paymentMethod || oldDoc.paymentMethod || "Cash",
        reference:     "",
        date:          new Date().toISOString().slice(0, 10),
      });
    }

    return await ctx.db.get(id);
  },
});

export const markPaid = mutation({
  args: {
    id:        v.id("invoices"),
    amount:    v.number(),
    method:    v.string(),
    reference: v.optional(v.string()),
    receiptNumber: v.string(),
  },
  handler: async (ctx, { id, amount, method, reference, receiptNumber }) => {
    const invoice = await ctx.db.get(id);
    if (!invoice) throw new Error("Invoice not found");
    await ctx.db.patch(id, {
      status:        "paid",
      amountPaid:    amount,
      paymentMethod: method,
      paidDate:      new Date().toISOString().slice(0, 10),
    });
    // Log payment
    const existing = await ctx.db.query("payments")
      .withIndex("by_tenantId", q => q.eq("tenantId", invoice.tenantId))
      .collect();
    const invoicePayments = existing.filter(p => p.invoiceId === id);
    const seq = invoicePayments.length + 1;
    const finalReceiptNumber = `REC-${invoice.invoiceNumber}${seq > 1 ? `-${seq}` : ""}`;

    await ctx.db.insert("payments", {
      tenantId:      invoice.tenantId,
      receiptNumber: finalReceiptNumber,
      invoiceId:     id,
      invoiceNumber: invoice.invoiceNumber,
      jobId:         invoice.jobId,
      jobNumber:     invoice.jobNumber,
      customer:      invoice.customer,
      branch:        invoice.branch,
      amount,
      method,
      reference:     reference || "",
      date:          new Date().toISOString().slice(0, 10),
    });
    return await ctx.db.get(id);
  },
});

export const cancel = mutation({
  args: {
    id: v.id("invoices"),
  },
  handler: async (ctx, { id }) => {
    const inv = await ctx.db.get(id);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "cancelled") return inv;

    const isShopSale = !inv.jobId && (!inv.jobNumber || inv.invoiceNumber.startsWith("POS-"));
    if (isShopSale) {
      for (const item of inv.items) {
        if (item.productId) {
          try {
            const pDoc: any = await ctx.db.get(item.productId as any);
            if (pDoc) {
              await ctx.db.patch(pDoc._id, { stock: pDoc.stock + item.qty });
            }
          } catch (_) {}
        }
      }
    }

    await ctx.db.patch(id, { status: "cancelled" });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
