import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const JOB_ARGS = {
  tenantId:      v.id("tenants"),
  jobNumber:     v.string(),
  customerId:    v.optional(v.id("customers")),
  customer:      v.string(),
  phone:         v.optional(v.string()),
  vehicle:       v.optional(v.string()),
  vehiclePlate:  v.optional(v.string()),
  type:          v.string(),
  description:   v.optional(v.string()),
  status:        v.string(),
  assignedTo:    v.optional(v.string()),
  assignedUid:   v.optional(v.string()),
  branch:        v.string(),
  scheduledDate: v.optional(v.string()),
  startTime:     v.optional(v.string()),
  endTime:       v.optional(v.string()),
  address:       v.optional(v.string()),
  parts:         v.array(v.object({ name:v.string(), qty:v.number(), price:v.number(), sku:v.optional(v.string()), checked:v.optional(v.boolean()) })),
  checklist:     v.optional(v.array(v.object({ id:v.string(), label:v.string(), done:v.boolean() }))),
  labor:         v.number(),
  amount:        v.number(),
  notes:         v.optional(v.string()),
  completionNotes: v.optional(v.string()),
};

export const getAll = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    if (branch) return await ctx.db.query("jobs").withIndex("by_tenantId_branch", q => q.eq("tenantId", tenantId).eq("branch", branch)).collect();
    return await ctx.db.query("jobs").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect();
  },
});

export const getByStatus = query({
  args: { tenantId: v.id("tenants"), status: v.string() },
  handler: async (ctx, { tenantId, status }) => {
    return await ctx.db.query("jobs").withIndex("by_tenantId_status", q => q.eq("tenantId", tenantId).eq("status", status)).collect();
  },
});

export const getByInstaller = query({
  args: { tenantId: v.id("tenants"), assignedUid: v.string() },
  handler: async (ctx, { tenantId, assignedUid }) => {
    return await ctx.db.query("jobs").withIndex("by_assignedUid", q => q.eq("tenantId", tenantId).eq("assignedUid", assignedUid)).collect();
  },
});

export const getByDate = query({
  args: { tenantId: v.id("tenants"), date: v.string() },
  handler: async (ctx, { tenantId, date }) => {
    return await ctx.db.query("jobs").withIndex("by_scheduledDate", q => q.eq("tenantId", tenantId).eq("scheduledDate", date)).collect();
  },
});

export const create = mutation({
  args: JOB_ARGS,
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", args);
  },
});

export const update = mutation({
  args: { id: v.id("jobs"), ...Object.fromEntries(Object.entries(JOB_ARGS).filter(([k]) => k !== "tenantId").map(([k, v]) => [k, v])) },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id:             v.id("jobs"),
    status:         v.string(),
    completionNotes:v.optional(v.string()),
  },
  handler: async (ctx, { id, status, completionNotes }) => {
    const job = await ctx.db.get(id);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(id, { status, ...(completionNotes ? { completionNotes } : {}) });

    // If completed — update customer stats
    if (status === "completed" && job.customerId) {
      const customer = await ctx.db.get(job.customerId);
      if (customer) {
        await ctx.db.patch(job.customerId, {
          jobsCount:  (customer.jobsCount || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + (job.amount || 0),
          lastVisit:  new Date().toISOString().slice(0, 10),
        });
      }
    }
    return id;
  },
});

export const assign = mutation({
  args: { id: v.id("jobs"), assignedTo: v.string(), assignedUid: v.string() },
  handler: async (ctx, { id, assignedTo, assignedUid }) => {
    await ctx.db.patch(id, { assignedTo, assignedUid, status: "assigned" });
    return id;
  },
});

export const updateChecklist = mutation({
  args: {
    id:        v.id("jobs"),
    checklist: v.array(v.object({ id: v.string(), label: v.string(), done: v.boolean() })),
  },
  handler: async (ctx, { id, checklist }) => {
    await ctx.db.patch(id, { checklist });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
