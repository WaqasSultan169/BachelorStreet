import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { z } from "zod";

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required by the Socket.IO service.`);
  return value;
};

const mongoUri = required("MONGODB_URI");
const ticketSecret = required("SOCKET_TICKET_SECRET");
const internalSecret = required("SOCKET_INTERNAL_SECRET");
if (ticketSecret.length < 32 || internalSecret.length < 32) {
  throw new Error("Socket secrets must contain at least 32 characters.");
}
const origins = (process.env.SOCKET_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (origins.length === 0) {
  throw new Error("Set SOCKET_ALLOWED_ORIGINS to an explicit origin allowlist.");
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const trackingId = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
const roles = ["customer", "admin", "delivery_boy"];
const ticketSchema = z.object({
  sub: objectId,
  role: z.enum(roles),
  tokenVersion: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});
const eventBase = z.object({
  eventId: z.string().uuid(),
  version: z.number().int().positive(),
  orderId: objectId,
  trackingId,
  updatedAt: z.string().datetime(),
});
const orderEventSchema = z.discriminatedUnion("type", [
  eventBase.extend({
    type: z.literal("order:status-changed"),
    status: z.enum([
      "pending",
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ]),
    statusLabel: z.string().min(1).max(80),
    fulfillmentType: z.enum(["pickup", "delivery"]),
    changedAt: z.string().datetime(),
    note: z.string().max(300).optional(),
  }),
  eventBase.extend({
    type: z.literal("order:assigned"),
    deliveryBoyName: z.string().min(1).max(80),
    assignedAt: z.string().datetime(),
  }),
  eventBase.extend({
    type: z.literal("order:delivery-location"),
    coordinates: z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    }),
  }),
  eventBase.extend({
    type: z.literal("order:created"),
    orderNumber: z.string().min(1).max(40),
    status: z.enum([
      "pending",
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ]),
    fulfillmentType: z.enum(["pickup", "delivery"]),
    total: z.number().finite().nonnegative(),
    createdAt: z.string().datetime(),
  }),
]);
const joinSchema = z.union([
  z.object({ trackingId }),
  z.object({ trackingIds: z.array(trackingId).min(1).max(25) }),
]);
const allowedEvents = new Set([
  "order:status-changed",
  "order:assigned",
  "order:delivery-location",
  "order:created",
]);
const collection = (name) => mongoose.connection.collection(name);
const roomName = (id) => `order:${id}`;

function verifyTicket(token) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", ticketSecret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  let parsed;
  try {
    parsed = ticketSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
  if (!parsed.success || parsed.data.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return parsed.data;
}

function internalRequest(req, res, io) {
  if (req.method !== "POST" || req.url !== "/internal/publish") {
    res.writeHead(404).end();
    return;
  }
  const supplied = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const expected = Buffer.from(internalSecret);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.writeHead(401).end();
    return;
  }

  const chunks = [];
  let length = 0;
  req.on("data", (chunk) => {
    length += chunk.length;
    if (length > 16_384) {
      res.writeHead(413).end();
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    if (res.writableEnded) return;
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      res.writeHead(400).end();
      return;
    }
    const parsed = orderEventSchema.safeParse(body);
    if (!parsed.success) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid event payload." }));
      return;
    }
    const { data } = parsed;
    if (!allowedEvents.has(data.type)) {
      res.writeHead(400).end();
      return;
    }
    if (data.type === "order:created") {
      io.to("role:admin").emit(data.type, data);
    } else {
      io.to(roomName(data.orderId)).emit(data.type, data);
      io.to("role:admin").emit(data.type, data);
      if (data.type === "order:assigned") {
        const order = await collection("orders").findOne(
          { _id: new mongoose.Types.ObjectId(data.orderId) },
          { projection: { "delivery.deliveryBoy": 1 } },
        );
        const workerId = order?.delivery?.deliveryBoy;
        if (workerId) io.to(`user:${String(workerId)}`).emit(data.type, data);
      }
    }
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ accepted: true }));
  });
}

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });

let io;
const httpServer = createServer((req, res) => {
  if (req.url?.startsWith("/internal/")) {
    internalRequest(req, res, io);
    return;
  }
  res.writeHead(404).end();
});
io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (origin && origins.includes(origin)) callback(null, true);
      else callback(new Error("Origin is not allowed."));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  allowRequest(request, callback) {
    const origin = request.headers.origin;
    callback(null, Boolean(origin && origins.includes(origin)));
  },
  maxHttpBufferSize: 16_384,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

const redisClients = [];
if (process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  redisClients.push(pubClient, subClient);
  io.adapter(createAdapter(pubClient, subClient));
  console.info("Socket.IO Redis adapter enabled.");
}

const joinWindows = new Map();
const joinLimit = (socket) => {
  const now = Date.now();
  const key = socket.data.user.id;
  const attempts = (joinWindows.get(key) ?? []).filter((time) => time > now - 60_000);
  if (attempts.length >= 30) return false;
  attempts.push(now);
  joinWindows.set(key, attempts);
  if (joinWindows.size > 10_000) {
    for (const [userId, timestamps] of joinWindows) {
      if (timestamps.every((time) => time <= now - 60_000)) {
        joinWindows.delete(userId);
      }
    }
  }
  return true;
};

io.use(async (socket, next) => {
  try {
    const ticket = socket.handshake.auth?.ticket;
    if (typeof ticket !== "string" || ticket.length > 2048) {
      return next(new Error("Authentication required."));
    }
    const claims = verifyTicket(ticket);
    if (!claims) return next(new Error("Invalid or expired session."));
    const user = await collection("users").findOne({
      _id: new mongoose.Types.ObjectId(claims.sub),
      isActive: true,
    });
    if (
      !user ||
      (user.tokenVersion ?? 0) !== claims.tokenVersion ||
      user.role !== claims.role
    ) {
      return next(new Error("Session is no longer valid."));
    }
    socket.data.user = {
      id: claims.sub,
      role: claims.role,
      tokenVersion: claims.tokenVersion,
    };
    next();
  } catch (error) {
    console.error("Socket authentication failed", error);
    next(new Error("Authentication failed."));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  if (socket.data.user.role === "admin") socket.join("role:admin");

  const sessionCheck = setInterval(async () => {
    try {
      const user = await collection("users").findOne(
        { _id: new mongoose.Types.ObjectId(socket.data.user.id), isActive: true },
        { projection: { role: 1, tokenVersion: 1 } },
      );
      if (
        !user ||
        (user.tokenVersion ?? 0) !== socket.data.user.tokenVersion ||
        user.role !== socket.data.user.role
      ) {
        socket.disconnect(true);
      }
    } catch (error) {
      console.error("Socket session revalidation failed", error);
      socket.disconnect(true);
    }
  }, 60_000);
  socket.once("disconnect", () => clearInterval(sessionCheck));

  socket.on("order:join", async (input) => {
    const parsed = joinSchema.safeParse(input);
    if (!parsed.success) {
      socket.emit("order:error", {
        code: "INVALID_REQUEST",
        message: "Invalid order tracking request.",
      });
      return;
    }
    if (!joinLimit(socket)) {
      socket.emit("order:error", {
        code: "RATE_LIMITED",
        message: "Too many order subscription requests.",
      });
      return;
    }
    try {
      const trackingIds = "trackingId" in parsed.data
        ? [parsed.data.trackingId]
        : parsed.data.trackingIds;
      const orders = await collection("orders").find(
        { trackingId: { $in: trackingIds } },
        { projection: { _id: 1, trackingId: 1, user: 1, "delivery.deliveryBoy": 1, version: 1 } },
      ).toArray();
      if (orders.length !== trackingIds.length) {
        socket.emit("order:error", {
          code: "NOT_FOUND",
          message: "Order not found.",
        });
        return;
      }
      const authorized = orders.every((order) =>
        socket.data.user.role === "admin" ||
        (socket.data.user.role === "customer" &&
          String(order.user ?? "") === socket.data.user.id) ||
        (socket.data.user.role === "delivery_boy" &&
          String(order.delivery?.deliveryBoy ?? "") === socket.data.user.id),
      );
      if (!authorized) {
        socket.emit("order:error", {
          code: "UNAUTHORIZED",
          message: "You cannot subscribe to this order.",
        });
        return;
      }

      const joinedOrders = [];
      for (const order of orders) {
        const orderId = String(order._id);
        await socket.join(roomName(orderId));
        joinedOrders.push({ orderId, version: order.version ?? 0 });
      }
      socket.emit("order:joined", {
        orders: joinedOrders,
      });
    } catch (error) {
      console.error("Order room authorization failed", error);
      socket.emit("order:error", {
        code: "INVALID_REQUEST",
        message: "Could not authorize this order subscription.",
      });
    }
  });
});

const port = Number(process.env.SOCKET_PORT ?? 3001);
httpServer.listen(port, "0.0.0.0", () => {
  console.info(`Socket.IO service listening on port ${port}.`);
});

async function shutdown() {
  await new Promise((resolve) => io.close(resolve));
  await Promise.all(redisClients.map((client) => client.quit()));
  await mongoose.disconnect();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
