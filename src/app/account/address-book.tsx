"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema } from "@/server/validation";
import type { AddressInput } from "@/server/validation";
import {
  addAddressAction,
  removeAddressAction,
  updateAddressAction,
} from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import type { UserAddressDto } from "@/server/services/user.service";

export function AddressBook({ addresses }: { addresses: UserAddressDto[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddress(),
  });

  const openNew = () => {
    reset(emptyAddress());
    setActionError(undefined);
    setEditing("new");
  };

  const openEdit = (address: UserAddressDto) => {
    reset({
      label: address.label,
      street: address.street ?? "",
      area: address.area ?? "",
      city: address.city ?? "",
      phone: address.phone ?? "",
      instructions: address.instructions ?? "",
      isDefault: address.isDefault,
    });
    setActionError(undefined);
    setEditing(address.id);
  };

  const close = () => {
    setEditing(null);
    setActionError(undefined);
  };

  const onSubmit = (values: AddressInput) => {
    setActionError(undefined);
    startTransition(async () => {
      const result =
        editing === "new"
          ? await addAddressAction(values)
          : await updateAddressAction(editing as string, values);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  const onRemove = (id: string) => {
    setActionError(undefined);
    startTransition(async () => {
      const result = await removeAddressAction(id);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing === null ? (
        <p className="text-sm text-charcoal-500">No saved addresses yet.</p>
      ) : null}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-charcoal-100 p-4"
          >
            <div className="text-sm">
              <p className="font-medium text-charcoal-800">
                {address.label}
                {address.isDefault ? (
                  <span className="ml-2 rounded-full bg-gold-400/20 px-2 py-0.5 text-xs font-semibold text-gold-600">
                    Default
                  </span>
                ) : null}
              </p>
              <p className="text-charcoal-500">
                {[address.street, address.area, address.city]
                  .filter(Boolean)
                  .join(", ") || "No address details"}
              </p>
              {address.phone ? (
                <p className="text-charcoal-500">{address.phone}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(address)}
                aria-label={`Edit ${address.label}`}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(address.id)}
                disabled={pending}
                aria-label={`Remove ${address.label}`}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing === null ? (
        <Button variant="outline" onClick={openNew}>
          Add address
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-charcoal-100 p-4"
          noValidate
        >
          <div>
            <Label htmlFor="address-label">Label</Label>
            <Input
              id="address-label"
              placeholder="Home, Work…"
              invalid={Boolean(errors.label)}
              {...register("label")}
            />
            <FieldError id="address-label-error" message={errors.label?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="address-street">Street</Label>
              <Input id="address-street" {...register("street")} />
            </div>
            <div>
              <Label htmlFor="address-area">Area</Label>
              <Input id="address-area" {...register("area")} />
            </div>
            <div>
              <Label htmlFor="address-city">City</Label>
              <Input id="address-city" {...register("city")} />
            </div>
            <div>
              <Label htmlFor="address-phone">Phone</Label>
              <Input id="address-phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div>
            <Label htmlFor="address-instructions">Delivery instructions</Label>
            <Input id="address-instructions" {...register("instructions")} />
          </div>

          <label className="flex items-center gap-2 text-sm text-charcoal-700">
            <input type="checkbox" className="h-4 w-4" {...register("isDefault")} />
            Set as default address
          </label>

          {actionError ? (
            <p
              role="alert"
              className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
            >
              {actionError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              {editing === "new" ? "Save address" : "Update address"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {actionError && editing === null ? (
        <p
          role="alert"
          className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
        >
          {actionError}
        </p>
      ) : null}
    </div>
  );
}

function emptyAddress(): AddressInput {
  return {
    label: "",
    street: "",
    area: "",
    city: "",
    phone: "",
    instructions: "",
    isDefault: false,
  };
}
