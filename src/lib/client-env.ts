/**
 * Client-visible environment accessor. Values here are inlined by Next.js at
 * build time — they must be real `process.env.NEXT_PUBLIC_*` references.
 */
const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? "",
};

export function getClientEnv() {
  return clientEnv;
}