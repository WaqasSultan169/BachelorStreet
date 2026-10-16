import { cn } from "@/lib/utils";

export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-flame-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-black tracking-tight text-charcoal-900 sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-3 text-base text-charcoal-600">{lead}</p> : null}
    </div>
  );
}