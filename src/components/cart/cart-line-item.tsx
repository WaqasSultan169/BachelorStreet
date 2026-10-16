"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import {
  removeItem,
  setNote,
  setQuantity,
} from "@/store/slices/cartSlice";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductImage } from "@/components/ui/product-image";
import { formatPkr } from "@/lib/utils";
import type { CartLine } from "@/lib/types/cart";

export function CartLineItem({ line }: { line: CartLine }) {
  const dispatch = useAppDispatch();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(line.note ?? "");

  return (
    <li className="flex gap-4 py-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-charcoal-200/70">
        <ProductImage src={line.image} alt={line.name} sizes="80px" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal-900">{line.name}</p>
            <p className="text-sm text-charcoal-500">
              {formatPkr(line.unitPrice)} each
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(removeItem({ lineId: line.lineId }))}
            aria-label={`Remove ${line.name} from cart`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-charcoal-400 transition-colors hover:bg-tomato-100 hover:text-tomato-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {line.options.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5 text-xs text-charcoal-500">
            {line.options.map((option) => (
              <li key={option.optionKey}>
                <span className="font-medium text-charcoal-700">
                  {option.groupName}:
                </span>{" "}
                {option.optionName}
                {option.priceDelta > 0 ? ` (+${formatPkr(option.priceDelta)})` : ""}
              </li>
            ))}
          </ul>
        ) : null}

        {line.note && !editingNote ? (
          <p className="mt-1.5 rounded-lg bg-cream-100 px-2 py-1 text-xs text-charcoal-600">
            Note: {line.note}
          </p>
        ) : null}

        {editingNote ? (
          <div className="mt-2">
            <label htmlFor={`note-${line.lineId}`} className="sr-only">
              Special instructions for {line.name}
            </label>
            <textarea
              id={`note-${line.lineId}`}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Any special instructions?"
              className="w-full rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-500/40"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                className="text-xs font-semibold text-tomato-600 hover:text-tomato-700"
                onClick={() => {
                  dispatch(setNote({ lineId: line.lineId, note: noteDraft }));
                  setEditingNote(false);
                }}
              >
                Save note
              </button>
              <button
                type="button"
                className="text-xs font-medium text-charcoal-500 hover:text-charcoal-700"
                onClick={() => {
                  setNoteDraft(line.note ?? "");
                  setEditingNote(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-charcoal-500 hover:text-charcoal-800"
            onClick={() => setEditingNote(true)}
          >
            <Pencil className="h-3 w-3" />
            {line.note ? "Edit note" : "Add note"}
          </button>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            onChange={(quantity) =>
              dispatch(setQuantity({ lineId: line.lineId, quantity }))
            }
            label={`Quantity for ${line.name}`}
          />
          <span className="font-semibold text-charcoal-900">
            {formatPkr(line.unitPrice * line.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}
