import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

const JOB_ARGS = {
  tenantId:        v.id("tenants"),
  jobNumber:       v.string(),
  customerId:      v.optional(v.id("customers")),
  customer:        v.string(),
  phone:           v.optional(v.string()),
  vehicle:         v.optional(v.string()),
  vehiclePlate:    v.optional(v.string()),
  type:            v.string(),
  description:     v.optional(v.string()),
  status:          v.string(),
  assignedTo:      v.optional(v.string()),
  assignedClerkId: v.optional(v.string()), // Changed from assignedUid
  branch:          v.string(),
  scheduledDate:   v.optional(v.string()),
  startTime:       v.optional(v.string()),
  endTime:         v.optional(v.string()),
  address:         v.optional(v.string()),
  parts:           v.array(v.object({ name:v.string(), qty:v.number(), price:v.number(), sku:v.optional(v.string()), checked:v.optional(v.boolean()) })),
  checklist:       v.optional(v.array(v.object({ id:v.string(), label:v.string(), done:v.boolean() }))),
  labor:           v.number(),
  amount:          v.number(),
  notes:           v.optional(v.string()),
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
  args: { tenantId: v.id("tenants"), assignedClerkId: v.string() }, // Changed from assignedUid
  handler: async (ctx, { tenantId, assignedClerkId }) => {
    return await ctx.db.query("jobs").withIndex("by_assignedClerkId", q => q.eq("tenantId", tenantId).eq("assignedClerkId", assignedClerkId)).collect();
  },
});

export const getByDate = query({
  args: { tenantId: v.id("tenants"), date: v.string() },
  handler: async (ctx, { tenantId, date }) => {
    return await ctx.db.query("jobs").withIndex("by_scheduledDate", q => q.eq("tenantId", tenantId).eq("scheduledDate", date)).collect();
  },
});

function parseVehicleString(vehicleStr?: string) {
  if (!vehicleStr) return null;
  const str = vehicleStr.trim();
  if (!str) return null;

  let year = new Date().getFullYear();
  let make = "Other";
  let model = str;

  // Extract year
  const yearMatch = str.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[0], 10);
  }

  // Remove the year from the remaining string to parse make and model
  let cleaned = str.replace(/\b(19\d\d|20\d\d)\b/g, "").trim();

  // Extract make
  const CAR_MAKES = [
    'Toyota','Honda','Mitsubishi','Nissan','Ford','Chevrolet',
    'Hyundai','Kia','Suzuki','Isuzu','Mazda','Subaru',
    'BMW','Mercedes-Benz','Audi','Volkswagen','Lexus',
    'Land Rover','Jeep','RAM','Other'
  ];

  for (const possibleMake of CAR_MAKES) {
    if (possibleMake === "Other") continue;
    const regex = new RegExp(`\\b${possibleMake}\\b`, "i");
    if (regex.test(cleaned)) {
      make = possibleMake;
      cleaned = cleaned.replace(regex, "").replace(/\s+/g, " ").trim();
      break;
    }
  }

  model = cleaned || "Unknown";

  return { make, model, year };
}

export const create = mutation({
  args: JOB_ARGS,
  handler: async (ctx, args) => {
    let customerId = args.customerId;
    const tenantId = args.tenantId;

    if (!customerId) {
      const customers = await ctx.db.query("customers")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect();

      const cleanedInputPhone = args.phone ? args.phone.replace(/\D/g, "") : "";
      let matchedCustomer = null;

      if (cleanedInputPhone) {
        matchedCustomer = customers.find(c => {
          const cPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
          return cPhone && (cPhone === cleanedInputPhone || cPhone.endsWith(cleanedInputPhone) || cleanedInputPhone.endsWith(cPhone));
        });
      }

      if (!matchedCustomer) {
        const inputName = args.customer.trim().toLowerCase();
        matchedCustomer = customers.find(c => c.name.trim().toLowerCase() === inputName);
      }

      if (matchedCustomer) {
        customerId = matchedCustomer._id;
        const parsedVeh = parseVehicleString(args.vehicle);
        if (parsedVeh) {
          const vehiclePlateClean = args.vehiclePlate ? args.vehiclePlate.trim().toLowerCase() : "";
          const hasVehicle = matchedCustomer.vehicles.some(v => {
            if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
            return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                   v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                   v.year === parsedVeh.year;
          });

          if (!hasVehicle) {
            const updatedVehicles = [
              ...matchedCustomer.vehicles,
              {
                make: parsedVeh.make,
                model: parsedVeh.model,
                year: parsedVeh.year,
                plate: args.vehiclePlate || undefined,
              }
            ];
            await ctx.db.patch(matchedCustomer._id, { vehicles: updatedVehicles });
          }
        }
      } else {
        const parsedVeh = parseVehicleString(args.vehicle);
        const newVehicles = parsedVeh ? [{
          make: parsedVeh.make,
          model: parsedVeh.model,
          year: parsedVeh.year,
          plate: args.vehiclePlate || undefined,
        }] : [];

        customerId = await ctx.db.insert("customers", {
          tenantId,
          name: args.customer,
          phone: args.phone || "—",
          vehicles: newVehicles,
          jobsCount: 0,
          totalSpent: 0,
        });
      }
    } else {
      const customer = await ctx.db.get(customerId);
      if (customer) {
        const parsedVeh = parseVehicleString(args.vehicle);
        if (parsedVeh) {
          const vehiclePlateClean = args.vehiclePlate ? args.vehiclePlate.trim().toLowerCase() : "";
          const hasVehicle = customer.vehicles.some(v => {
            if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
            return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                   v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                   v.year === parsedVeh.year;
          });

          if (!hasVehicle) {
            const updatedVehicles = [
              ...customer.vehicles,
              {
                make: parsedVeh.make,
                model: parsedVeh.model,
                year: parsedVeh.year,
                plate: args.vehiclePlate || undefined,
              }
            ];
            await ctx.db.patch(customer._id, { vehicles: updatedVehicles });
          }
        }
      }
    }

    const jobPayload = { ...args, customerId };
    const jobId = await ctx.db.insert("jobs", jobPayload);

    if (args.status === "completed") {
      const customer = await ctx.db.get(customerId);
      if (customer) {
        await ctx.db.patch(customerId, {
          jobsCount: (customer.jobsCount || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + (args.amount || 0),
          lastVisit: new Date().toISOString().slice(0, 10),
        });
      }
    }

    return jobId;
  },
});

export const update = mutation({
  args: { id: v.id("jobs"), ...Object.fromEntries(Object.entries(JOB_ARGS).filter(([k]) => k !== "tenantId").map(([k, v]) => [k, v])) },
  handler: async (ctx, { id, ...fields }) => {
    const job = await ctx.db.get(id);
    if (!job) throw new Error("Job not found");

    const fld = fields as any;
    const tenantId = job.tenantId;
    let customerId = fld.customerId !== undefined ? fld.customerId : job.customerId;
    const customerName = fld.customer !== undefined ? fld.customer : job.customer;
    const customerPhone = fld.phone !== undefined ? fld.phone : job.phone;
    const vehicle = fld.vehicle !== undefined ? fld.vehicle : job.vehicle;
    const vehiclePlate = fld.vehiclePlate !== undefined ? fld.vehiclePlate : job.vehiclePlate;

    if (!customerId || (fld.customer !== undefined && fld.customer !== job.customer) || (fld.phone !== undefined && fld.phone !== job.phone)) {
      const customers = await ctx.db.query("customers")
        .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
        .collect();

      const cleanedInputPhone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
      let matchedCustomer = null;

      if (cleanedInputPhone) {
        matchedCustomer = customers.find(c => {
          const cPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
          return cPhone && (cPhone === cleanedInputPhone || cPhone.endsWith(cleanedInputPhone) || cleanedInputPhone.endsWith(cPhone));
        });
      }

      if (!matchedCustomer && customerName) {
        const inputName = customerName.trim().toLowerCase();
        matchedCustomer = customers.find(c => c.name.trim().toLowerCase() === inputName);
      }

      if (matchedCustomer) {
        customerId = matchedCustomer._id;
        const parsedVeh = parseVehicleString(vehicle);
        if (parsedVeh) {
          const vehiclePlateClean = vehiclePlate ? vehiclePlate.trim().toLowerCase() : "";
          const hasVehicle = matchedCustomer.vehicles.some(v => {
            if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
            return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                   v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                   v.year === parsedVeh.year;
          });

          if (!hasVehicle) {
            const updatedVehicles = [
              ...matchedCustomer.vehicles,
              {
                make: parsedVeh.make,
                model: parsedVeh.model,
                year: parsedVeh.year,
                plate: vehiclePlate || undefined,
              }
            ];
            await ctx.db.patch(matchedCustomer._id, { vehicles: updatedVehicles });
          }
        }
      } else if (customerName) {
        const parsedVeh = parseVehicleString(vehicle);
        const newVehicles = parsedVeh ? [{
          make: parsedVeh.make,
          model: parsedVeh.model,
          year: parsedVeh.year,
          plate: vehiclePlate || undefined,
        }] : [];

        customerId = await ctx.db.insert("customers", {
          tenantId,
          name: customerName,
          phone: customerPhone || "—",
          vehicles: newVehicles,
          jobsCount: 0,
          totalSpent: 0,
        });
      }
    } else if (customerId) {
      const customer = (await ctx.db.get(customerId)) as Doc<"customers"> | null;
      if (customer) {
        const parsedVeh = parseVehicleString(vehicle);
        if (parsedVeh) {
          const vehiclePlateClean = vehiclePlate ? vehiclePlate.trim().toLowerCase() : "";
          const hasVehicle = customer.vehicles.some(v => {
            if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
            return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                   v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                   v.year === parsedVeh.year;
          });

          if (!hasVehicle) {
            const updatedVehicles = [
              ...customer.vehicles,
              {
                make: parsedVeh.make,
                model: parsedVeh.model,
                year: parsedVeh.year,
                plate: vehiclePlate || undefined,
              }
            ];
            await ctx.db.patch(customer._id, { vehicles: updatedVehicles });
          }
        }
      }
    }

    const updatedFields = { ...fields, customerId };
    await ctx.db.patch(id, updatedFields);

    const wasCompleted = job.status === "completed";
    const isCompletedNow = fld.status === "completed";
    if (isCompletedNow && !wasCompleted && customerId) {
      const customer = (await ctx.db.get(customerId)) as Doc<"customers"> | null;
      if (customer) {
        await ctx.db.patch(customerId, {
          jobsCount: (customer.jobsCount || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + (fld.amount !== undefined ? fld.amount : job.amount || 0),
          lastVisit: new Date().toISOString().slice(0, 10),
        });
      }
    }

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
    const wasCompleted = job.status === "completed";

    let customerId = job.customerId;
    if (status === "completed" && !wasCompleted && !customerId) {
      const customers = await ctx.db.query("customers")
        .withIndex("by_tenantId", q => q.eq("tenantId", job.tenantId))
        .collect();

      const cleanedInputPhone = job.phone ? job.phone.replace(/\D/g, "") : "";
      let matchedCustomer = null;

      if (cleanedInputPhone) {
        matchedCustomer = customers.find(c => {
          const cPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
          return cPhone && (cPhone === cleanedInputPhone || cPhone.endsWith(cleanedInputPhone) || cleanedInputPhone.endsWith(cPhone));
        });
      }

      if (!matchedCustomer && job.customer) {
        const inputName = job.customer.trim().toLowerCase();
        matchedCustomer = customers.find(c => c.name.trim().toLowerCase() === inputName);
      }

      if (matchedCustomer) {
        customerId = matchedCustomer._id;
        const parsedVeh = parseVehicleString(job.vehicle);
        if (parsedVeh) {
          const vehiclePlateClean = job.vehiclePlate ? job.vehiclePlate.trim().toLowerCase() : "";
          const hasVehicle = matchedCustomer.vehicles.some(v => {
            if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
            return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                   v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                   v.year === parsedVeh.year;
          });

          if (!hasVehicle) {
            const updatedVehicles = [
              ...matchedCustomer.vehicles,
              {
                make: parsedVeh.make,
                model: parsedVeh.model,
                year: parsedVeh.year,
                plate: job.vehiclePlate || undefined,
              }
            ];
            await ctx.db.patch(matchedCustomer._id, { vehicles: updatedVehicles });
          }
        }
      } else if (job.customer) {
        const parsedVeh = parseVehicleString(job.vehicle);
        const newVehicles = parsedVeh ? [{
          make: parsedVeh.make,
          model: parsedVeh.model,
          year: parsedVeh.year,
          plate: job.vehiclePlate || undefined,
        }] : [];

        customerId = await ctx.db.insert("customers", {
          tenantId: job.tenantId,
          name: job.customer,
          phone: job.phone || "—",
          vehicles: newVehicles,
          jobsCount: 0,
          totalSpent: 0,
        });
      }
    }

    await ctx.db.patch(id, {
      status,
      ...(completionNotes ? { completionNotes } : {}),
      ...(customerId ? { customerId } : {})
    });

    // If completed — deduct stock for parts and update customer stats
    if (status === "completed" && !wasCompleted) {
      if (job.parts && Array.isArray(job.parts)) {
        for (const part of job.parts) {
          if (part.qty > 0) {
            let product = null;
            const partSku = part.sku;
            if (partSku && partSku.trim() !== "") {
              const trimmedSku = partSku.trim();
              product = await ctx.db.query("products")
                .withIndex("by_sku", q => q.eq("tenantId", job.tenantId).eq("sku", trimmedSku))
                .filter(q => q.eq(q.field("branch"), job.branch))
                .first();
              if (!product) {
                product = await ctx.db.query("products")
                  .withIndex("by_sku", q => q.eq("tenantId", job.tenantId).eq("sku", trimmedSku))
                  .first();
              }
            }
            if (!product) {
              product = await ctx.db.query("products")
                .filter(q => q.and(
                  q.eq(q.field("tenantId"), job.tenantId),
                  q.eq(q.field("name"), part.name),
                  q.eq(q.field("branch"), job.branch)
                ))
                .first();
            }
            if (!product) {
              product = await ctx.db.query("products")
                .filter(q => q.and(
                  q.eq(q.field("tenantId"), job.tenantId),
                  q.eq(q.field("name"), part.name)
                ))
                .first();
            }
            if (product) {
              await ctx.db.patch(product._id, { stock: Math.max(0, product.stock - part.qty) });
            }
          }
        }
      }

      const finalCustomerId = customerId || job.customerId;
      if (finalCustomerId) {
        const customer = await ctx.db.get(finalCustomerId);
        if (customer) {
          await ctx.db.patch(finalCustomerId, {
            jobsCount:  (customer.jobsCount || 0) + 1,
            totalSpent: (customer.totalSpent || 0) + (job.amount || 0),
            lastVisit:  new Date().toISOString().slice(0, 10),
          });
        }
      }
    }
    return id;
  },
});

export const backfillCustomers = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const jobs = await ctx.db.query("jobs")
      .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
      .collect();

    let count = 0;
    for (const job of jobs) {
      if (!job.customerId) {
        const customers = await ctx.db.query("customers")
          .withIndex("by_tenantId", q => q.eq("tenantId", tenantId))
          .collect();

        const cleanedInputPhone = job.phone ? job.phone.replace(/\D/g, "") : "";
        let matchedCustomer = null;

        if (cleanedInputPhone) {
          matchedCustomer = customers.find(c => {
            const cPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
            return cPhone && (cPhone === cleanedInputPhone || cPhone.endsWith(cleanedInputPhone) || cleanedInputPhone.endsWith(cPhone));
          });
        }

        if (!matchedCustomer && job.customer) {
          const inputName = job.customer.trim().toLowerCase();
          matchedCustomer = customers.find(c => c.name.trim().toLowerCase() === inputName);
        }

        let customerId;
        if (matchedCustomer) {
          customerId = matchedCustomer._id;
          const parsedVeh = parseVehicleString(job.vehicle);
          if (parsedVeh) {
            const vehiclePlateClean = job.vehiclePlate ? job.vehiclePlate.trim().toLowerCase() : "";
            const hasVehicle = matchedCustomer.vehicles.some(v => {
              if (vehiclePlateClean && v.plate && v.plate.trim().toLowerCase() === vehiclePlateClean) return true;
              return v.make.toLowerCase() === parsedVeh.make.toLowerCase() &&
                     v.model.toLowerCase() === parsedVeh.model.toLowerCase() &&
                     v.year === parsedVeh.year;
            });

            if (!hasVehicle) {
              const updatedVehicles = [
                ...matchedCustomer.vehicles,
                {
                  make: parsedVeh.make,
                  model: parsedVeh.model,
                  year: parsedVeh.year,
                  plate: job.vehiclePlate || undefined,
                }
              ];
              await ctx.db.patch(matchedCustomer._id, { vehicles: updatedVehicles });
            }
          }
        } else if (job.customer) {
          const parsedVeh = parseVehicleString(job.vehicle);
          const newVehicles = parsedVeh ? [{
            make: parsedVeh.make,
            model: parsedVeh.model,
            year: parsedVeh.year,
            plate: job.vehiclePlate || undefined,
          }] : [];

          customerId = await ctx.db.insert("customers", {
            tenantId,
            name: job.customer,
            phone: job.phone || "—",
            vehicles: newVehicles,
            jobsCount: 0,
            totalSpent: 0,
          });
        }

        if (customerId) {
          await ctx.db.patch(job._id, { customerId });
          count++;

          if (job.status === "completed") {
            const customer = (await ctx.db.get(customerId)) as Doc<"customers"> | null;
            if (customer) {
              await ctx.db.patch(customerId, {
                jobsCount: (customer.jobsCount || 0) + 1,
                totalSpent: (customer.totalSpent || 0) + (job.amount || 0),
                lastVisit: job.endTime ? job.endTime.slice(0, 10) : job.scheduledDate ? job.scheduledDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            }
          }
        }
      }
    }
    return { count };
  },
});

export const assign = mutation({
  args: { id: v.id("jobs"), assignedTo: v.string(), assignedClerkId: v.string() }, // Changed from assignedUid
  handler: async (ctx, { id, assignedTo, assignedClerkId }) => {
    await ctx.db.patch(id, { assignedTo, assignedClerkId, status: "assigned" });
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

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const cleanId = id.includes(":") ? id.split(":")[1] : id;
    const parsedId = ctx.db.normalizeId("jobs", cleanId);
    if (!parsedId) return null;
    return await ctx.db.get(parsedId);
  },
});

