import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checklist({
  items,
  checked,
  onToggle,
  idPrefix,
}: {
  items: string[];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
  idPrefix: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const key = `${idPrefix}-${i}`;
        const isOn = !!checked[key];
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onToggle(key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-left transition-[border-color,background-color] duration-150",
                isOn
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-bg-elevated hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors",
                  isOn
                    ? "border-success/50 bg-success/20 text-success"
                    : "border-border-strong bg-bg text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              <span
                className={cn(
                  "text-sm leading-snug",
                  isOn ? "text-fg-muted line-through decoration-fg-subtle" : "text-fg",
                )}
              >
                {item}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
