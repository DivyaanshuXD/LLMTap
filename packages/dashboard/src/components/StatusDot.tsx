import { cn } from "@/lib/utils.ts";

export function StatusDot({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const isError = status === "error";
  return (
    <span
      className={cn(
        "relative flex h-3.5 w-3.5 items-center justify-center",
        className
      )}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          isError ? "bg-[#C5C6C7]/20" : "bg-[#66FCF1]/25"
        )}
      />
      <span
        className={cn(
          "relative h-2 w-2 rounded-full",
          isError ? "bg-[#C5C6C7]" : "bg-[#66FCF1]"
        )}
      />
    </span>
  );
}
