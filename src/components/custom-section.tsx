import type { SectionProps } from "../types";
import { CustomList } from "./List";
import { Separator } from "./ui/separator";

export function CustomSection({
  label,
  items,
  queryKey,
  selectedIdentifier,
  clearKeys,
  emptyMessage,
  headerAction,
  searchPlaceholder,
}: SectionProps) {
  return (
    <section className="min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#151311] text-[#ece6dd] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
      <div className="shrink-0 flex gap-3 p-4 items-center justify-between">
        <h3 className="text-xl font-bold text-[#f3ede5] sm:text-2xl">{label}</h3>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <Separator />
      <div className="min-h-0 flex-1">
        <CustomList
          items={items}
          queryKey={queryKey}
          selectedIdentifier={selectedIdentifier}
          clearKeys={clearKeys}
          emptyMessage={emptyMessage}
          searchPlaceholder={searchPlaceholder}
        />
      </div>
    </section>
  );
}
