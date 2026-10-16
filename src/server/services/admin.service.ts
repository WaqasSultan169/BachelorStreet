import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import {
  getBranchModel,
  getCategoryModel,
  getDeliveryZoneModel,
  getOrderModel,
  getProductModel,
  getPromotionModel,
  getStoreSettingsModel,
  getUserModel,
  type UserShape,
} from "@/server/db/models";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { ORDER_STATUSES, type OrderStatus, type Role } from "@/lib/constants";
import { recordAuditEvent } from "@/server/services/audit.service";
import { env } from "@/lib/env";
import type { LeanOrder, OrderActor, OrderDto } from "@/server/services/order.service";
import { toAdminOrderDto } from "@/server/services/order.service";

export type AdminRange = "7d" | "30d" | "90d";

function rangeStart(range: AdminRange, now = new Date()): Date {
  const days = Number.parseInt(range, 10);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Builds an ascending list of `YYYY-MM-DD` keys covering the selected range. */
function buildDailyDates(start: Date, days: number): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export async function getAdminOverview(range: AdminRange = "30d") {
  await connectDb();
  const Order = getOrderModel();
  const User = getUserModel();
  const Product = getProductModel();
  const days = Number.parseInt(range, 10);
  const start = rangeStart(range);
  const match = { placedAt: { $gte: start } };
  const [
    statusCounts,
    paidRevenue,
    trendRows,
    topItems,
    recentOrders,
    customerGrowthRows,
    liveCounts,
    deliveryCounts,
    completionAgg,
  ] = await Promise.all([
    Order.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: null; revenue: number; paidOrders: number }>([
      { $match: { ...match, "payment.status": "paid" } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          paidOrders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate<{
      _id: string;
      orders: number;
      paidOrders: number;
      unpaidOrders: number;
      revenue: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$placedAt",
              timezone: "UTC",
            },
          },
          orders: { $sum: 1 },
          paidOrders: {
            $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, 1, 0] },
          },
          unpaidOrders: {
            $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, 0, 1] },
          },
          revenue: {
            $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$total", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate<{ _id: string; name: string; quantity: number; revenue: number }>([
      { $match: { ...match, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { quantity: -1, revenue: -1 } },
      { $limit: 8 },
    ]),
    Order.find(match).sort({ placedAt: -1 }).limit(10).lean<LeanOrder[]>(),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Live operational backlog (not limited to the selected range).
    Promise.all([
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "confirmed" }),
      Order.countDocuments({ status: "preparing" }),
      Order.countDocuments({ status: "ready_for_pickup" }),
      Order.countDocuments({ status: "out_for_delivery", "delivery.type": "delivery" }),
    ]),
    // Delivery performance within the selected range.
    Promise.all([
      Order.countDocuments({
        ...match,
        "delivery.type": "delivery",
        "delivery.deliveryBoy": { $ne: null },
        status: { $in: ["confirmed", "preparing", "out_for_delivery"] },
      }),
      Order.countDocuments({
        ...match,
        "delivery.type": "delivery",
        status: "out_for_delivery",
      }),
      Order.countDocuments({
        ...match,
        "delivery.type": "delivery",
        status: "delivered",
      }),
      Order.countDocuments({
        ...match,
        "delivery.type": "delivery",
        status: { $in: ["pending", "confirmed", "preparing"] },
        $or: [
          { "delivery.deliveryBoy": { $exists: false } },
          { "delivery.deliveryBoy": null },
        ],
      }),
    ]),
    // Average placedAt -> delivered transition time, only for orders with a
    // recorded "delivered" status-history entry.
    Order.aggregate<{ _id: null; averageMs: number; completed: number }>([
      { $match: { ...match, "delivery.type": "delivery", status: "delivered" } },
      {
        $project: {
          placedAt: 1,
          deliveredAt: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$statusHistory",
                      as: "entry",
                      cond: { $eq: ["$$entry.status", "delivered"] },
                    },
                  },
                  as: "entry",
                  in: "$$entry.changedAt",
                },
              },
              -1,
            ],
          },
        },
      },
      { $match: { deliveredAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          averageMs: { $avg: { $subtract: ["$deliveredAt", "$placedAt"] } },
          completed: { $sum: 1 },
        },
      },
    ]),
  ]);

  const [totalCustomers, activeProducts, activePromotions, demoOrders, demoCustomers] =
    await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({ isActive: true, isAvailable: true }),
      getPromotionModel().countDocuments({ isActive: true }),
      Order.countDocuments({ isDemo: true }),
      User.countDocuments({ isDemo: true }),
    ]);

  const byStatus = new Map(statusCounts.map((entry) => [entry._id, entry.count]));
  const revenue = paidRevenue[0];
  const dates = buildDailyDates(start, days);
  const trendByDate = new Map(trendRows.map((row) => [row._id, row]));
  const growthByDate = new Map(customerGrowthRows.map((row) => [row._id, row]));
  const trend = dates.map((date) => {
    const row = trendByDate.get(date);
    return {
      date,
      orders: row?.orders ?? 0,
      paidOrders: row?.paidOrders ?? 0,
      unpaidOrders: row?.unpaidOrders ?? 0,
      revenue: row?.revenue ?? 0,
    };
  });
  const customerGrowth = dates.map((date) => ({
    date,
    count: growthByDate.get(date)?.count ?? 0,
  }));
  const [pendingLive, confirmedLive, preparingLive, readyLive, activeDeliveriesLive] = liveCounts;
  const [assignedDeliveries, activeDeliveries, completedDeliveries, unassignedDeliveries] =
    deliveryCounts;
  const rangeOrders = statusCounts.reduce((sum, entry) => sum + entry.count, 0);
  const completion = completionAgg[0];
  const orders = recentOrders.map((order) => toAdminOrderDto(order));

  return {
    range,
    rangeStart: start.toISOString(),
    currency: "PKR",
    revenue: revenue?.revenue ?? 0,
    paidOrders: revenue?.paidOrders ?? 0,
    unpaidOrderCount: await Order.countDocuments({
      ...match,
      "payment.status": { $ne: "paid" },
    }),
    totalCustomers,
    activeProducts,
    activePromotions,
    demo: { orders: demoOrders, customers: demoCustomers },
    rangeOrders,
    counts: {
      pending: byStatus.get("pending") ?? 0,
      confirmed: byStatus.get("confirmed") ?? 0,
      preparing: byStatus.get("preparing") ?? 0,
      activeDeliveries: byStatus.get("out_for_delivery") ?? 0,
      ready: byStatus.get("ready_for_pickup") ?? 0,
      completed: byStatus.get("delivered") ?? 0,
      cancelled: byStatus.get("cancelled") ?? 0,
    },
    live: {
      pending: pendingLive,
      confirmed: confirmedLive,
      preparing: preparingLive,
      ready: readyLive,
      activeDeliveries: activeDeliveriesLive,
    },
    statusDistribution: ORDER_STATUSES.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    })),
    deliveryStats: {
      assigned: assignedDeliveries,
      active: activeDeliveries,
      completed: completedDeliveries,
      unassigned: unassignedDeliveries,
      averageCompletionMinutes:
        completion && completion.averageMs > 0
          ? Math.round(completion.averageMs / 60000)
          : null,
    },
    trend,
    customerGrowth,
    topItems,
    recentOrders: orders,
  };
}

export type AdminOrderSearch = {
  q?: string;
  status?: string;
  fulfillment?: "pickup" | "delivery";
  page?: number;
  pageSize?: number;
};

export async function searchAdminOrders(params: AdminOrderSearch = {}) {
  await connectDb();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(params.pageSize ?? 20)));
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.fulfillment) filter["delivery.type"] = params.fulfillment;
  if (params.q?.trim()) {
    const safe = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(safe, "i");
    filter.$or = [
      { orderNumber: expression },
      { trackingId: expression },
      { "contact.name": expression },
      { "contact.email": expression },
      { "contact.phone": expression },
    ];
  }
  const Order = getOrderModel();
  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort({ placedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return {
    items: docs.map((doc) => toAdminOrderDto(doc)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderDetail(orderId: string, actor: OrderActor): Promise<OrderDto> {
  if (actor.role !== "admin" && actor.role !== "delivery_boy") throw new ForbiddenError();
  if (!/^[a-f\d]{24}$/i.test(orderId)) throw new NotFoundError("Order not found");
  await connectDb();
  const filter = actor.role === "admin"
    ? { _id: orderId }
    : { _id: orderId, "delivery.deliveryBoy": actor.id };
  const doc = await getOrderModel().findOne(filter).lean<LeanOrder | null>();
  if (!doc) throw new NotFoundError("Order not found");
  return toAdminOrderDto(doc);
}

export async function listAdminResources() {
  await connectDb();
  const [products, categories, branches, zones, promotions] = await Promise.all([
    getProductModel().find({}).sort({ name: 1 }).limit(200).lean(),
    getCategoryModel().find({}).sort({ sortOrder: 1, name: 1 }).lean(),
    getBranchModel().find({}).sort({ name: 1 }).lean(),
    getDeliveryZoneModel().find({}).sort({ name: 1 }).lean(),
    getPromotionModel().find({}).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return {
    products: products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      price: product.price,
      categoryId: product.category.toString(),
      categoryName: categories.find((category) => category._id.equals(product.category))?.name ?? "Uncategorized",
      isAvailable: product.isAvailable,
      isActive: product.isActive,
      stockQuantity: product.stockQuantity ?? null,
    })),
    categories: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    })),
    branches: branches.map((branch) => ({
      id: branch._id.toString(),
      name: branch.name,
      slug: branch.slug,
      address: branch.address,
      phone: branch.phone ?? undefined,
      city: branch.city,
      hours: branch.hours.map((entry) => ({
        day: entry.day,
        open: entry.open ?? undefined,
        close: entry.close ?? undefined,
        closed: Boolean(entry.closed),
      })),
      deliveryAvailable: branch.deliveryAvailable,
      pickupAvailable: branch.pickupAvailable,
      isActive: branch.isActive,
    })),
    zones: zones.map((zone) => ({
      id: zone._id.toString(),
      branchId: zone.branch.toString(),
      name: zone.name,
      areas: zone.areas,
      deliveryFee: zone.deliveryFee,
      freeAbove: zone.freeAbove ?? undefined,
      minOrder: zone.minOrder ?? undefined,
      etaMinutes: zone.etaMinutes,
      isActive: zone.isActive,
    })),
    promotions: promotions.map((promotion) => ({
      id: promotion._id.toString(),
      title: promotion.title,
      code: promotion.code ?? undefined,
      description: promotion.description ?? undefined,
      imageUrl: promotion.imageUrl ?? undefined,
      discountPercent: promotion.discountPercent ?? undefined,
      minOrder: promotion.minOrder ?? undefined,
      isBanner: promotion.isBanner,
      isActive: promotion.isActive,
      startsAt: promotion.startsAt?.toISOString(),
      endsAt: promotion.endsAt?.toISOString(),
    })),
  };
}

export async function searchAdminCustomers(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  await connectDb();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const filter: Record<string, unknown> = { role: "customer" };
  if (input.q?.trim()) {
    const safe = input.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(safe, "i");
    filter.$or = [{ name: expression }, { email: expression }, { phone: expression }];
  }
  const User = getUserModel();
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email phone emailVerified isActive isDemo createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<UserShape[]>(),
    User.countDocuments(filter),
  ]);
  return {
    items: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone ? `••••${user.phone.slice(-4)}` : undefined,
      emailVerified: Boolean(user.emailVerified),
      isActive: user.isActive,
      isDemo: Boolean(user.isDemo),
      createdAt: user.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function updateAdminCustomerStatus(
  actorId: string,
  customerId: string,
  isActive: boolean,
): Promise<void> {
  await connectDb();
  const User = getUserModel();
  const result = await User.updateOne(
    { _id: customerId, role: "customer" },
    { $set: { isActive }, $inc: { tokenVersion: 1 } },
  );
  if (!result.matchedCount) throw new NotFoundError("Customer not found");
  await recordAuditEvent({
    actorId,
    action: "customer.access_changed",
    targetType: "user",
    targetId: customerId,
    metadata: { isActive },
  });
}

export async function getAdminStoreSettings() {
  await connectDb();
  const settings = await getStoreSettingsModel().findOne({ key: "store" })
    .lean<{ deliveryRadiusKm: number; deliveryEnabled: boolean } | null>();
  return settings
    ? { deliveryRadiusKm: settings.deliveryRadiusKm, deliveryEnabled: settings.deliveryEnabled }
    : { deliveryRadiusKm: env.DELIVERY_RADIUS_KM ?? 5, deliveryEnabled: true };
}

export async function saveAdminStoreSettings(
  actorId: string,
  input: { deliveryRadiusKm: number; deliveryEnabled: boolean },
): Promise<void> {
  await connectDb();
  const settings = await getStoreSettingsModel().findOneAndUpdate(
    { key: "store" },
    { $set: input },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  await recordAuditEvent({
    actorId,
    action: "store.delivery_settings_changed",
    targetType: "store_settings",
    targetId: settings._id.toString(),
    metadata: input,
  });
}

export async function listAdminStaff() {
  await connectDb();
  const staff = await getUserModel()
    .find({ role: { $in: ["admin", "delivery_boy"] } })
    .select("name email phone role isActive emailNotificationConsent phoneNotificationConsent")
    .sort({ role: 1, name: 1 })
    .limit(200)
    .lean();
  return staff.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    isActive: user.isActive,
    emailNotificationConsent: Boolean(user.emailNotificationConsent),
    phoneNotificationConsent: Boolean(user.phoneNotificationConsent),
  }));
}

export async function updateAdminProduct(
  actorId: string,
  input: {
    id: string;
    price: number;
    stockQuantity: number | null;
    isAvailable: boolean;
    isActive: boolean;
  },
): Promise<void> {
  await connectDb();
  const Product = getProductModel();
  const previous = await Product.findById(input.id)
    .select("price stockQuantity isAvailable isActive")
    .lean();
  if (!previous) throw new NotFoundError("Product not found");
  await Product.updateOne(
    { _id: input.id },
    {
      $set: {
        price: input.price,
        stockQuantity: input.stockQuantity,
        isAvailable: input.isAvailable,
        isActive: input.isActive,
      },
    },
  );
  await recordAuditEvent({
    actorId,
    action: "product.updated",
    targetType: "product",
    targetId: input.id,
    metadata: {
      before: {
        price: previous.price,
        stockQuantity: previous.stockQuantity ?? null,
        isAvailable: previous.isAvailable,
        isActive: previous.isActive,
      },
      after: {
        price: input.price,
        stockQuantity: input.stockQuantity,
        isAvailable: input.isAvailable,
        isActive: input.isActive,
      },
    },
  });
}

export async function createAdminProduct(
  actorId: string,
  input: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    categoryId: string;
    stockQuantity: number | null;
  },
): Promise<void> {
  await connectDb();
  const [existingSlug, category] = await Promise.all([
    getProductModel().exists({ slug: input.slug }),
    getCategoryModel().findOne({ _id: input.categoryId, isActive: true }).select("_id").lean(),
  ]);
  if (existingSlug) throw new ConflictError("A product with that slug already exists.");
  if (!category) throw new NotFoundError("Active category not found.");
  const product = await getProductModel().create({
    name: input.name,
    slug: input.slug,
    description: input.description,
    price: input.price,
    category: category._id,
    stockQuantity: input.stockQuantity,
    isActive: true,
    isAvailable: true,
  });
  await recordAuditEvent({
    actorId,
    action: "product.created",
    targetType: "product",
    targetId: product._id.toString(),
    metadata: { name: input.name, slug: input.slug, price: input.price },
  });
}

export async function createAdminCategory(
  actorId: string,
  input: { name: string; slug: string; description?: string },
): Promise<void> {
  await connectDb();
  const Category = getCategoryModel();
  if (await Category.exists({ $or: [{ name: input.name }, { slug: input.slug }] })) {
    throw new ConflictError("A category with that name or slug already exists.");
  }
  const category = await Category.create({ ...input, isActive: true });
  await recordAuditEvent({
    actorId,
    action: "category.created",
    targetType: "category",
    targetId: category._id.toString(),
    metadata: { name: input.name, slug: input.slug },
  });
}

export async function updateAdminCategory(
  actorId: string,
  id: string,
  isActive: boolean,
): Promise<void> {
  await connectDb();
  const result = await getCategoryModel().updateOne({ _id: id }, { $set: { isActive } });
  if (!result.matchedCount) throw new NotFoundError("Category not found");
  await recordAuditEvent({
    actorId,
    action: "category.visibility_changed",
    targetType: "category",
    targetId: id,
    metadata: { isActive },
  });
}

export async function updateAdminBranch(
  actorId: string,
  input: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    city: string;
    isActive: boolean;
    deliveryAvailable: boolean;
    pickupAvailable: boolean;
    hours: { day: string; open?: string; close?: string; closed: boolean }[];
  },
): Promise<void> {
  await connectDb();
  const { id, ...fields } = input;
  const result = await getBranchModel().updateOne(
    { _id: id },
    { $set: fields },
  );
  if (!result.matchedCount) throw new NotFoundError("Branch not found");
  await recordAuditEvent({
    actorId,
    action: "branch.updated",
    targetType: "branch",
    targetId: id,
    metadata: { name: input.name, city: input.city, isActive: input.isActive },
  });
}

export async function createAdminBranch(
  actorId: string,
  input: { slug: string; name: string; address: string; phone?: string; city: string },
): Promise<void> {
  await connectDb();
  if (await getBranchModel().exists({ slug: input.slug })) {
    throw new ConflictError("A branch with that slug already exists.");
  }
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const branch = await getBranchModel().create({
    ...input,
    hours: days.map((day) => ({ day, closed: true })),
    deliveryAvailable: false,
    pickupAvailable: false,
    isActive: false,
  });
  await recordAuditEvent({
    actorId,
    action: "branch.created",
    targetType: "branch",
    targetId: branch._id.toString(),
    metadata: { name: input.name, slug: input.slug },
  });
}

export async function updateAdminZone(
  actorId: string,
  input: {
    id: string;
    name: string;
    areas: string[];
    deliveryFee: number;
    freeAbove?: number;
    minOrder?: number;
    etaMinutes: number;
    isActive: boolean;
  },
): Promise<void> {
  await connectDb();
  const { id, ...fields } = input;
  const $set: Record<string, unknown> = {
    name: fields.name,
    areas: fields.areas,
    deliveryFee: fields.deliveryFee,
    etaMinutes: fields.etaMinutes,
    isActive: fields.isActive,
  };
  const $unset: Record<string, 1> = {};
  if (fields.freeAbove === undefined) $unset.freeAbove = 1;
  else $set.freeAbove = fields.freeAbove;
  if (fields.minOrder === undefined) $unset.minOrder = 1;
  else $set.minOrder = fields.minOrder;
  const result = await getDeliveryZoneModel().updateOne(
    { _id: id },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
  );
  if (!result.matchedCount) throw new NotFoundError("Delivery zone not found");
  await recordAuditEvent({
    actorId,
    action: "delivery_zone.updated",
    targetType: "delivery_zone",
    targetId: id,
    metadata: {
      areas: input.areas,
      deliveryFee: input.deliveryFee,
      freeAbove: input.freeAbove,
      minOrder: input.minOrder,
      etaMinutes: input.etaMinutes,
      isActive: input.isActive,
    },
  });
}

export async function createAdminZone(
  actorId: string,
  input: {
    branchId: string;
    name: string;
    areas: string[];
    deliveryFee: number;
    freeAbove?: number;
    minOrder?: number;
    etaMinutes: number;
  },
): Promise<void> {
  await connectDb();
  const branch = await getBranchModel().findById(input.branchId).select("_id").lean();
  if (!branch) throw new NotFoundError("Branch not found.");
  const { branchId, ...fields } = input;
  const zone = await getDeliveryZoneModel().create({
    ...fields,
    branch: new Types.ObjectId(branchId),
    isActive: false,
  });
  await recordAuditEvent({
    actorId,
    action: "delivery_zone.created",
    targetType: "delivery_zone",
    targetId: zone._id.toString(),
    metadata: { branchId, name: input.name, areas: input.areas },
  });
}

export async function saveAdminPromotion(
  actorId: string,
  input: {
    id?: string;
    title: string;
    code?: string;
    description?: string;
    imageUrl?: string;
    discountPercent?: number;
    minOrder?: number;
    startsAt?: string;
    endsAt?: string;
    isBanner: boolean;
    isActive: boolean;
  },
): Promise<void> {
  await connectDb();
  const Promotion = getPromotionModel();
  if (input.code && !input.discountPercent) {
    throw new ConflictError("A discount code requires a positive discount percentage.");
  }
  if (input.code && await Promotion.exists({
    code: input.code,
    ...(input.id ? { _id: { $ne: input.id } } : {}),
  })) {
    throw new ConflictError("That promotion code is already in use.");
  }
  let createdPromotion = false;
  const { id, ...rest } = input;
  const fields = {
    ...rest,
    code: rest.code?.trim().toUpperCase() || undefined,
    imageUrl: rest.imageUrl || undefined,
    description: rest.description || undefined,
  };
  if (id) {
    const $set: Record<string, unknown> = {
      title: fields.title,
      isBanner: fields.isBanner,
      isActive: fields.isActive,
    };
    const $unset: Record<string, 1> = {};
    const optionalFields = [
      "code",
      "description",
      "imageUrl",
      "discountPercent",
      "minOrder",
      "startsAt",
      "endsAt",
    ] as const;
    for (const key of optionalFields) {
      const value = fields[key];
      if (value === undefined || value === "") $unset[key] = 1;
      else $set[key] = value;
    }
    const result = await Promotion.updateOne(
      { _id: id },
      { $set, $unset },
    );
    if (!result.matchedCount) throw new NotFoundError("Promotion not found");
  } else {
    const created = await Promotion.create(fields);
    input.id = created._id.toString();
    createdPromotion = true;
  }
  await recordAuditEvent({
    actorId,
    action: createdPromotion ? "promotion.created" : "promotion.saved",
    targetType: "promotion",
    targetId: input.id!,
    metadata: {
      title: input.title,
      code: fields.code,
      discountPercent: input.discountPercent,
      minOrder: input.minOrder,
      isBanner: input.isBanner,
      isActive: input.isActive,
    },
  });
}

export async function updateAdminStaff(
  actorId: string,
  input: { id: string; role: Role; isActive: boolean },
): Promise<void> {
  if (actorId === input.id && (!input.isActive || input.role !== "admin")) {
    throw new ForbiddenError("You cannot disable or demote your own administrator account.");
  }
  await connectDb();
  const User = getUserModel();
  const before = await User.findOne({ _id: input.id })
    .select("role isActive")
    .lean();
  if (!before) throw new NotFoundError("Staff account not found");
  await User.updateOne(
    { _id: input.id },
    {
      $set: { role: input.role, isActive: input.isActive },
      $inc: { tokenVersion: 1 },
    },
  );
  await recordAuditEvent({
    actorId,
    action: "staff.role_or_access_changed",
    targetType: "user",
    targetId: input.id,
    metadata: {
      oldRole: before.role,
      newRole: input.role,
      oldIsActive: before.isActive,
      newIsActive: input.isActive,
    },
  });
}

export async function searchAdminStaff(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  await connectDb();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const filter: Record<string, unknown> = {};
  if (input.q?.trim()) {
    const safe = input.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(safe, "i");
    filter.$or = [{ name: expression }, { email: expression }, { phone: expression }];
  }
  const User = getUserModel();
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email phone role isActive emailNotificationConsent phoneNotificationConsent")
      .sort({ role: 1, name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);
  return {
    items: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      role: user.role,
      isActive: user.isActive,
      emailNotificationConsent: Boolean(user.emailNotificationConsent),
      phoneNotificationConsent: Boolean(user.phoneNotificationConsent),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
