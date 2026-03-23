import { cn } from "@/lib/utils.ts";
import StatisticsWithStatus, {
  type StatisticsCardProps,
} from "@/components/shadcn-studio/blocks/statistics-with-status.tsx";

type StatisticsWithStatusGridProps = {
  cards: StatisticsCardProps[];
  className?: string;
};

export function StatisticsWithStatusGrid({ cards, className }: StatisticsWithStatusGridProps) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:px-8 xl:grid-cols-4",
        className
      )}
    >
      {cards.map((card, index) => (
        <StatisticsWithStatus key={`${card.title}-${index}`} {...card} />
      ))}
    </div>
  );
}
