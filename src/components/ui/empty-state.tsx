import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-charcoal-300 bg-cream-100/50 px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-charcoal-400 shadow-sm">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-charcoal-900">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-charcoal-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}