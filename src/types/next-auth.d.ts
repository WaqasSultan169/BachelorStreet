import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      /** Session version; compared against the DB on server guards. */
      tokenVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    id?: string;
    tokenVersion?: number;
  }
}