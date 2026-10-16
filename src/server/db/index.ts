import "server-only";
import mongoose from "mongoose";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __bscMongooseCache: MongooseCache | undefined;
}

const globalCache: MongooseCache =
  globalThis.__bscMongooseCache ?? (globalThis.__bscMongooseCache = { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (globalCache.conn) return globalCache.conn;

  const { MONGODB_URI } = getServerEnv();

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: true })
      .then((conn) => {
        logger.info("MongoDB connected");
        return conn;
      })
      .catch((error) => {
        globalCache.promise = null;
        logger.error("MongoDB connection failed", error);
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

export function getDbState(): string {
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return states[mongoose.connection.readyState] ?? "unknown";
}

export async function disconnectDb(): Promise<void> {
  if (globalCache.conn) {
    await mongoose.disconnect();
    globalCache.conn = null;
    globalCache.promise = null;
    logger.info("MongoDB disconnected");
  }
}