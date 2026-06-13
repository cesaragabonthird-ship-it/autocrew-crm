import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { renameBranchDocuments } from "./branches";

// ── Get tenant by Clerk ID ────────────────────────────────
export const getByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_clerkId", q => q.eq("clerkId", uid))
      .unique();
  },
});

// ── Get all tenants (admin only) ──────────────────────────────
export const getAll = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", q => q.eq("clerkId", args.clerkId))
        .unique();
      if (!user || user.email !== "cesaragabonthird@gmail.com") {
        throw new Error("Unauthorized access");
      }
    }
    return await ctx.db.query("tenants").collect();
  },
});

// ── Create tenant (on signup) ─────────────────────────────────
export const create = mutation({
  args: {
    clerkId:         v.string(),
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
      clerkId:         args.clerkId,
      shopName:        args.shopName,
      ownerName:       args.ownerName,
      email:           args.email,
      phone:           args.phone,
      plan:            args.plan,
      trialEndsAt:     args.trialEndsAt,
      nextBillingDate: args.nextBillingDate,
      status:          "trial",
    });

    // Create default main branch named after the shop
    await ctx.db.insert("branches", {
      tenantId,
      name:   args.shopName,
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
    shopName:        v.optional(v.string()),
    ownerName:       v.optional(v.string()),
    email:           v.optional(v.string()),
    phone:           v.optional(v.string()),
    address:         v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, address, ...fields }) => {
    await ctx.db.patch(tenantId, fields);

    if (fields.shopName || fields.phone || fields.email || address !== undefined) {
      // Find the main branch for this tenant
      const mainBranch = await ctx.db
        .query("branches")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .filter(q => q.eq(q.field("isMain"), true))
        .first();

      if (mainBranch) {
        const branchUpdates: any = {};
        if (fields.shopName) branchUpdates.name = fields.shopName;
        if (fields.phone) branchUpdates.phone = fields.phone;
        if (fields.email) branchUpdates.email = fields.email;
        if (address !== undefined) branchUpdates.address = address;

        if (fields.shopName && fields.shopName !== mainBranch.name) {
          await renameBranchDocuments(ctx, tenantId, mainBranch.name, fields.shopName);
        }

        await ctx.db.patch(mainBranch._id, branchUpdates);
      }
    }

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
      receiptNumber: `REC-SUB-${Date.now().toString().slice(-6)}`,
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
