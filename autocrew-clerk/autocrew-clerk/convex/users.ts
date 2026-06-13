import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Users table — keyed by Clerk user ID (clerkId) instead of Firebase uid.
 * Profile is auto-created by the Clerk webhook on first signup.
 */

// ── Get by Clerk ID (used in UserContext) ─────────────────────
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
  },
});

// ── Get all users for a tenant ────────────────────────────────
export const getByTenant = query({
  args: { tenantId: v.id('tenants'), branchId: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branchId }) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_tenantId', q => q.eq('tenantId', tenantId))
      .collect();
    if (!branchId) return users;
    return users.filter(u => !u.branchId || u.branchId === branchId);
  },
});

// ── Create user profile (called from Clerk webhook) ───────────
export const createFromClerk = internalMutation({
  args: {
    clerkId:    v.string(),
    email:      v.string(),
    name:       v.string(),
    imageUrl:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkId))
      .unique();
    if (existing) return existing._id;

    // Create as unassigned user — will be linked to tenant in onboarding
    return await ctx.db.insert('users', {
      clerkId:   args.clerkId,
      email:     args.email,
      name:      args.name,
      imageUrl:  args.imageUrl,
      role:      'super_admin',  // first user of a new signup is owner
      status:    'active',
      tenantId:  undefined as any, // set during onboarding
    });
  },
});

// ── Link user to a tenant (called during onboarding) ──────────
export const linkToTenant = mutation({
  args: {
    clerkId:    v.string(),
    tenantId:   v.id('tenants'),
    role:       v.string(),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, tenantId, role, branchId, branchName }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (!user) throw new Error('User not found');
    await ctx.db.patch(user._id, { tenantId, role, branchId, branchName });
    return user._id;
  },
});

// ── Create user directly (admin adding team member) ───────────
export const create = mutation({
  args: {
    clerkId:    v.optional(v.string()),
    tenantId:   v.id('tenants'),
    name:       v.string(),
    email:      v.string(),
    phone:      v.optional(v.string()),
    role:       v.string(),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
    status:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('users', { ...args, status: args.status || 'active' });
  },
});

// ── Update user ───────────────────────────────────────────────
export const update = mutation({
  args: {
    id:         v.id('users'),
    name:       v.optional(v.string()),
    phone:      v.optional(v.string()),
    role:       v.optional(v.string()),
    branchId:   v.optional(v.string()),
    branchName: v.optional(v.string()),
    status:     v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

// ── Sync Clerk profile updates (name, imageUrl) ───────────────
export const syncFromClerk = internalMutation({
  args: {
    clerkId:  v.string(),
    name:     v.optional(v.string()),
    email:    v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, ...fields }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (!user) return;
    await ctx.db.patch(user._id, fields);
  },
});

// ── Delete user (on Clerk account deletion) ───────────────────
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (user) await ctx.db.delete(user._id);
  },
});

export const remove = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return id;
  },
});
