"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminStaffAction } from "@/server/actions/admin";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin" | "delivery_boy";
  isActive: boolean;
  emailNotificationConsent: boolean;
  phoneNotificationConsent: boolean;
};
type Results = { items: Staff[]; total: number; page: number; totalPages: number };

export function StaffClient({ results, query }: { results: Results; query: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="mt-6">
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={query} placeholder="Search by name, email, or phone" className="min-w-64 flex-1 rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-charcoal-200/70 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase text-charcoal-400"><tr><th className="p-4">Person</th><th>Contact</th><th>Role</th><th>Access</th><th>Assignment notices</th><th></th></tr></thead>
          <tbody className="divide-y divide-charcoal-100">
            {results.items.map((person) => (
              <StaffRow key={person.id} person={person} pending={pending} onSave={(role, isActive) => {
                startTransition(async () => {
                  const result = await updateAdminStaffAction({ id: person.id, role, isActive });
                  setMessage(result.ok ? "Staff access updated." : result.error);
                  if (result.ok) router.refresh();
                });
              }} />
            ))}
            {results.items.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-charcoal-500">No matching accounts.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-sm">
        {results.page > 1 ? <Link href={staffHref(query, results.page - 1)} className="font-semibold text-tomato-600">Previous</Link> : <span />}
        <span className="text-charcoal-500">{results.total} accounts · page {results.page}/{results.totalPages}</span>
        {results.page < results.totalPages ? <Link href={staffHref(query, results.page + 1)} className="font-semibold text-tomato-600">Next</Link> : null}
      </div>
      {message ? <p role="status" className="mt-3 text-sm text-charcoal-600">{message}</p> : null}
    </div>
  );
}

function StaffRow({ person, pending, onSave }: {
  person: Staff;
  pending: boolean;
  onSave: (role: Staff["role"], active: boolean) => void;
}) {
  const [role, setRole] = useState<Staff["role"]>(person.role);
  const [active, setActive] = useState(person.isActive);
  return (
    <tr>
      <td className="p-4 font-medium">{person.name}<span className="block text-xs text-charcoal-400">{person.id}</span></td>
      <td>{person.email}<span className="block text-xs text-charcoal-400">{person.phone ?? "No phone"}</span></td>
      <td>
        <select value={role} onChange={(event) => setRole(event.target.value as Staff["role"])} className="rounded border border-charcoal-200 bg-white px-2 py-1">
          <option value="customer">Customer</option><option value="delivery_boy">Delivery personnel</option><option value="admin">Admin</option>
        </select>
      </td>
      <td><label className="text-xs"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label></td>
      <td className="text-xs text-charcoal-600">
        Email {person.emailNotificationConsent ? "opted in" : "not opted in"}<br />
        Phone {person.phoneNotificationConsent ? "opted in" : "not opted in"}
      </td>
      <td><button disabled={pending} onClick={() => onSave(role, active)} className="rounded bg-charcoal-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button></td>
    </tr>
  );
}

function staffHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/admin/staff?${params}`;
}
