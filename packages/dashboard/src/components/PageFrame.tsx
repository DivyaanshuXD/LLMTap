import type { ReactNode } from "react";
import { SectionBanner } from "./system/SectionBanner.tsx";

interface PageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function PageFrame({
  eyebrow,
  title,
  description,
  aside,
  children,
}: PageFrameProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6">
      <SectionBanner
        context={eyebrow}
        title={title}
        description={description}
        tags={["Local-first telemetry", "Streaming traces", "Cost intelligence"]}
        rightSlot={aside}
      />

      {children}
    </div>
  );
}
