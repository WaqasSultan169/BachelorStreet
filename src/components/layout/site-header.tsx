import { auth } from "@/auth";
import { HeaderNav } from "@/components/layout/header";

/** Server wrapper: reads the session once and feeds it to the interactive nav. */
export async function SiteHeader() {
  const session = await auth();
  return <HeaderNav user={session?.user ? { name: session.user.name ?? "Member" } : null} />;
}