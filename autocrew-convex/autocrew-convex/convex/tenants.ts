import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Get tenant by Firebase UID ────────────────────────────────
export const getByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_uid", q => q.eq("uid", uid))
      .unique();
  },
});

// ── Get all tenants (admin only) ──────────────────────────────
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tenants").collect();
  },
});

// ── Create tenant (on signup) ─────────────────────────────────
export const create = mutation({
  args: {
    uid:             v.string(),
    shopName:        v.string(),
    ownerName:       v.string(),
    email:           v.string(),
    phone:           v.string(),
    plan:            v.string(),
    trialEndsAt:     v.string(),
    nextBillingDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Check duplicate email
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_email", q => q.eq("email", args.email))
      .unique();
    if (existing) throw new Error("Email already registered.");

    const tenantId = await ctx.db.insert("tenants", {
      ...args,
      status:      "trial",
      graceEndsAt: undefined,
    });

    // Create user profile for the owner
    await ctx.db.insert("users", {
      uid:        args.uid,
      tenantId,
      name:       args.ownerName,
      email:      args.email,
      role:       "super_admin",
      status:     "active",
      branchName: "Main Branch",
    });

    // Create default main branch
    await ctx.db.insert("branches", {
      tenantId,
      name:   "Main Branch",
      status: "active",
      isMain: true,
    });

    return tenantId;
  },
});

// ── Update tenant ─────────────────────────────────────────────
export const update = mutation({
  args: {
    tenantId:        v.id("tenants"),
    status:          v.optional(v.string()),
    plan:            v.optional(v.string()),
    nextBillingDate: v.optional(v.string()),
    graceEndsAt:     v.optional(v.string()),
    trialEndsAt:     v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, ...fields }) => {
    await ctx.db.patch(tenantId, fields);
    return tenantId;
  },
});

// ── Mark paid (admin action) ──────────────────────────────────
export const markPaid = mutation({
  args: {
    tenantId:  v.id("tenants"),
    amount:    v.number(),
    method:    v.string(),
    reference: v.optional(v.string()),
    notes:     v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, amount, method, reference, notes }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) throw new Error("Tenant not found");

    // Advance billing date by 1 month
    const current = new Date(tenant.nextBillingDate || new Date().toISOString());
    current.setMonth(current.getMonth() + 1);
    const nextBillingDate = current.toISOString();

    await ctx.db.patch(tenantId, {
      status:          "active",
      nextBillingDate,
      graceEndsAt:     undefined,
    });

    // Log payment
    await ctx.db.insert("payments", {
      tenantId,
      receiptNumber: `REC-${Date.now()}`,
      customer:      tenant.shopName,
      branch:        "—",
      amount,
      method,
      reference:     reference || "",
      date:          new Date().toISOString().slice(0, 10),
      notes:         notes || "",
    });

    return { status: "active", nextBillingDate };
  },
});

// ── Suspend ───────────────────────────────────────────────────
export const suspend = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    await ctx.db.patch(tenantId, { status: "suspended" });
    return tenantId;
  },
});

// ── Activate ──────────────────────────────────────────────────
export const activate = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    await ctx.db.patch(tenantId, { status: "active", graceEndsAt: undefined });
    return tenantId;
  },
});
