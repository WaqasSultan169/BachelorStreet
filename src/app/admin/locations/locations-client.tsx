"use client";

import { useState, useTransition } from "react";
import {
  createAdminBranchAction,
  createAdminZoneAction,
  updateAdminBranchAction,
  updateAdminZoneAction,
} from "@/server/actions/admin";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Hours = { day: string; open?: string; close?: string; closed: boolean };
type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone?: string;
  city: string;
  hours: Hours[];
  isActive: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
};
type Zone = {
  id: string;
  branchId: string;
  name: string;
  areas: string[];
  deliveryFee: number;
  freeAbove?: number;
  minOrder?: number;
  etaMinutes: number;
  isActive: boolean;
};

export function LocationsClient({ branches, zones }: { branches: Branch[]; zones: Zone[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const createBranch = (form: FormData) => startTransition(async () => {
    const result = await createAdminBranchAction({
      name: String(form.get("name") ?? ""),
      slug: String(form.get("slug") ?? ""),
      address: String(form.get("address") ?? ""),
      phone: String(form.get("phone") ?? ""),
      city: String(form.get("city") ?? ""),
    });
    setMessage(result.ok ? "Branch created. Configure hours and enable services before opening it." : result.error);
    if (result.ok) window.location.reload();
  });
  const createZone = (form: FormData) => startTransition(async () => {
    const result = await createAdminZoneAction({
      branchId: String(form.get("branchId") ?? ""),
      name: String(form.get("name") ?? ""),
      areas: String(form.get("areas") ?? "").split(",").map((area) => area.trim()).filter(Boolean),
      deliveryFee: Number(form.get("deliveryFee")),
      etaMinutes: Number(form.get("etaMinutes")),
      freeAbove: String(form.get("freeAbove") ?? "") ? Number(form.get("freeAbove")) : undefined,
      minOrder: String(form.get("minOrder") ?? "") ? Number(form.get("minOrder")) : undefined,
    });
    setMessage(result.ok ? "Zone created inactive. Review the area and fee settings before activating." : result.error);
    if (result.ok) window.location.reload();
  });
  const saveBranch = (input: Omit<Branch, "slug">) => startTransition(async () => {
    const result = await updateAdminBranchAction(input);
    setMessage(result.ok ? "Branch settings saved." : result.error);
    if (result.ok) window.location.reload();
  });
  const saveZone = (input: Omit<Zone, "branchId">) => startTransition(async () => {
    const result = await updateAdminZoneAction(input);
    setMessage(result.ok ? "Delivery zone saved." : result.error);
    if (result.ok) window.location.reload();
  });

  return (
    <div className="mt-7 space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-charcoal-900">Branches and operating hours</h2>
        <form action={createBranch} className="grid gap-3 rounded-2xl border border-charcoal-200/70 bg-white p-5 sm:grid-cols-3">
          <input name="name" required minLength={2} maxLength={120} placeholder="Branch name" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="url-slug" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="city" required minLength={2} maxLength={80} placeholder="City" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="address" required minLength={5} maxLength={500} placeholder="Address" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
          <input name="phone" maxLength={20} placeholder="Phone (optional)" className="rounded-lg border px-3 py-2 text-sm" />
          <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-3">Create inactive branch</button>
        </form>
        {branches.map((branch) => (
          <BranchEditor key={branch.id} branch={branch} pending={pending} onSave={saveBranch} />
        ))}
        {branches.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-charcoal-500">No branches exist yet.</p> : null}
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-charcoal-900">Delivery coverage and fees</h2>
        <form action={createZone} className="grid gap-3 rounded-2xl border border-charcoal-200/70 bg-white p-5 sm:grid-cols-3">
          <select name="branchId" required defaultValue="" className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="" disabled>Choose branch</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select>
          <input name="name" required minLength={2} maxLength={80} placeholder="Zone name" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="deliveryFee" required type="number" min="0" placeholder="Delivery fee (PKR)" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="etaMinutes" required type="number" min="5" max="240" placeholder="ETA minutes" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="freeAbove" type="number" min="0" placeholder="Free above (optional)" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="minOrder" type="number" min="0" placeholder="Minimum order (optional)" className="rounded-lg border px-3 py-2 text-sm" />
          <input name="areas" required placeholder="Exact areas, comma separated" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
          <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white">Create inactive zone</button>
        </form>
        {zones.map((zone) => (
          <ZoneEditor key={zone.id} zone={zone} pending={pending} onSave={saveZone} />
        ))}
        {zones.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-charcoal-500">No delivery zones exist yet. Create zones in the database before enabling delivery.</p> : null}
      </section>
      {message ? <p role="status" className="text-sm text-charcoal-600">{message}</p> : null}
      <p className="text-xs text-charcoal-400">Delivery areas are matched against the saved zone areas. Fee and minimum-order values are applied by the server during checkout.</p>
    </div>
  );
}

function BranchEditor({ branch, pending, onSave }: {
  branch: Branch;
  pending: boolean;
  onSave: (input: Omit<Branch, "slug">) => void;
}) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [phone, setPhone] = useState(branch.phone ?? "");
  const [city, setCity] = useState(branch.city);
  const [active, setActive] = useState(branch.isActive);
  const [delivery, setDelivery] = useState(branch.deliveryAvailable);
  const [pickup, setPickup] = useState(branch.pickupAvailable);
  const [hours, setHours] = useState<Hours[]>(() => branch.hours.length === 7
    ? branch.hours
    : DAYS.map((day) => ({ day, closed: true })));
  return (
    <article className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
      <h3 className="font-semibold text-charcoal-900">{branch.name} <span className="text-xs font-normal text-charcoal-400">/{branch.slug}</span></h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">City<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-normal" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label>
        <label><input type="checkbox" checked={pickup} onChange={(event) => setPickup(event.target.checked)} /> Pickup enabled</label>
        <label><input type="checkbox" checked={delivery} onChange={(event) => setDelivery(event.target.checked)} /> Delivery enabled</label>
      </div>
      <h4 className="mt-5 text-sm font-semibold text-charcoal-800">Weekly hours (Pakistan time)</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {hours.map((entry, index) => (
          <div key={entry.day} className="rounded-lg bg-cream-50 p-3 text-xs">
            <div className="mb-2 flex justify-between font-semibold"><span>{entry.day}</span><label><input type="checkbox" checked={entry.closed} onChange={(event) => setHours((current) => current.map((day, i) => i === index ? { ...day, closed: event.target.checked } : day))} /> Closed</label></div>
            <div className="flex gap-2">
              <input aria-label={`${entry.day} opens`} type="time" disabled={entry.closed} value={entry.open ?? ""} onChange={(event) => setHours((current) => current.map((day, i) => i === index ? { ...day, open: event.target.value } : day))} className="min-w-0 flex-1 rounded border px-2 py-1" />
              <input aria-label={`${entry.day} closes`} type="time" disabled={entry.closed} value={entry.close ?? ""} onChange={(event) => setHours((current) => current.map((day, i) => i === index ? { ...day, close: event.target.value } : day))} className="min-w-0 flex-1 rounded border px-2 py-1" />
            </div>
          </div>
        ))}
      </div>
      <button disabled={pending} onClick={() => onSave({ id: branch.id, name, address, phone, city, isActive: active, deliveryAvailable: delivery, pickupAvailable: pickup, hours })} className="mt-4 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save branch</button>
    </article>
  );
}

function ZoneEditor({ zone, pending, onSave }: {
  zone: Zone;
  pending: boolean;
  onSave: (input: Omit<Zone, "branchId">) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [areas, setAreas] = useState(zone.areas.join(", "));
  const [fee, setFee] = useState(String(zone.deliveryFee));
  const [freeAbove, setFreeAbove] = useState(zone.freeAbove == null ? "" : String(zone.freeAbove));
  const [minimum, setMinimum] = useState(zone.minOrder == null ? "" : String(zone.minOrder));
  const [eta, setEta] = useState(String(zone.etaMinutes));
  const [active, setActive] = useState(zone.isActive);
  return (
    <article className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
      <h3 className="font-semibold text-charcoal-900">{zone.name}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold">Zone name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">Delivery fee (PKR)<input type="number" min="0" value={fee} onChange={(event) => setFee(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">Estimated minutes<input type="number" min="5" max="240" value={eta} onChange={(event) => setEta(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">Free delivery above (PKR)<input type="number" min="0" value={freeAbove} onChange={(event) => setFreeAbove(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold">Minimum order (PKR)<input type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold sm:col-span-2 lg:col-span-1">Areas, comma separated<input value={areas} onChange={(event) => setAreas(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      </div>
      <label className="mt-3 block text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label>
      <button disabled={pending} onClick={() => onSave({
        id: zone.id,
        name,
        areas: areas.split(",").map((area) => area.trim()).filter(Boolean),
        deliveryFee: Number(fee),
        freeAbove: freeAbove ? Number(freeAbove) : undefined,
        minOrder: minimum ? Number(minimum) : undefined,
        etaMinutes: Number(eta),
        isActive: active,
      })} className="mt-4 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save delivery zone</button>
    </article>
  );
}
