import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = new Date().toISOString().slice(0, 7);

    const [jobs, products, customers, payments, deliveries] = await Promise.all([
      ctx.db.query("jobs").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("customers").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("deliveries").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
    ]);

    const filteredJobs     = branch ? jobs.filter(j     => j.branch === branch) : jobs;
    const filteredProducts = branch ? products.filter(p => p.branch === branch) : products;
    const filteredPayments = branch ? payments.filter(p => p.branch === branch) : payments;
    const filteredDeliveries = branch ? deliveries.filter(d => d.branch === branch) : deliveries;

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(); d.setDate(d.getDate() - i);
      const ds  = d.toISOString().slice(0, 10);
      const rev = filteredPayments.filter(p => p.date === ds).reduce((s, p) => s + p.amount, 0);
      const cnt = filteredJobs.filter(j => j.scheduledDate === ds).length;
      weeklyData.push({ day: d.toLocaleDateString("en", { weekday:"short" }), date:ds, revenue:rev, jobs:cnt });
    }

    return {
      todayJobs:       filteredJobs.filter(j => j.scheduledDate === today).length,
      pendingJobs:     filteredJobs.filter(j => j.status === "pending").length,
      inProgressJobs:  filteredJobs.filter(j => j.status === "in_progress").length,
      completedToday:  filteredJobs.filter(j => j.status === "completed" && j.scheduledDate === today).length,
      totalRevenue:    filteredPayments.reduce((s, p) => s + p.amount, 0),
      monthRevenue:    filteredPayments.filter(p => p.date?.startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0),
      totalProducts:   filteredProducts.length,
      lowStockItems:   filteredProducts.filter(p => p.stock <= p.reorderLevel).length,
      totalCustomers:  customers.length,
      pendingDeliveries: filteredDeliveries.filter(d => d.status === "pending").length,
      weeklyJobsData:  weeklyData,
      recentJobs:      filteredJobs.slice(-5).reverse(),
      topProducts:     filteredProducts.sort((a, b) => b.sellingPrice - a.sellingPrice).slice(0, 4),
    };
  },
});

export const getSalesSummary = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const [jobs, payments, customers, branches] = await Promise.all([
      ctx.db.query("jobs").withIndex("by_tenantId",     q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("customers").withIndex("by_tenantId",q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("branches").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
    ]);

    const fJobs     = branch ? jobs.filter(j     => j.branch === branch) : jobs;
    const fPayments = branch ? payments.filter(p => p.branch === branch) : payments;
    const completed = fJobs.filter(j => j.status === "completed");
    const totalRev  = fPayments.reduce((s, p) => s + p.amount, 0);
    const mPrefix   = new Date().toISOString().slice(0, 7);

    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      const pfx = d.toISOString().slice(0, 7);
      monthlyRevenue.push({ month: d.toLocaleString("default", { month:"short" }), revenue: fPayments.filter(p => p.date?.startsWith(pfx)).reduce((s,p)=>s+p.amount,0) });
    }

    const instMap: Record<string,{name:string,jobsCompleted:number,revenue:number}> = {};
    completed.forEach(j => {
      if (!j.assignedTo) return;
      if (!instMap[j.assignedTo]) instMap[j.assignedTo] = { name:j.assignedTo, jobsCompleted:0, revenue:0 };
      instMap[j.assignedTo].jobsCompleted++;
      instMap[j.assignedTo].revenue += j.amount || 0;
    });
    const topInstallers = Object.values(instMap).map(i => ({ ...i, avgJobValue: i.jobsCompleted ? Math.round(i.revenue / i.jobsCompleted) : 0 })).sort((a,b) => b.jobsCompleted - a.jobsCompleted).slice(0, 5);

    const typeMap: Record<string,{type:string,count:number,revenue:number}> = {};
    fJobs.forEach(j => { if (!j.type) return; if (!typeMap[j.type]) typeMap[j.type]={type:j.type,count:0,revenue:0}; typeMap[j.type].count++; typeMap[j.type].revenue+=j.amount||0; });
    const jobTypes = Object.values(typeMap).sort((a,b)=>b.count-a.count).slice(0,6);

    return {
      totalRevenue: totalRev,
      monthRevenue: fPayments.filter(p=>p.date?.startsWith(mPrefix)).reduce((s,p)=>s+p.amount,0),
      totalJobs: fJobs.length,
      monthJobs: fJobs.filter(j=>j._creationTime > new Date(mPrefix+"-01").getTime()).length,
      completedJobs: completed.length,
      completionRate: fJobs.length ? Math.round(completed.length / fJobs.length * 100) : 0,
      totalCustomers: customers.length,
      monthlyRevenue,
      weeklyRevenue: monthlyRevenue,
      topInstallers,
      jobTypes,
      branchSales: branches.map(b => ({
        branch:    b.name,
        revenue:   payments.filter(p=>p.branch===b.name).reduce((s,p)=>s+p.amount,0),
        jobs:      jobs.filter(j=>j.branch===b.name).length,
        customers: customers.length,
      })),
    };
  },
});
