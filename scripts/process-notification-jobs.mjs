import mongoose from "mongoose";
import nodemailer from "nodemailer";

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error("MONGODB_URI is required.");
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const maxAttempts = 5;
const timeout = (promise, ms) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Provider request timed out.")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });
const db = mongoose.connection.db;
const jobs = db.collection("notificationjobs");
const users = db.collection("users");
const orders = db.collection("orders");
const due = new Date();
let processed = 0;

try {
  while (processed < 100) {
    const job = await jobs.findOneAndUpdate(
      {
        nextAttemptAt: { $lte: due },
        $or: [
          { status: "queued" },
          { status: "processing", lockedAt: { $lt: new Date(Date.now() - 5 * 60_000) } },
        ],
      },
      { $set: { status: "processing", lockedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: "after" },
    );
    if (!job) break;
    processed += 1;

    try {
      const [user, order] = await Promise.all([
        users.findOne({ _id: job.recipient, role: "delivery_boy", isActive: true }),
        orders.findOne({ _id: job.order }, { projection: { orderNumber: 1, trackingId: 1, "delivery.deliveryBoy": 1, "delivery.branchName": 1, status: 1 } }),
      ]);
      if (!user || !order || String(order.delivery?.deliveryBoy ?? "") !== String(job.recipient)) {
        throw new Error("Assignment is no longer active.");
      }
      if (job.channel === "email") {
        if (user.emailNotificationConsent !== true) throw new Error("Email consent was withdrawn.");
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          throw new Error("Email provider is not configured.");
        }
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: Number(process.env.SMTP_PORT ?? 587) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
        });
        try {
          await timeout(transporter.sendMail({
            from: process.env.EMAIL_FROM ?? "Bachelor Street Café <no-reply@example.com>",
            to: user.email,
            subject: `Delivery assignment - ${order.orderNumber}`,
            text: `You have been assigned delivery ${order.orderNumber}. Open ${appUrl}/delivery to view the details.`,
            html: `<p>You have been assigned delivery <strong>${order.orderNumber}</strong>.</p><p><a href="${appUrl}/delivery">Open your delivery dashboard</a> to view customer and fulfillment details.</p>`,
          }), 10_000);
        } finally {
          transporter.close();
        }
      } else {
        if (user.phoneNotificationConsent !== true) throw new Error("Phone consent was withdrawn.");
        if (!user.phone) throw new Error("No phone number is on file.");
        const endpoint = process.env.PHONE_NOTIFICATION_WEBHOOK_URL;
        const token = process.env.PHONE_NOTIFICATION_WEBHOOK_TOKEN;
        if (!endpoint || !token) throw new Error("SMS/WhatsApp provider is not configured.");
        if (process.env.NODE_ENV === "production" && new URL(endpoint).protocol !== "https:") {
          throw new Error("Phone provider webhook must use HTTPS in production.");
        }
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            to: user.phone,
            message: `Bachelor Street: you have been assigned delivery ${order.orderNumber}. Open ${appUrl}/delivery.`,
            orderNumber: order.orderNumber,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`Phone provider returned HTTP ${response.status}.`);
      }
      await jobs.updateOne(
        { _id: job._id, status: "processing" },
        { $set: { status: "delivered", outcome: "Provider accepted notification.", lockedAt: null } },
      );
    } catch (error) {
      const attempt = job.attempts ?? 1;
      const terminal = attempt >= maxAttempts;
      const message = error instanceof Error ? error.message.slice(0, 450) : "Unknown provider error.";
      await jobs.updateOne(
        { _id: job._id, status: "processing" },
        {
          $set: {
            status: terminal ? "failed" : "queued",
            outcome: message,
            lockedAt: null,
            nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000),
          },
        },
      );
      console.error(`Notification job ${job._id} attempt ${attempt} failed: ${message}`);
    }
  }
} finally {
  await mongoose.disconnect();
}

console.info(`Processed ${processed} notification job(s).`);
