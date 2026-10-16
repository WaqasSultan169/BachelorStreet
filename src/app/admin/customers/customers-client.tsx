"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateAdminCustomerStatusAction } from "@/server/actions/admin";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
};
type Results = { items: Customer[]; total: number; page: number; totalPages: number };

export function CustomersClient({ results, query }: { results: Results; query: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="mt-6">
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Search by name, email, or phone" className="min-w-64 flex-1 rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <ul className="mt-4 divide-y divide-charcoal-100 rounded-2xl border border-charcoal-200/70 bg-white">
        {results.items.map((customer) => (
          <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-charcoal-900">
                {customer.name}
                {customer.isDemo ? (
                  <span className="ml-2 rounded-full bg-charcoal-900 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-cream-50">
                    Demo
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-charcoal-600">{customer.email} {customer.emailVerified ? "· verified" : "· unverified"}</p>
              <p className="text-xs text-charcoal-400">{customer.phone ?? "No phone on file"}</p>
            </div>
            <button disabled={pending} onClick={() => startTransition(async () => {
              const result = await updateAdminCustomerStatusAction({ id: customer.id, isActive: !customer.isActive });
              setMessage(result.ok ? "Customer access updated." : result.error);
              if (result.ok) router.refresh();
            })} className="rounded-lg border border-charcoal-300 px-3 py-2 text-xs font-semibold">
              {customer.isActive ? "Disable account" : "Restore account"}
            </button>
          </li>
        ))}
        {results.items.length === 0 ? <li className="p-6 text-center text-sm text-charcoal-500">No matching customers.</li> : null}
      </ul>
      <div className="mt-4 flex justify-between text-sm">
        {results.page > 1 ? <Link href={customerHref(query, results.page - 1)} className="font-semibold text-tomato-600">Previous</Link> : <span />}
        <span className="text-charcoal-500">{results.total} customers · page {results.page}/{results.totalPages}</span>
        {results.page < results.totalPages ? <Link href={customerHref(query, results.page + 1)} className="font-semibold text-tomato-600">Next</Link> : null}
      </div>
      {message ? <p role="status" className="mt-3 text-sm text-charcoal-600">{message}</p> : null}
    </div>
  );
}

function customerHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/admin/customers?${params}`;
}
