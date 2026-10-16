import { cn } from "@/lib/utils";
import type { PublicOptionGroupDto } from "@/lib/types/menu";

export function OptionGroup({
  group,
  selected,
  onToggle,
}: {
  group: PublicOptionGroupDto;
  selected: string[];
  onToggle: (optionKey: string) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-charcoal-900">
        <span>
          {group.name}
          {group.required ? (
            <span className="ml-1 text-tomato-600" aria-hidden>
              *
            </span>
          ) : (
            <span className="ml-1 text-xs font-normal text-charcoal-400">
              optional
            </span>
          )}
        </span>
        {group.type === "multi" && group.max ? (
          <span className="text-xs font-normal text-charcoal-400">
            up to {group.max}
          </span>
        ) : null}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {group.options.map((option) => {
          const checked = selected.includes(option.key);
          return (
            <label
              key={option.key}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                checked
                  ? "border-tomato-500 bg-tomato-100/50"
                  : "border-charcoal-200 hover:border-charcoal-300",
              )}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type={group.type === "single" ? "radio" : "checkbox"}
                  name={group.key}
                  checked={checked}
                  onChange={() => onToggle(option.key)}
                  className="h-4 w-4 accent-tomato-600"
                />
                <span className="font-medium text-charcoal-800">
                  {option.name}
                </span>
              </span>
              {option.priceDelta > 0 ? (
                <span className="text-xs font-semibold text-charcoal-600">
                  +{option.priceDelta}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
