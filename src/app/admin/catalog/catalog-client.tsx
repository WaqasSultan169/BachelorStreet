"use client";

import { useState, useTransition } from "react";
import {
  createAdminCategoryAction,
  createAdminProductAction,
  updateAdminCategoryAction,
  updateAdminProductAction,
} from "@/server/actions/admin";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryId: string;
  categoryName: string;
  isAvailable: boolean;
  isActive: boolean;
  stockQuantity: number | null;
};
type Category = { id: string; name: string; slug: string; isActive: boolean; sortOrder: number };

export function CatalogClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const submitCategory = (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    startTransition(async () => {
      const result = await createAdminCategoryAction({ name, slug, description });
      setNotice(result.ok ? "Category created." : result.error);
      if (result.ok) window.location.reload();
    });
  };

  return (
    <div className="mt-7 space-y-8">
      <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <h2 className="font-display text-xl font-semibold">Categories</h2>
        <form action={submitCategory} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input name="name" required minLength={2} maxLength={80} placeholder="Category name" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} placeholder="url-slug" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
          <input name="description" maxLength={300} placeholder="Description (optional)" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
          <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add category</button>
        </form>
        <ul className="mt-4 divide-y divide-charcoal-100">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{category.name} <span className="text-xs text-charcoal-400">/{category.slug}</span></span>
              <button
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const result = await updateAdminCategoryAction({ id: category.id, isActive: !category.isActive });
                  setNotice(result.ok ? "Category updated." : result.error);
                  if (result.ok) window.location.reload();
                })}
                className="text-xs font-semibold text-tomato-600"
              >{category.isActive ? "Hide" : "Publish"}</button>
            </li>
          ))}
        </ul>
      </section>

      <form action={(formData) => {
        const stock = String(formData.get("stockQuantity") ?? "").trim();
        startTransition(async () => {
          const result = await createAdminProductAction({
            name: String(formData.get("name") ?? ""),
            slug: String(formData.get("slug") ?? ""),
            description: String(formData.get("description") ?? ""),
            price: Number(formData.get("price")),
            categoryId: String(formData.get("categoryId") ?? ""),
            stockQuantity: stock ? Number(stock) : null,
          });
          setNotice(result.ok ? "Product created." : result.error);
          if (result.ok) window.location.reload();
        });
      }} className="grid gap-3 rounded-2xl border border-charcoal-200/70 bg-white p-5 sm:grid-cols-3">
        <h2 className="font-display text-xl font-semibold sm:col-span-3">Create product</h2>
        <input name="name" required minLength={2} maxLength={120} placeholder="Product name" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={140} placeholder="url-slug" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <input name="price" required type="number" min="0" step="1" placeholder="Price (PKR)" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <select name="categoryId" required defaultValue="" className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm">
          <option value="" disabled>Choose category</option>
          {categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input name="stockQuantity" type="number" min="0" step="1" placeholder="Stock (blank = unlimited)" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <input name="description" maxLength={1000} placeholder="Description" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" />
        <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create product</button>
      </form>

      <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <h2 className="font-display text-xl font-semibold">Products and availability</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-charcoal-400"><tr><th className="py-2">Product</th><th>Category</th><th>Price (PKR)</th><th>Stock</th><th>Available</th><th>Published</th><th></th></tr></thead>
            <tbody className="divide-y divide-charcoal-100">
              {products.map((product) => <ProductRow key={product.id} product={product} pending={pending} onSave={(input) => {
                startTransition(async () => {
                  const result = await updateAdminProductAction(input);
                  setNotice(result.ok ? `${product.name} saved.` : result.error);
                  if (result.ok) window.location.reload();
                });
              }} />)}
            </tbody>
          </table>
        </div>
      </section>
      {notice ? <p role="status" className="text-sm text-charcoal-600">{notice}</p> : null}
      <p className="text-xs text-charcoal-400">An empty stock value means unlimited stock. Orders requesting more than finite stock are rejected.</p>
    </div>
  );
}

function ProductRow({ product, pending, onSave }: {
  product: Product;
  pending: boolean;
  onSave: (input: { id: string; price: number; stockQuantity: number | null; isAvailable: boolean; isActive: boolean }) => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(product.stockQuantity == null ? "" : String(product.stockQuantity));
  const [available, setAvailable] = useState(product.isAvailable);
  const [active, setActive] = useState(product.isActive);
  return (
    <tr>
      <td className="py-3 font-medium">{product.name}<span className="block text-xs text-charcoal-400">/{product.slug}</span></td>
      <td>{product.categoryName}</td>
      <td><input aria-label={`${product.name} price`} type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className="w-28 rounded border border-charcoal-200 px-2 py-1" /></td>
      <td><input aria-label={`${product.name} stock`} type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Unlimited" className="w-28 rounded border border-charcoal-200 px-2 py-1" /></td>
      <td><input aria-label={`${product.name} available`} type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /></td>
      <td><input aria-label={`${product.name} published`} type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></td>
      <td><button disabled={pending} onClick={() => onSave({
        id: product.id,
        price: Number(price),
        stockQuantity: stock.trim() ? Number(stock) : null,
        isAvailable: available,
        isActive: active,
      })} className="rounded bg-charcoal-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button></td>
    </tr>
  );
}
