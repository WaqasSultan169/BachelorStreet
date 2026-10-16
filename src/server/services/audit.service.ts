import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getAuditLogModel } from "@/server/db/models";

export async function recordAuditEvent(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await connectDb();
  await getAuditLogModel().create({
    actor: new Types.ObjectId(input.actorId),
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
  });
}
