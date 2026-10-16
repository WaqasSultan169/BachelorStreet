import { Schema, model, models, type Model, type Types } from "mongoose";

export interface NotificationJobShape {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  recipient: Types.ObjectId;
  assignmentEventId: string;
  channel: "email" | "phone";
  status: "queued" | "processing" | "delivered" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lockedAt?: Date;
  providerMessageId?: string;
  outcome?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationJobSchema = new Schema<NotificationJobShape>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignmentEventId: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["email", "phone"], required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "delivered", "failed"],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: Date,
    providerMessageId: String,
    outcome: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

notificationJobSchema.index(
  { order: 1, assignmentEventId: 1, channel: 1 },
  { unique: true },
);
notificationJobSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

export type NotificationJobModel = Model<NotificationJobShape>;

export function getNotificationJobModel(): NotificationJobModel {
  return (models.NotificationJob as NotificationJobModel | undefined) ??
    model<NotificationJobShape>("NotificationJob", notificationJobSchema);
}
