import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getNotificationJobModel, getOrderModel, getUserModel } from "@/server/db/models";
import { logger } from "@/lib/logger";

export async function enqueueDeliveryAssignmentNotifications(
  orderId: string,
  assignmentEventId: string,
  recipientId: string,
): Promise<void> {
  await connectDb();
  const [order, recipient] = await Promise.all([
    getOrderModel().findById(orderId).select("orderNumber").lean<{ orderNumber: string } | null>(),
    getUserModel()
      .findOne({ _id: recipientId, role: "delivery_boy", isActive: true })
      .select("email phone emailNotificationConsent phoneNotificationConsent")
      .lean<{
        _id: Types.ObjectId;
        email: string;
        phone?: string;
        emailNotificationConsent?: boolean;
        phoneNotificationConsent?: boolean;
      } | null>(),
  ]);
  if (!order || !recipient) return;

  const notificationJobs = getNotificationJobModel();
  const channels: ("email" | "phone")[] = recipient.phone ? ["email", "phone"] : ["email"];
  for (const channel of channels) {
    const consented = channel === "email"
      ? recipient.emailNotificationConsent === true
      : recipient.phoneNotificationConsent === true;
    const key = {
      order: new Types.ObjectId(orderId),
      assignmentEventId,
      channel,
    };
    if (!consented) {
      await notificationJobs.updateOne(
        key,
        {
          $setOnInsert: {
            ...key,
            recipient: recipient._id,
            status: "failed",
            attempts: 0,
            nextAttemptAt: new Date(),
            outcome: "Skipped: no consent.",
          },
        },
        { upsert: true },
      );
      continue;
    }
    await notificationJobs.updateOne(
      key,
      {
        $setOnInsert: {
          ...key,
          recipient: recipient._id,
          status: "queued",
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
      { upsert: true },
    );
    await notificationJobs.updateOne(
      { ...key, status: "failed", outcome: "Skipped: no consent." },
      {
        $set: { status: "queued", attempts: 0, outcome: null, nextAttemptAt: new Date() },
      },
    );
  }
  if (channels.every((channel) =>
    channel === "email"
      ? !recipient.emailNotificationConsent
      : !recipient.phoneNotificationConsent,
  )) {
    logger.info("Assignment notifications skipped because the worker opted out", {
      orderId,
      recipientId,
    });
  }
}
