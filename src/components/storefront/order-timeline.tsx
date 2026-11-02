import { CheckCircle2, Circle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ORDER_FLOW, isTerminal } from "@/lib/order";
import { cn } from "@/lib/utils";

/**
 * Status timeline.
 *
 * Stages before the current one read as done, later ones as pending. A refused
 * or cancelled order leaves the flow, so nothing is marked done past the point
 * it stopped rather than implying progress that did not happen.
 */
export function Timeline({ status }: { status: string }) {
  const { t } = useI18n();
  const stopped = isTerminal(status);
  const currentIndex = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);

  return (
    <ol className="flex flex-col gap-0 rounded-[16px] border border-outline bg-surface p-5">
      {ORDER_FLOW.map((stage, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const active = currentIndex === index;
        const failed = stopped && active;
        return (
          <li key={stage} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2",
                  failed
                    ? "border-error text-error"
                    : done || active
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline text-on-surface-muted",
                )}
              >
                {done ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <Circle size={10} aria-hidden="true" />
                )}
              </span>
              {index < ORDER_FLOW.length - 1 && (
                <span
                  className={cn("w-0.5 flex-1", done ? "bg-primary" : "bg-outline")}
                  aria-hidden="true"
                />
              )}
            </span>
            <span className={cn("pb-6 text-sm", active ? "font-medium" : "text-on-surface-muted")}>
              {t(`status.${stage}` as "status.pending")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
