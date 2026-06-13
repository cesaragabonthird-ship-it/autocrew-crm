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
    items:         v.array(v.object({ desc:v.string(), qty:v.number(), price:v.number() })),
    discount:      v.number(),
    tax:           v.number(),
    amountPaid:    v.number(),
    paymentMethod: v.optional(v.string()),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const total = args.items.reduce((s,i)=>s+i.qty*i.price,0) - args.discount;
    const status = args.amountPaid >= total ? "paid" : args.amountPaid > 0 ? "partial" : "draft";
    return await ctx.db.insert("invoices", { ...args, status });
  },
});

export const update = mutation({
  args: {
    id:            v.id("invoices"),
    status:        v.optional(v.string()),
    amountPaid:    v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    paidDate:      v.optional(v.string()),
    dueDate:       v.optional(v.string()),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
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
    await ctx.db.insert("payments", {
      tenantId:      invoice.tenantId,
      receiptNumber,
      invoiceId:     id,
      invoiceNumber: invoice.invoiceNumber,
      customer:      invoice.customer,
      branch:        invoice.branch,
      amount,
      method,
      reference:     reference || "",
      date:          new Date().toISOString().slice(0, 10),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
