import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { checkPlanLimit } from "./utils";

/**
 * Users table — keyed by Clerk user ID (clerkId) instead of Firebase uid.
 * Profile is auto-created by the Clerk webhook on first signup.
 */

// ── Get by Clerk ID (used in UserContext) ─────────────────────
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (!user) return null;
    if (user.tenantId) {
      const tenant = await ctx.db.get(user.tenantId);
      if (tenant) {
        return {
          ...user,
          shopName: tenant.shopName,
          plan: tenant.plan,
          status: tenant.status,
          trialEndsAt: tenant.trialEndsAt,
          nextBillingDate: tenant.nextBillingDate,
          graceEndsAt: tenant.graceEndsAt,
          userStatus: user.status,
        };
      }
    }
    return user;
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
export const createFromClerk = mutation({
  args: {
    clerkId:    v.string(),
    email:      v.string(),
    name:       v.string(),
    imageUrl:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists by clerkId
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkId))
      .unique();
    if (existing) return existing._id;

    // Check if already exists by email (created by admin in Team tab)
    const existingEmail = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email))
      .unique();
    if (existingEmail) {
      await ctx.db.patch(existingEmail._id, {
        clerkId: args.clerkId,
        imageUrl: args.imageUrl || existingEmail.imageUrl,
      });
      return existingEmail._id;
    }

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
    // 1. Super Admin limit check
    if (args.role === 'super_admin') {
      const superAdminsCount = (
        await ctx.db
          .query("users")
          .withIndex("by_role", q => q.eq("tenantId", args.tenantId).eq("role", "super_admin"))
          .collect()
      ).filter(u => u.status !== 'deleted').length;
      if (superAdminsCount >= 1) {
        throw new Error("You can only have 1 Super Admin in your team.");
      }
    }

    // 2. Installer limit check
    if (args.role === 'installer') {
      await checkPlanLimit(ctx.db, args.tenantId, "installers");
    }

    // 3. Total Team size limit check
    await checkPlanLimit(ctx.db, args.tenantId, "team");

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
    const oldUser = await ctx.db.get(id);
    if (!oldUser) throw new Error('User not found');

    if (oldUser.tenantId) {
      // 1. Check for role promotions
      if (fields.role === 'super_admin' && oldUser.role !== 'super_admin') {
        const superAdminsCount = (
          await ctx.db
            .query("users")
            .withIndex("by_role", q => q.eq("tenantId", oldUser.tenantId).eq("role", "super_admin"))
            .collect()
        ).filter(u => u.status !== 'deleted').length;
        if (superAdminsCount >= 1) {
          throw new Error("You can only have 1 Super Admin in your team.");
        }
      }

      if (fields.role === 'installer' && oldUser.role !== 'installer') {
        await checkPlanLimit(ctx.db, oldUser.tenantId, "installers");
      }

      // 2. Check for soft-deleted reactivation
      if (fields.status && fields.status !== 'deleted' && oldUser.status === 'deleted') {
        await checkPlanLimit(ctx.db, oldUser.tenantId, "team");

        const targetRole = fields.role || oldUser.role;
        if (targetRole === 'installer') {
          await checkPlanLimit(ctx.db, oldUser.tenantId, "installers");
        }

        if (targetRole === 'super_admin') {
          const superAdminsCount = (
            await ctx.db
              .query("users")
              .withIndex("by_role", q => q.eq("tenantId", oldUser.tenantId).eq("role", "super_admin"))
              .collect()
          ).filter(u => u.status !== 'deleted').length;
          if (superAdminsCount >= 1) {
            throw new Error("You can only have 1 Super Admin in your team.");
          }
        }
      }
    }

    await ctx.db.patch(id, fields);

    // Cascade status updates to payrollEmployees if status changed
    if (fields.status && fields.status !== oldUser.status) {
      let payrollEmp = null;
      if (oldUser.clerkId) {
        payrollEmp = await ctx.db
          .query('payrollEmployees')
          .withIndex('by_clerkId', q => q.eq('clerkId', oldUser.clerkId))
          .unique();
      }
      if (!payrollEmp && oldUser.email) {
        payrollEmp = await ctx.db
          .query('payrollEmployees')
          .filter(q => q.eq(q.field('email'), oldUser.email))
          .first();
      }
      if (payrollEmp) {
        await ctx.db.patch(payrollEmp._id, { status: fields.status });
      }
    }

    return id;
  },
});

// ── Sync Clerk profile updates (name, imageUrl) ───────────────
export const syncFromClerk = mutation({
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

// ── Link existing team profile by email (fallback for missing webhook) ──
export const linkExistingByEmail = mutation({
  args: {
    clerkId: v.string(),
    email:   v.string(),
  },
  handler: async (ctx, { clerkId, email }) => {
    // Check if already exists by clerkId
    const existingClerk = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (existingClerk) return existingClerk._id;

    // Find user by email
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', email))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, { clerkId });
      return user._id;
    }
    return null;
  },
});

// ── Delete user (on Clerk account deletion) ───────────────────
export const deleteByClerkId = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .unique();
    if (user) {
      // Find and handle payrollEmployee record deletion as well
      let payrollEmp = await ctx.db
        .query('payrollEmployees')
        .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
        .unique();
      if (!payrollEmp && user.email) {
        payrollEmp = await ctx.db
          .query('payrollEmployees')
          .filter(q => q.eq(q.field('email'), user.email))
          .first();
      }

      if (payrollEmp) {
        // Check for history
        const payslip = await ctx.db
          .query('payslips')
          .withIndex('by_payrollEmployeeId', q => q.eq('payrollEmployeeId', payrollEmp._id))
          .first();
        const attendance = await ctx.db
          .query('attendance')
          .withIndex('by_employee_date', q => q.eq('payrollEmployeeId', payrollEmp._id))
          .first();
        const advance = await ctx.db
          .query('cashAdvances')
          .withIndex('by_payrollEmployeeId', q => q.eq('payrollEmployeeId', payrollEmp._id))
          .first();

        if (payslip || attendance || advance) {
          // Soft-delete user: update status to 'deleted', do not hard delete
          await ctx.db.patch(user._id, { status: 'deleted' });
          await ctx.db.patch(payrollEmp._id, { status: 'deleted' });
          return;
        }

        await ctx.db.delete(payrollEmp._id);
      }
      await ctx.db.delete(user._id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (!user) return id;

    // Find corresponding payrollEmployee
    let payrollEmp = null;
    if (user.clerkId) {
      payrollEmp = await ctx.db
        .query('payrollEmployees')
        .withIndex('by_clerkId', q => q.eq('clerkId', user.clerkId))
        .unique();
    }
    if (!payrollEmp && user.email) {
      payrollEmp = await ctx.db
        .query('payrollEmployees')
        .filter(q => q.eq(q.field('email'), user.email))
        .first();
    }

    if (payrollEmp) {
      // Check if there is payroll history
      const payslip = await ctx.db
        .query('payslips')
        .withIndex('by_payrollEmployeeId', q => q.eq('payrollEmployeeId', payrollEmp._id))
        .first();
      const attendance = await ctx.db
        .query('attendance')
        .withIndex('by_employee_date', q => q.eq('payrollEmployeeId', payrollEmp._id))
        .first();
      const advance = await ctx.db
        .query('cashAdvances')
        .withIndex('by_payrollEmployeeId', q => q.eq('payrollEmployeeId', payrollEmp._id))
        .first();

      if (payslip || attendance || advance) {
        throw new Error(
          'Cannot delete this team member because they have payroll history (payslips, attendance, or cash advances). Please deactivate them instead to preserve records.'
        );
      }

      // If no history, safely delete payrollEmployee record
      await ctx.db.delete(payrollEmp._id);
    }

    await ctx.db.delete(id);
    return id;
  },
});
