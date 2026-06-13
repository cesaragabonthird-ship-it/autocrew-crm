import { DatabaseReader } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function checkPlanLimit(
  db: DatabaseReader,
  tenantId: Id<"tenants">,
  resourceType: "branches" | "installers" | "products" | "team"
) {
  const tenant = await db.get(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  // Fetch the plan configuration from the database
  const planConfig = await db
    .query("plans")
    .withIndex("by_planId", q => q.eq("id", tenant.plan))
    .unique();

  if (resourceType === "branches") {
    const limit = planConfig?.maxBranches !== undefined ? planConfig.maxBranches : (tenant.plan === 'starter' ? 1 : tenant.plan === 'growth' ? 3 : null);
    if (limit === null) return; // Unlimited
    const count = (
      await db
        .query("branches")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect()
    ).length;
    if (count >= limit) {
      throw new Error(`Plan limit reached: You have reached the maximum of ${limit} branch(es) allowed under your "${planConfig?.name || tenant.plan}" plan. Please upgrade your subscription to add more branches.`);
    }
  }

  if (resourceType === "installers") {
    const limit = planConfig?.maxInstallers !== undefined ? planConfig.maxInstallers : (tenant.plan === 'starter' ? 3 : tenant.plan === 'growth' ? 15 : null);
    if (limit === null) return; // Unlimited
    const count = (
      await db
        .query("users")
        .withIndex("by_role", q => q.eq("tenantId", tenantId).eq("role", "installer"))
        .collect()
    ).filter(u => u.status !== 'deleted').length;
    if (count >= limit) {
      throw new Error(`Plan limit reached: You have reached the maximum of ${limit} installer(s) allowed under your "${planConfig?.name || tenant.plan}" plan. Please upgrade your subscription to add more installers.`);
    }
  }

  if (resourceType === "products") {
    const limit = planConfig?.maxProducts !== undefined ? planConfig.maxProducts : (tenant.plan === 'starter' ? 100 : tenant.plan === 'growth' ? 500 : null);
    if (limit === null) return; // Unlimited
    const count = (
      await db
        .query("products")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect()
    ).length;
    if (count >= limit) {
      throw new Error(`Plan limit reached: You have reached the maximum of ${limit} product SKU(s) allowed under your "${planConfig?.name || tenant.plan}" plan. Please upgrade your subscription to add more products.`);
    }
  }

  if (resourceType === "team") {
    // Check total team size (excluding deleted status)
    const limit = planConfig?.maxTeam !== undefined ? planConfig.maxTeam : (tenant.plan === 'starter' ? 10 : tenant.plan === 'growth' ? 30 : null);
    if (limit === null) return; // Unlimited
    const count = (
      await db
        .query("users")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect()
    ).filter(u => u.status !== 'deleted').length;
    if (count >= limit) {
      throw new Error(`Plan limit reached: You have reached the maximum of ${limit} team members allowed under your "${planConfig?.name || tenant.plan}" plan. Please upgrade your subscription to add more team members.`);
    }
  }
}
