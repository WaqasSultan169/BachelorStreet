import { Schema, model, models, type Model, type Types } from "mongoose";

export interface NotificationShape {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationShape>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export type NotificationModel = Model<NotificationShape>;

export function getNotificationModel(): NotificationModel {
  return (models.Notification as NotificationModel | undefined) ??
    model<NotificationShape>("Notification", notificationSchema);
}