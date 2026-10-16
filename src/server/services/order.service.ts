import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { connectDb } from "@/server/db";
import {
  getBranchModel,
  getDeliveryZoneModel,
  getOrderModel,
  getProductModel,
  getUserModel,
} from "@/server/db/models";
import type {
  OrderShape,
  OrderStatusHistoryEntry,
} from "@/server/db/models/order.model";
import { quoteCart } from "@/server/services/cart.service";
import {
  checkCoverage,
  checkCoverageByArea,
} from "@/server/services/location.service";
import { getPaymentProvider } from "@/server/services/payment";
import {
  APP,
  ORDER,
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type Role,
} from "@/lib/constants";
import { normalizePkPhone } from "@/lib/phone";
import { formatPkr } from "@/lib/utils";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { PlaceOrderInput } from "@/server/validation/order";
import { publishOrderEvent } from "@/server/services/realtime/order-events";
import { recordAuditEvent } from "@/server/services/audit.service";
import { enqueueDeliveryAssignmentNotifications } from "@/server/services/notification-jobs.service";

export type OrderOptionDto = {
  groupName: string;
  optionName: string;
  priceDelta: number;
};

export type OrderItemDto = {
  name: string;
  slug: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string;
  options: OrderOptionDto[];
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  trackingId: string;
  status: OrderStatus;
  statusLabel: string;
  statusDescription: string;
  version: number;
  updatedAt: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  contact: { name: string; email: string; phone: string };
  fulfillment: {
    type: OrderType;
    branchName?: string;
    branchAddress?: string;
    zoneName?: string;
    etaMinutes?: number;
    deliveryBoyId?: string;
    deliveryBoyName?: string;
    assignedAt?: string;
    lastLocation?: {
      coordinates: { lat: number; lng: number };
      updatedAt: string;
    };
    address?: {
      label: string;
      street?: string;
      area?: string;
      city?: string;
      instructions?: string;
      coordinates?: { lat: number; lng: number };
    };
  };
  items: OrderItemDto[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  promotionCode?: string;
  total: number;
  currency: string;
  customerNote?: string;
  placedAt: string;
  /** Marks development-only seeded demo records. */
  isDemo?: boolean;
  statusHistory: {
    eventId?: string;
    status: OrderStatus;
    statusLabel: string;
    at: string;
    note?: string;
  }[];
  fulfillmentHistory: {
    eventId: string;
    type: "assigned" | "delivery_location";
    actorId: string;
    at: string;
    deliveryBoyId?: string;
    deliveryBoyName?: string;
    coordinates?: { lat: number; lng: number };
  }[];
};
export type OrderTrackingDto = Omit<
  OrderDto,
  "contact" | "customerNote" | "fulfillmentHistory"
>;

// --- Identifier helpers ------------------------------------------------------

/** Non-guessable, URL-safe public tracking identifier. */
function generateTrackingId(): string {
  return randomBytes(ORDER.trackingIdBytes).toString("base64url");
}

function generateOrderNumber(now: Date): string {
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `${ORDER.orderNumberPrefix}-${stamp}-${suffix}`;
}

// --- Transaction helper ------------------------------------------------------

function isTransactionUnsupported(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: number; codeName?: string; message?: string };
  if (candidate.code === 20) return true; // IllegalOperation
  if (candidate.codeName === "IllegalOperation") return true;
  const message = candidate.message ?? "";
  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("Transaction support is not available") ||
    message.includes("replica set")
  );
}

/**
 * Run `fn` inside a MongoDB transaction when the deployment supports it
 * (replica set / sharded — e.g. Atlas). On a standalone server, or when the
 * driver reports transactions unavailable, fall back to running without one.
 * A duplicate-key error from inside the transaction is a real error and is
 * propagated (it is how we detect an idempotency-key collision).
 */
async function withTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  const conn = await connectDb();
  let session: ClientSession | null = null;
  try {
    session = await conn.startSession();
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      logger.warn("Transactions unavailable — continuing without one");
      return fn(null);
    }
    throw error;
  } finally {
    if (session) await session.endSession().catch(() => undefined);
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: number }).code === 11000);
}

// --- Mapping -----------------------------------------------------------------

export type LeanOrder = OrderShape & { _id: Types.ObjectId };

function toOrderDto(doc: LeanOrder): OrderDto {
  const history: OrderStatusHistoryEntry[] = doc.statusHistory ?? [];
  const status = normalizeOrderStatus(doc.status, doc.delivery.type);
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    trackingId: doc.trackingId,
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    statusDescription: ORDER_STATUS_DESCRIPTIONS[status],
    version: doc.version ?? 0,
    updatedAt: (doc.updatedAt ?? doc.placedAt ?? doc.createdAt).toISOString(),
    paymentMethod: doc.payment.method,
    paymentStatus: doc.payment.status,
    contact: {
      name: doc.contact.name,
      email: doc.contact.email,
      phone: doc.contact.phone,
    },
    fulfillment: {
      type: doc.delivery.type,
      branchName: doc.delivery.branchName ?? undefined,
      branchAddress: doc.delivery.branchAddress ?? undefined,
      zoneName: doc.delivery.zoneName ?? undefined,
      etaMinutes: doc.delivery.etaMinutes ?? undefined,
      deliveryBoyId: doc.delivery.deliveryBoy?.toString(),
      deliveryBoyName: doc.delivery.deliveryBoyName ?? undefined,
      assignedAt: doc.delivery.assignedAt?.toISOString(),
      lastLocation: doc.delivery.lastLocation
        ? {
            coordinates: doc.delivery.lastLocation.coordinates,
            updatedAt: doc.delivery.lastLocation.updatedAt.toISOString(),
          }
        : undefined,
      address: doc.delivery.address
        ? {
            label: doc.delivery.address.label,
            street: doc.delivery.address.street ?? undefined,
            area: doc.delivery.address.area ?? undefined,
            city: doc.delivery.address.city ?? undefined,
            instructions: doc.delivery.address.instructions ?? undefined,
            coordinates: doc.delivery.address.coordinates ?? undefined,
          }
        : undefined,
    },
    items: (doc.items ?? []).map((item) => ({
      name: item.name,
      slug: item.slug,
      image: item.image ?? undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      note: item.note ?? undefined,
      options: (item.options ?? []).map((option) => ({
        groupName: option.groupName,
        optionName: option.optionName,
        priceDelta: option.priceDelta,
      })),
    })),
    subtotal: doc.subtotal,
    deliveryFee: doc.deliveryFee,
    discount: doc.discount,
    promotionCode: doc.promotionCode ?? undefined,
    total: doc.total,
    currency: doc.currency,
    customerNote: doc.customerNote ?? undefined,
    placedAt: (doc.placedAt ?? doc.createdAt).toISOString(),
    isDemo: doc.isDemo ?? false,
    statusHistory: history.map((entry) => ({
      eventId: entry.eventId,
      status: normalizeOrderStatus(entry.status, doc.delivery.type),
      statusLabel:
        ORDER_STATUS_LABELS[normalizeOrderStatus(entry.status, doc.delivery.type)],
      at: entry.changedAt.toISOString(),
      note: entry.note ?? undefined,
    })),
    fulfillmentHistory: (doc.fulfillmentHistory ?? []).map((entry) => ({
      eventId: entry.eventId,
      type: entry.type,
      actorId: entry.actor.toString(),
      at: entry.at.toISOString(),
      deliveryBoyId: entry.deliveryBoy?.toString(),
      deliveryBoyName: entry.deliveryBoyName,
      coordinates: entry.coordinates,
    })),
  };
}

export function toAdminOrderDto(doc: LeanOrder): OrderDto {
  return toOrderDto(doc);
}

function normalizeOrderStatus(
  status: OrderStatus | "ready" | "out-for-delivery",
  fulfillmentType: OrderType,
): OrderStatus {
  if (status === "ready") {
    return fulfillmentType === "pickup" ? "ready_for_pickup" : "preparing";
  }
  if (status === "out-for-delivery") return "out_for_delivery";
  return status;
}

// --- Creation ----------------------------------------------------------------

type BranchLean = {
  _id: Types.ObjectId;
  name: string;
  address: string;
  isActive: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
};

/**
 * Create an order from a validated checkout payload.
 *
 * The server NEVER trusts client totals, availability or coverage: it re-reads
 * products from MongoDB, re-validates every option and quantity, re-verifies
 * delivery coverage, and recomputes the entire total. Availability of the
 * supplied `paymentMethod` is checked last so an unsupported method (e.g.
 * online, not yet integrated) is rejected.
 */
export async function createOrder(
  input: PlaceOrderInput,
  userId?: string,
): Promise<OrderDto> {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        idempotencyKey: undefined,
        userId: userId ?? null,
      }),
    )
    .digest("hex");
  const Order = getOrderModel();
  const Product = getProductModel();
  await connectDb();

  const existing = await Order.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean<LeanOrder | null>();
  if (existing) {
    if (existing.requestHash && existing.requestHash !== requestHash) {
      throw new ConflictError("This checkout request key was already used.");
    }
    return toOrderDto(existing);
  }

  // 1. Recompute the cart authoritatively from the live menu.
  const quote = await quoteCart({
    lines: input.items.map((item) => ({
      productId: item.productId,
      optionKeys: item.optionKeys,
      quantity: item.quantity,
      note: item.note,
    })),
    promotionCode: input.promotionCode,
  });

  if (quote.promotionError) throw new BadRequestError(quote.promotionError);
  const problems = quote.lines.filter((line) => !line.available);
  if (problems.length > 0) {
    throw new BadRequestError(
      problems.map((line) => `${line.name}: ${line.reason}`).join(" "),
    );
  }
  if (quote.subtotal <= 0) {
    throw new BadRequestError("Your order total is not valid.");
  }

  // 2. Resolve fulfilment (branch / delivery coverage) — server-side only.
  const branchModel = getBranchModel();
  let branchId: Types.ObjectId | undefined;
  let branchName: string | undefined;
  let branchAddress: string | undefined;
  let deliveryFee = 0;
  let deliveryZone: Types.ObjectId | undefined;
  let zoneName: string | undefined;
  let etaMinutes: number | undefined;
  let addressSnapshot:
    | {
        label: string;
        street?: string;
        area?: string;
        city?: string;
        phone?: string;
        instructions?: string;
        coordinates?: { lat: number; lng: number };
      }
    | undefined;

  if (input.fulfillment.type === "pickup") {
    const branch = await branchModel
      .findOne({
        _id: input.fulfillment.branchId,
        slug: APP.primaryBranch.slug,
      })
      .lean<BranchLean | null>();
    if (!branch || !branch.isActive || !branch.pickupAvailable) {
      throw new BadRequestError(
        "Pickup is not available from that branch. Please choose another.",
      );
    }
    branchId = branch._id;
    branchName = APP.primaryBranch.name;
    branchAddress = APP.primaryBranch.address;
  } else {
    const address = input.fulfillment.address;
    const coverage = address.coordinates
      ? await checkCoverage(address.coordinates, input.fulfillment.branchId)
      : await checkCoverageByArea();
    if (!coverage.deliverable || !coverage.branchId) {
      throw new BadRequestError(
        coverage.message || "That address is outside our delivery zone.",
      );
    }
    if (coverage.minOrder && quote.subtotal < coverage.minOrder) {
      throw new BadRequestError(
        `Minimum order for delivery is ${formatPkr(coverage.minOrder)}.`,
      );
    }
    deliveryFee =
      coverage.freeAbove && quote.subtotal >= coverage.freeAbove
        ? 0
        : (coverage.deliveryFee ?? 0);
    branchName = coverage.branchName;
    etaMinutes = coverage.etaMinutes;
    zoneName = coverage.zoneName;
    addressSnapshot = {
      label: address.label,
      street: address.street || undefined,
      area: address.area || undefined,
      city: address.city || undefined,
      phone: normalizePkPhone(input.contact.phone) ?? input.contact.phone,
      instructions: address.instructions || undefined,
      coordinates: address.coordinates,
    };

    // Resolve the responsible branch + cheapest active zone for a durable ref
    // and a frozen fee/ETA snapshot (coverage is re-verified above).
    const matchedBranch = await branchModel
      .findOne({
        _id: coverage.branchId,
        slug: APP.primaryBranch.slug,
        isActive: true,
        deliveryAvailable: true,
      })
      .lean<BranchLean | null>();
    if (!matchedBranch) {
      throw new BadRequestError(
        "Delivery is no longer available from the selected branch. Please check the location and try again.",
      );
    }
    branchId = matchedBranch._id;
    branchName = APP.primaryBranch.name;
    branchAddress = APP.primaryBranch.address;
    const zone = await getDeliveryZoneModel()
      .findOne({
        branch: matchedBranch._id,
        isActive: true,
        ...(coverage.zoneName ? { name: coverage.zoneName } : {}),
      })
      .sort({ deliveryFee: 1 })
      .lean<{ _id: Types.ObjectId; name?: string; etaMinutes?: number } | null>();
    if (zone) {
      deliveryZone = zone._id;
      zoneName = zone.name ?? zoneName;
      etaMinutes = zone.etaMinutes ?? etaMinutes;
    }
  }

  // 3. Payment method must actually be available (no online/paid until real).
  const provider = getPaymentProvider(input.paymentMethod);
  if (!provider.available) {
    throw new BadRequestError(
      `${provider.provider === "online-stub" ? "Online payment" : "That payment method"} isn't available yet. Please choose Cash on Delivery.`,
    );
  }

  const discount = quote.discount ?? 0;
  const total = quote.subtotal - discount + deliveryFee;

  const now = new Date();
  const orderNumber = generateOrderNumber(now);
  const trackingId = generateTrackingId();
  const phone = normalizePkPhone(input.contact.phone) ?? input.contact.phone;

  const doc = {
    orderNumber,
    trackingId,
    user: userId ?? null,
    contact: {
      name: input.contact.name,
      email: input.contact.email.trim().toLowerCase(),
      phone,
    },
    items: quote.lines.map((line) => ({
      product: line.productId,
      name: line.name,
      slug: line.slug,
      image: line.image,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
      note: line.note?.trim() || undefined,
      options: line.options.map((option) => ({
        groupKey: option.groupKey,
        groupName: option.groupName,
        optionKey: option.optionKey,
        optionName: option.optionName,
        priceDelta: option.priceDelta,
      })),
    })),
    subtotal: quote.subtotal,
    deliveryFee,
    discount,
    promotionCode: quote.promotionCode,
    total,
    currency: quote.currency,
    delivery: {
      type: input.fulfillment.type,
      address: addressSnapshot,
      branch: branchId,
      branchName,
      branchAddress,
      deliveryZone,
      zoneName,
      etaMinutes,
    },
    payment: {
      method: input.paymentMethod,
      status: "pending" as PaymentStatus,
      provider: provider.provider,
    },
    status: "pending" as OrderStatus,
    statusHistory: [
      {
        eventId: randomUUID(),
        status: "pending" as OrderStatus,
        changedAt: now,
        note: "Order received",
      },
    ],
    idempotencyKey: input.idempotencyKey,
    requestHash,
    customerNote: input.customerNote?.trim() || undefined,
    placedAt: now,
  };

  const reservationTotals = new Map<string, number>();
  for (const line of quote.lines) {
    if (!line.stockLimited) continue;
    reservationTotals.set(
      line.productId,
      (reservationTotals.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const untransactionalReservations: { productId: string; quantity: number }[] = [];

  // 4. A unique key closes the race between concurrent first submissions.
  try {
    const created = await withTransaction(async (session) => {
      for (const [productId, quantity] of reservationTotals) {
        const result = await Product.updateOne(
          {
            _id: new Types.ObjectId(productId),
            isActive: true,
            isAvailable: true,
            stockQuantity: { $gte: quantity },
          },
          { $inc: { stockQuantity: -quantity } },
          session ? { session } : {},
        );
        if (result.matchedCount !== 1) {
          throw new ConflictError("A product no longer has enough stock. Please review your cart.");
        }
        if (!session) untransactionalReservations.push({ productId, quantity });
      }
      const [saved] = await Order.create([doc], session ? { session } : {});
      return saved.toObject() as LeanOrder;
    });
    const placed = toOrderDto(created);
    await publishOrderEvent({
      type: "order:created",
      eventId: randomUUID(),
      version: placed.version,
      orderId: placed.id,
      trackingId: placed.trackingId,
      orderNumber: placed.orderNumber,
      status: placed.status,
      fulfillmentType: placed.fulfillment.type,
      total: placed.total,
      createdAt: placed.placedAt,
      updatedAt: placed.updatedAt,
    });
    return placed;
  } catch (error) {
    if (untransactionalReservations.length > 0) {
      await Promise.all(untransactionalReservations.map(({ productId, quantity }) =>
        Product.updateOne(
          { _id: new Types.ObjectId(productId) },
          { $inc: { stockQuantity: quantity } },
        ),
      ));
    }
    if (isDuplicateKeyError(error)) {
      // Lost an idempotency race — return the winner rather than duplicating.
      const winner = await Order.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean<LeanOrder | null>();
      if (winner) {
        if (winner.requestHash && winner.requestHash !== requestHash) {
          throw new ConflictError("This checkout request key was already used.");
        }
        return toOrderDto(winner);
      }
      throw new ConflictError("This order was already placed.");
    }
    throw error;
  }
}

// --- Reads -------------------------------------------------------------------

export async function getOrderByTrackingId(
  trackingId: string,
): Promise<OrderDto | null> {
  await connectDb();
  const Order = getOrderModel();
  const doc = await Order.findOne({ trackingId }).lean<LeanOrder | null>();
  return doc ? toOrderDto(doc) : null;
}

export async function getOrderTrackingByTrackingId(
  trackingId: string,
): Promise<OrderTrackingDto | null> {
  const order = await getOrderByTrackingId(trackingId);
  if (!order) return null;
  const {
    contact: _contact,
    customerNote: _customerNote,
    fulfillmentHistory: _fulfillmentHistory,
    ...tracking
  } = order;
  void _contact;
  void _customerNote;
  void _fulfillmentHistory;
  return tracking;
}

export async function authorizeOrderSocketAccess(
  trackingId: string,
  actor: OrderActor,
): Promise<{ orderId: string; version: number }> {
  await connectDb();
  const doc = await getOrderModel()
    .findOne({ trackingId })
    .select("_id user delivery.deliveryBoy version")
    .lean<{
      _id: Types.ObjectId;
      user?: Types.ObjectId | null;
      delivery?: { deliveryBoy?: Types.ObjectId };
      version?: number;
    } | null>();
  if (!doc) throw new NotFoundError("Order not found");

  const authorized =
    actor.role === "admin" ||
    (actor.role === "customer" && doc.user?.toString() === actor.id) ||
    (actor.role === "delivery_boy" &&
      doc.delivery?.deliveryBoy?.toString() === actor.id);
  if (!authorized) throw new ForbiddenError("You cannot track this order live.");

  return { orderId: doc._id.toString(), version: doc.version ?? 0 };
}

export async function listOrdersForUser(
  userId: string,
  limit = 50,
): Promise<OrderDto[]> {
  await connectDb();
  const Order = getOrderModel();
  const docs = await Order.find({ user: userId })
    .sort({ placedAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean<LeanOrder[]>();
  return docs.map(toOrderDto);
}

export async function listOrdersForStaff(
  actor: OrderActor,
  limit = 100,
): Promise<OrderDto[]> {
  if (actor.role !== "admin" && actor.role !== "delivery_boy") {
    throw new ForbiddenError();
  }
  await connectDb();
  const Order = getOrderModel();
  const docs = await Order.find(
    actor.role === "admin" ? {} : { "delivery.deliveryBoy": actor.id },
  )
    .sort({ placedAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean<LeanOrder[]>();
  return docs.map(toOrderDto);
}

export async function getDeliveryDashboardData(userId: string): Promise<{
  orders: OrderDto[];
  completedToday: number;
}> {
  await connectDb();
  const localMidnight = new Date(Date.now() + 5 * 60 * 60 * 1000);
  localMidnight.setUTCHours(0, 0, 0, 0);
  const start = new Date(localMidnight.getTime() - 5 * 60 * 60 * 1000);
  const filter = { "delivery.deliveryBoy": userId };
  const [docs, completedToday] = await Promise.all([
    getOrderModel()
      .find({
        ...filter,
        $or: [
          { status: { $nin: ["delivered", "cancelled"] } },
          {
            status: "delivered",
            statusHistory: {
              $elemMatch: { status: "delivered", changedAt: { $gte: start } },
            },
          },
        ],
      })
      .sort({ placedAt: -1 })
      .limit(100)
      .lean<LeanOrder[]>(),
    getOrderModel().countDocuments({
      ...filter,
      status: "delivered",
      statusHistory: {
        $elemMatch: { status: "delivered", changedAt: { $gte: start } },
      },
    }),
  ]);
  return { orders: docs.map(toOrderDto), completedToday };
}

export async function listDeliveryWorkers(): Promise<
  { id: string; name: string }[]
> {
  await connectDb();
  const workers = await getUserModel()
    .find({ role: "delivery_boy", isActive: true })
    .select("name")
    .sort({ name: 1 })
    .lean<{ _id: Types.ObjectId; name: string }[]>();
  return workers.map((worker) => ({
    id: worker._id.toString(),
    name: worker.name,
  }));
}

// --- Status transitions ------------------------------------------------------

export type OrderActor = { id: string; role: Role };

/** Persist a fulfillment-specific transition before publishing its event. */
export async function transitionOrderStatus(
  orderId: string,
  next: OrderStatus,
  actor: OrderActor,
  note?: string,
): Promise<OrderDto> {
  if (actor.role !== "admin" && actor.role !== "delivery_boy") {
    throw new ForbiddenError("You cannot change the status of this order.");
  }
  if (next === "cancelled" && !note?.trim()) {
    throw new BadRequestError("A reason is required to reject or cancel an order.");
  }

  await connectDb();
  const Order = getOrderModel();
  const doc = await Order.findById(orderId).lean<LeanOrder | null>();
  if (!doc) throw new NotFoundError("Order not found");

  const current = normalizeOrderStatus(doc.status, doc.delivery.type);
  const allowed = ORDER_STATUS_TRANSITIONS[doc.delivery.type][current];
  if (!allowed.includes(next)) {
    throw new ConflictError(
      `Cannot move a ${doc.delivery.type} order from "${current}" to "${next}".`,
    );
  }
  if (
    actor.role === "delivery_boy" &&
    (doc.delivery.type !== "delivery" ||
      doc.delivery.deliveryBoy?.toString() !== actor.id ||
      current !== "out_for_delivery" ||
      next !== "delivered")
  ) {
    throw new ForbiddenError(
      "Delivery staff may only complete their assigned delivery.",
    );
  }
  if (
    doc.delivery.type === "delivery" &&
    next === "out_for_delivery" &&
    !doc.delivery.deliveryBoy
  ) {
    throw new ConflictError(
      "Assign a delivery worker before marking this order out for delivery.",
    );
  }

  const changedAt = new Date();
  const eventId = randomUUID();
  const version = (doc.version ?? 0) + 1;
  const saved = await Order.findOneAndUpdate(
    {
      _id: doc._id,
      status: doc.status,
      ...(doc.version === undefined
        ? { version: { $exists: false } }
        : { version: doc.version }),
    },
    {
      $set: { status: next },
      $inc: { version: 1 },
      $push: {
        statusHistory: {
          eventId,
          status: next,
          changedBy: new Types.ObjectId(actor.id),
          changedAt,
          note,
        },
      },
    },
    { new: true },
  ).lean<LeanOrder | null>();
  if (!saved) {
    throw new ConflictError("This order changed just now. Refresh and try again.");
  }

  await recordAuditEvent({
    actorId: actor.id,
    action: "order.status_changed",
    targetType: "order",
    targetId: saved._id.toString(),
    metadata: { from: current, to: next, note },
  });
  await publishOrderEvent({
    type: "order:status-changed",
    eventId,
    version,
    orderId: saved._id.toString(),
    trackingId: saved.trackingId,
    status: next,
    statusLabel: ORDER_STATUS_LABELS[next],
    fulfillmentType: saved.delivery.type,
    changedAt: changedAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
    note,
  });
  return toOrderDto(saved);
}

export async function assignDeliveryWorker(
  orderId: string,
  deliveryBoyId: string,
  actor: OrderActor,
): Promise<OrderDto> {
  if (actor.role !== "admin") {
    throw new ForbiddenError("Only an admin can assign a delivery worker.");
  }
  await connectDb();
  const Order = getOrderModel();
  const doc = await Order.findById(orderId).lean<LeanOrder | null>();
  if (!doc) throw new NotFoundError("Order not found");
  if (doc.delivery.type !== "delivery") {
    throw new ConflictError(
      "A delivery worker can only be assigned to delivery orders.",
    );
  }
  const currentStatus = normalizeOrderStatus(doc.status, doc.delivery.type);
  if (currentStatus === "delivered" || currentStatus === "cancelled") {
    throw new ConflictError("A completed or cancelled order cannot be assigned.");
  }
  if (doc.delivery.deliveryBoy?.toString() === deliveryBoyId) {
    const previousAssignment = [...(doc.fulfillmentHistory ?? [])]
      .reverse()
      .find((entry) => entry.type === "assigned" && entry.deliveryBoy?.toString() === deliveryBoyId);
    if (previousAssignment) {
      try {
        await enqueueDeliveryAssignmentNotifications(
          doc._id.toString(),
          previousAssignment.eventId,
          deliveryBoyId,
        );
      } catch (error) {
        logger.error("Failed to reconcile assignment notification jobs", {
          orderId: doc._id.toString(),
          error,
        });
      }
    }
    return toOrderDto(doc);
  }
  const worker = await getUserModel()
    .findOne({ _id: deliveryBoyId, role: "delivery_boy", isActive: true })
    .select("name")
    .lean<{ _id: Types.ObjectId; name: string } | null>();
  if (!worker) throw new BadRequestError("Choose an active delivery worker.");

  const assignedAt = new Date();
  const eventId = randomUUID();
  const version = (doc.version ?? 0) + 1;
  const saved = await Order.findOneAndUpdate(
    {
      _id: doc._id,
      status: doc.status,
      ...(doc.version === undefined
        ? { version: { $exists: false } }
        : { version: doc.version }),
    },
    {
      $set: {
        "delivery.deliveryBoy": worker._id,
        "delivery.deliveryBoyName": worker.name,
        "delivery.assignedAt": assignedAt,
      },
      $inc: { version: 1 },
      $push: {
        fulfillmentHistory: {
          eventId,
          type: "assigned",
          actor: new Types.ObjectId(actor.id),
          at: assignedAt,
          deliveryBoy: worker._id,
          deliveryBoyName: worker.name,
        },
      },
    },
    { new: true },
  ).lean<LeanOrder | null>();
  if (!saved) {
    throw new ConflictError("This order changed just now. Refresh and try again.");
  }
  await recordAuditEvent({
    actorId: actor.id,
    action: "order.delivery_assigned",
    targetType: "order",
    targetId: saved._id.toString(),
    metadata: {
      deliveryBoyId: worker._id.toString(),
      assignmentEventId: eventId,
      previousDeliveryBoyId: doc.delivery.deliveryBoy?.toString(),
    },
  });
  try {
    await enqueueDeliveryAssignmentNotifications(
      saved._id.toString(),
      eventId,
      worker._id.toString(),
    );
  } catch (error) {
    logger.error("Failed to queue delivery assignment notifications", {
      orderId: saved._id.toString(),
      error,
    });
  }
  await publishOrderEvent({
    type: "order:assigned",
    eventId,
    version,
    orderId: saved._id.toString(),
    trackingId: saved.trackingId,
    deliveryBoyName: worker.name,
    assignedAt: assignedAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  });
  return toOrderDto(saved);
}

export async function updateDeliveryLocation(
  orderId: string,
  coordinates: { lat: number; lng: number },
  actor: OrderActor,
): Promise<OrderDto> {
  if (actor.role !== "admin" && actor.role !== "delivery_boy") {
    throw new ForbiddenError("You cannot update delivery location.");
  }
  await connectDb();
  const Order = getOrderModel();
  const doc = await Order.findById(orderId).lean<LeanOrder | null>();
  if (!doc) throw new NotFoundError("Order not found");
  if (
    doc.delivery.type !== "delivery" ||
    normalizeOrderStatus(doc.status, doc.delivery.type) !== "out_for_delivery"
  ) {
    throw new ConflictError(
      "Location updates are only available while out for delivery.",
    );
  }
  if (
    actor.role === "delivery_boy" &&
    doc.delivery.deliveryBoy?.toString() !== actor.id
  ) {
    throw new ForbiddenError("You can only update your assigned delivery.");
  }

  const updatedAt = new Date();
  const eventId = randomUUID();
  const version = (doc.version ?? 0) + 1;
  const saved = await Order.findOneAndUpdate(
    {
      _id: doc._id,
      status: doc.status,
      ...(doc.version === undefined
        ? { version: { $exists: false } }
        : { version: doc.version }),
    },
    {
      $set: { "delivery.lastLocation": { coordinates, updatedAt } },
      $inc: { version: 1 },
      $push: {
        fulfillmentHistory: {
          eventId,
          type: "delivery_location",
          actor: new Types.ObjectId(actor.id),
          at: updatedAt,
          coordinates,
        },
      },
    },
    { new: true },
  ).lean<LeanOrder | null>();
  if (!saved) {
    throw new ConflictError("This order changed just now. Refresh and try again.");
  }
  await publishOrderEvent({
    type: "order:delivery-location",
    eventId,
    version,
    orderId: saved._id.toString(),
    trackingId: saved.trackingId,
    coordinates,
    updatedAt: updatedAt.toISOString(),
  });
  return toOrderDto(saved);
}

/**
 * Record that cash was collected for a Cash on Delivery order. Staff-only.
 * Online payments MUST instead be marked paid from a verified provider event —
 * see payment/types.ts and docs/AUTH.md.
 */
export async function recordCashCollected(
  orderId: string,
  actor: OrderActor,
): Promise<OrderDto> {
  if (actor.role !== "admin" && actor.role !== "delivery_boy") {
    throw new ForbiddenError("You cannot record payments for this order.");
  }
  await connectDb();
  const Order = getOrderModel();
  const doc = await Order.findById(orderId);
  if (!doc) throw new NotFoundError("Order not found");
  if (doc.payment.method !== "cash_on_delivery") {
    throw new ConflictError("Only Cash on Delivery can be recorded this way.");
  }
  if (
    actor.role === "delivery_boy" &&
    doc.delivery.deliveryBoy?.toString() !== actor.id
  ) {
    throw new ForbiddenError("You can only record cash for your assigned delivery.");
  }
  if (normalizeOrderStatus(doc.status, doc.delivery.type) !== "delivered") {
    throw new ConflictError("Cash can be recorded only after the order is handed over.");
  }
  if (doc.payment.status === "paid") return toOrderDto(doc.toObject() as LeanOrder);
  doc.payment.status = "paid";
  doc.payment.paidAt = new Date();
  await doc.save();
  await recordAuditEvent({
    actorId: actor.id,
    action: "order.cash_collected",
    targetType: "order",
    targetId: doc._id.toString(),
    metadata: { total: doc.total, method: doc.payment.method },
  });
  return toOrderDto(doc.toObject() as LeanOrder);
}
