import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserById } from "@/server/services/user.service";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/signout-button";
import { ProfileForm } from "@/app/account/profile-form";
import { ChangePasswordForm } from "@/app/account/password-form";
import { AddressBook } from "@/app/account/address-book";
import { NotificationPreferences } from "@/app/account/notification-preferences";

export const metadata: Metadata = {
  title: "My account",
  description: "Manage your Bachelor's Street profile, password, and addresses.",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    redirect("/login?callbackUrl=/account");
  }

  const googleLinked = user.oauthProviders.includes("google");

  return (
    <Container className="max-w-3xl py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">My account</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {user.email}
            {user.emailVerified ? (
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Verified
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Unverified
              </span>
            )}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              View your order history and track current orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button href="/account/orders" variant="outline">
              View my orders
            </Button>
          </CardContent>
        </Card>
        {user.role === "admin" || user.role === "delivery_boy" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{user.role === "admin" ? "Administration" : "Delivery dashboard"}</CardTitle>
                <CardDescription>
                  {user.role === "admin"
                    ? "Review analytics and manage store operations."
                    : "View and complete only deliveries assigned to your account."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button href={user.role === "admin" ? "/admin" : "/delivery"} variant="outline">
                  {user.role === "admin" ? "Open admin dashboard" : "Open my deliveries"}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assignment notifications</CardTitle>
                <CardDescription>
                  Choose which channels may notify you about delivery assignments. Phone notifications require your explicit opt-in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationPreferences
                  emailConsent={user.emailNotificationConsent}
                  phoneConsent={user.phoneNotificationConsent}
                  hasPhone={Boolean(user.phone)}
                />
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your name and contact number.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm defaultName={user.name} defaultPhone={user.phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change the password for this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm hasPassword={user.hasPassword} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery addresses</CardTitle>
            <CardDescription>Save addresses to check out faster next time.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddressBook addresses={user.addresses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign-in methods</CardTitle>
            <CardDescription>How you can access your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-charcoal-600">
            <p>
              Email &amp; password:{" "}
              <span className="font-medium text-charcoal-800">
                {user.hasPassword ? "Enabled" : "Not set"}
              </span>
            </p>
            <p>
              Google:{" "}
              <span className="font-medium text-charcoal-800">
                {googleLinked ? "Connected" : "Not connected"}
              </span>
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <SignOutButton />
        </div>
      </div>
    </Container>
  );
}
