"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@/server/validation";
import type { UpdateProfileInput } from "@/server/validation";
import { updateProfileAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function ProfileForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: defaultName, phone: defaultPhone ?? "" },
  });

  const onSubmit = (values: UpdateProfileInput) => {
    setFormError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setMessage(result.message ?? "Profile updated.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "profile-name-error" : undefined}
          {...register("name")}
        />
        <FieldError id="profile-name-error" message={errors.name?.message} />
      </div>

      <div>
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          placeholder="03xx xxxxxxx"
          invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "profile-phone-error" : undefined}
          {...register("phone")}
        />
        <FieldError id="profile-phone-error" message={errors.phone?.message} />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
        >
          {formError}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      ) : null}

      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
