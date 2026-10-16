import { Schema, model, models, type Model, type Types } from "mongoose";

export interface AuditLogShape {
  _id: Types.ObjectId;
  actor: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogShape>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    targetType: { type: String, required: true, trim: true, maxlength: 80 },
    targetId: { type: String, required: true, trim: true, maxlength: 120 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type AuditLogModel = Model<AuditLogShape>;

export function getAuditLogModel(): AuditLogModel {
  return (models.AuditLog as AuditLogModel | undefined) ??
    model<AuditLogShape>("AuditLog", auditLogSchema);
}
