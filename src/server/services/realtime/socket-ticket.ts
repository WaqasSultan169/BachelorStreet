import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { ROLES } from "@/lib/constants";
import { BadRequestError } from "@/lib/errors";

const socketTicketClaimsSchema = z.object({
  sub: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum(ROLES),
  tokenVersion: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});

export type SocketTicketClaims = z.infer<typeof socketTicketClaimsSchema>;

function ticketSecret(): string {
  const secret = env.SOCKET_TICKET_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SOCKET_TICKET_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function createSocketTicket(input: Omit<SocketTicketClaims, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...input, exp: Math.floor(Date.now() / 1000) + 90 }),
  ).toString("base64url");
  const signature = createHmac("sha256", ticketSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySocketTicket(ticket: string): SocketTicketClaims {
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra) throw new BadRequestError("Invalid socket ticket.");

  const expected = createHmac("sha256", ticketSecret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    throw new BadRequestError("Invalid socket ticket.");
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new BadRequestError("Invalid socket ticket.");
  }

  let parsedClaims: ReturnType<typeof socketTicketClaimsSchema.safeParse>;
  try {
    parsedClaims = socketTicketClaimsSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
  } catch {
    throw new BadRequestError("Invalid socket ticket.");
  }
  if (!parsedClaims.success || !/^[a-f\d]{24}$/i.test(parsedClaims.data.sub) ||
    parsedClaims.data.exp <= Math.floor(Date.now() / 1000)) {
    throw new BadRequestError("Expired or invalid socket ticket.");
  }
  return parsedClaims.data;
}
