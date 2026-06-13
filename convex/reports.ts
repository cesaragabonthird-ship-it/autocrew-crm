import { query } from "./_generated/server";
import { v } from "convex/values";

function computeTopProducts(
  products: any[],
  invoices: any[],
  jobs: any[],
  branch: string | undefined
) {
  const filteredProducts = branch ? products.filter(p => p.branch === branch) : products;
  const filteredInvoices = branch ? invoices.filter(i => i.branch === branch) : invoices;
  const filteredJobs     = branch ? jobs.filter(j     => j.branch === branch) : jobs;

  const productSales: Record<string, { name: string, category: string, sold: number, unitsSold: number, revenue: number }> = {};

  const addSale = (name: string, qty: number, price: number, productId?: string) => {
    if (!name) return;

    let category = "Parts/Service";
    const matchingProduct = products.find(p => p.name === name || (productId && String(p._id) === productId));
    if (matchingProduct) {
      category = matchingProduct.category;
    }

    if (!productSales[name]) {
      productSales[name] = {
        name,
        category,
        sold: 0,
        unitsSold: 0,
        revenue: 0
      };
    }

    const rev = qty * price;
    productSales[name].sold += qty;
    productSales[name].unitsSold += qty;
    productSales[name].revenue += rev;
  };

  // 1. Process Shop Sales (walk-in POS invoices only to avoid double counting jobs)
  for (const inv of filteredInvoices) {
    if (inv.status === "cancelled") continue;
    const isShopSale = !inv.jobId && (!inv.jobNumber || inv.invoiceNumber.startsWith("POS-"));
    if (isShopSale) {
      for (const item of inv.items || []) {
        addSale(item.desc || "", item.qty || 0, item.price || 0, item.productId);
      }
    }
  }

  // 2. Process Job Orders (all parts used in jobs, except cancelled ones)
  for (const job of filteredJobs) {
    if (job.status === "cancelled") continue;
    for (const part of job.parts || []) {
      let prodId = undefined;
      const matchingProduct = products.find(p => p.name === part.name || (part.sku && p.sku === part.sku));
      if (matchingProduct) {
        prodId = String(matchingProduct._id);
      }
      addSale(part.name || "", part.qty || 0, part.price || 0, prodId);
    }
  }

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue);

  const soldNames = new Set(topProducts.map(p => p.name));
  const unsoldProducts = filteredProducts
    .filter(p => !soldNames.has(p.name))
    .sort((a, b) => b.sellingPrice - a.sellingPrice);

  for (const p of unsoldProducts) {
    if (topProducts.length >= 5) break;
    topProducts.push({
      name: p.name,
      category: p.category,
      sold: 0,
      unitsSold: 0,
      revenue: 0
    });
  }

  return topProducts.slice(0, 5);
}

export const getDashboardStats = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = new Date().toISOString().slice(0, 7);

    const [jobs, products, customers, payments, deliveries, invoices] = await Promise.all([
      ctx.db.query("jobs").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("customers").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("deliveries").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("invoices").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
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

    const topProducts = computeTopProducts(products, invoices, jobs, branch);

    const filteredInvoices = branch ? invoices.filter(i => i.branch === branch) : invoices;
    let pendingPayments = 0;
    for (const inv of filteredInvoices) {
      if (inv.status === "cancelled" || inv.status === "paid") continue;
      
      const subtotal = (inv.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0) * (item.price || 0), 0) - (inv.discount || 0);
      const taxAmount = subtotal * ((inv.tax || 0) / 100);
      const total = subtotal + taxAmount;
      
      const unpaid = total - (inv.amountPaid || 0);
      if (unpaid > 0) {
        pendingPayments += unpaid;
      }
    }

    return {
      todayJobs:       filteredJobs.filter(j => j.scheduledDate === today).length,
      pendingJobs:     filteredJobs.filter(j => j.status === "pending").length,
      inProgressJobs:  filteredJobs.filter(j => j.status === "in_progress").length,
      completedToday:  filteredJobs.filter(j => j.status === "completed" && j.scheduledDate === today).length,
      totalRevenue:    filteredPayments.reduce((s, p) => s + p.amount, 0),
      monthRevenue:    filteredPayments.filter(p => p.date?.startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0),
      pendingPayments,
      totalProducts:   filteredProducts.length,
      lowStockItems:   filteredProducts.filter(p => p.stock <= p.reorderLevel).length,
      totalCustomers:  customers.length,
      pendingDeliveries: filteredDeliveries.filter(d => d.status === "pending").length,
      weeklyJobsData:  weeklyData,
      recentJobs:      filteredJobs.slice(-5).reverse(),
      topProducts,
    };
  },
});

export const getSalesSummary = query({
  args: { tenantId: v.id("tenants"), branch: v.optional(v.string()) },
  handler: async (ctx, { tenantId, branch }) => {
    const [jobs, payments, customers, branches, products, invoices, employees] = await Promise.all([
      ctx.db.query("jobs").withIndex("by_tenantId",     q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("payments").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("customers").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("branches").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("products").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("invoices").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
      ctx.db.query("payrollEmployees").withIndex("by_tenantId", q => q.eq("tenantId", tenantId)).collect(),
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

    const topProducts = computeTopProducts(products, invoices, jobs, branch);

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date(monthPrefix + "-01T00:00:00.000Z").getTime();
    const newCustomersMonth = customers.filter(c => c._creationTime >= startOfMonth).length;

    // Advanced Profit calculations
    const monthlyProfit = [];
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      const pfx = d.toISOString().slice(0, 7);
      
      const monthPayments = fPayments.filter(p => p.date?.startsWith(pfx));
      const monthRev = monthPayments.reduce((s, p) => s + p.amount, 0);

      // COGS from POS Invoices
      const monthInvoices = invoices.filter(inv => 
        inv.status !== "cancelled" && 
        inv.issueDate?.startsWith(pfx) && 
        !inv.jobId && 
        (!inv.jobNumber || inv.invoiceNumber.startsWith("POS-")) &&
        (!branch || inv.branch === branch)
      );
      let cogs = 0;
      for (const inv of monthInvoices) {
        for (const item of inv.items || []) {
          const matchingProduct = products.find(p => p.name === item.desc || (item.productId && String(p._id) === item.productId));
          const unitCost = matchingProduct ? (matchingProduct.costPrice || 0) : 0;
          cogs += (item.qty || 0) * unitCost;
        }
      }

      // COGS and Commissions from Jobs completed this month
      const monthJobs = fJobs.filter(j => j.status === "completed" && j.scheduledDate?.startsWith(pfx));
      let commissions = 0;
      for (const job of monthJobs) {
        // Parts COGS
        for (const part of job.parts || []) {
          const matchingProduct = products.find(p => p.name === part.name || (part.sku && p.sku === part.sku));
          const unitCost = matchingProduct ? (matchingProduct.costPrice || 0) : 0;
          cogs += (part.qty || 0) * unitCost;
        }

        // Commission calculation
        if (job.assignedTo) {
          const emp = employees.find(e => e.name === job.assignedTo || (job.assignedClerkId && e.clerkId === job.assignedClerkId));
          if (emp && emp.commissionRate) {
            commissions += (job.labor || 0) * (emp.commissionRate / 100);
          }
        }
      }

      const netProfit = monthRev - cogs - commissions;
      const margin = monthRev > 0 ? Math.round((netProfit / monthRev) * 100) : 0;

      monthlyProfit.push({
        month: d.toLocaleString("default", { month: "short" }),
        revenue: monthRev,
        cogs: Math.round(cogs),
        commissions: Math.round(commissions),
        netProfit: Math.round(netProfit),
        margin
      });
    }

    // Branch Comparison Calculations
    const branchComparison = branches.map(b => {
      const bPayments = payments.filter(p => p.branch === b.name);
      const bJobs = jobs.filter(j => j.branch === b.name);
      const bCompleted = bJobs.filter(j => j.status === "completed");

      const monthlyRev = [];
      for (let i = 5; i >= 0; i--) {
        const d   = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
        const pfx = d.toISOString().slice(0, 7);
        const rev = bPayments.filter(p => p.date?.startsWith(pfx)).reduce((s,p) => s + p.amount, 0);
        monthlyRev.push({ month: d.toLocaleString("default", { month: "short" }), revenue: rev });
      }

      return {
        branch: b.name,
        totalRevenue: bPayments.reduce((s, p) => s + p.amount, 0),
        totalJobs: bJobs.length,
        completedJobs: bCompleted.length,
        completionRate: bJobs.length ? Math.round((bCompleted.length / bJobs.length) * 100) : 0,
        monthlyRevenue: monthlyRev,
      };
    });

    return {
      totalRevenue: totalRev,
      monthRevenue: fPayments.filter(p=>p.date?.startsWith(mPrefix)).reduce((s,p)=>s+p.amount,0),
      totalJobs: fJobs.length,
      monthJobs: fJobs.filter(j=>j._creationTime > new Date(mPrefix+"-01").getTime()).length,
      completedJobs: completed.length,
      completionRate: fJobs.length ? Math.round(completed.length / fJobs.length * 100) : 0,
      totalCustomers: customers.length,
      newCustomersMonth,
      monthlyRevenue,
      weeklyRevenue: monthlyRevenue,
      topInstallers,
      jobTypes,
      topProducts,
      monthlyProfit,
      branchComparison,
      branchSales: branches.map(b => ({
        branch:    b.name,
        revenue:   payments.filter(p=>p.branch===b.name).reduce((s,p)=>s+p.amount,0),
        jobs:      jobs.filter(j=>j.branch===b.name).length,
        customers: customers.length,
      })),
    };
  },
});
