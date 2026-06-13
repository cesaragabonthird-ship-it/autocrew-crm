import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    maxBranches: 1,
    maxInstallers: 1,
    maxProducts: 30,
    maxTeam: 5,
    features: ['1 branch', '1 installer', '30 products', 'Jobs & invoicing', 'Basic reports'],
    color: 'sky'
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 2499,
    maxBranches: 3,
    maxInstallers: 15,
    maxProducts: 500,
    maxTeam: 30,
    features: ['Up to 3 branches', '15 installers', '500 products', 'Everything in Starter', 'Installer portal', 'Purchase orders', 'Delivery tracking', 'Sales reports'],
    color: 'violet',
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 4999,
    maxBranches: null,
    maxInstallers: null,
    maxProducts: null,
    maxTeam: null,
    features: ['Unlimited branches', 'Unlimited installers', 'Unlimited products', 'Everything in Growth', 'Commission tracking', 'Advanced analytics', 'Priority support'],
    color: 'amber'
  }
];

// ── Query to get all plan tiers ───────────────────────────────
export const getList = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query('plans').collect();
    if (plans.length === 0) {
      return DEFAULT_PLANS;
    }
    return plans;
  },
});

// ── Mutation to update plan details (Restricted to Owner) ─────
export const update = mutation({
  args: {
    clerkId:       v.string(),
    id:            v.id('plans'),
    name:          v.string(),
    priceMonthly:  v.number(),
    maxBranches:   v.union(v.number(), v.null()),
    maxInstallers: v.union(v.number(), v.null()),
    maxProducts:   v.union(v.number(), v.null()),
    maxTeam:       v.union(v.number(), v.null()),
    features:      v.array(v.string()),
    color:         v.string(),
    popular:       v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkId))
      .unique();
    if (!user) throw new Error('Unauthenticated');
    const email = user.email || '';
    const isAdmin = email === 'cesaragabonthird@gmail.com' || email === 'cesaragabonthird00@gmail.com';
    if (!isAdmin) {
      throw new Error('Unauthorized: Only the platform owner can edit plans.');
    }
    
    const { id, clerkId, ...fields } = args;
    await ctx.db.patch(id, fields);
    return id;
  },
});

// ── Idempotent Mutation to seed plans table ────────────────────
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query('plans').collect();
    if (plans.length === 0) {
      for (const p of DEFAULT_PLANS) {
        await ctx.db.insert('plans', p);
      }
      return 'seeded';
    }
    return 'already_seeded';
  },
});

export const backfillMaxTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query('plans').collect();
    for (const plan of plans) {
      const defaultPlan = DEFAULT_PLANS.find(p => p.id === plan.id);
      if (defaultPlan) {
        await ctx.db.patch(plan._id, {
          maxTeam: defaultPlan.maxTeam
        });
      }
    }
    return 'backfilled';
  }
});

export const backfillStarter = mutation({
  args: {},
  handler: async (ctx) => {
    const starter = await ctx.db
      .query('plans')
      .filter(q => q.eq(q.field('id'), 'starter'))
      .unique();
    if (starter) {
      await ctx.db.patch(starter._id, {
        priceMonthly: 0,
        maxInstallers: 1,
        maxTeam: 5,
        maxProducts: 30,
        features: ['1 branch', '1 installer', '30 products', 'Jobs & invoicing', 'Basic reports'],
      });
      return 'updated';
    }
    return 'not_found';
  }
});
