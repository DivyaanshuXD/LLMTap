"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  type HTMLMotionProps,
  type SpringOptions,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils.ts";

export type StarLayerProps = HTMLMotionProps<"div"> & {
  count: number;
  size: number;
  transition: Transition;
  starColor: string;
};

function generateStars(count: number, starColor: string) {
  const shadows: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(Math.random() * 4000) - 2000;
    const y = Math.floor(Math.random() * 4000) - 2000;
    shadows.push(`${x}px ${y}px ${starColor}`);
  }
  return shadows.join(", ");
}

export function StarLayer({
  count,
  size,
  transition,
  starColor,
  className,
  ...props
}: StarLayerProps) {
  const [boxShadow, setBoxShadow] = React.useState("");

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor));
  }, [count, starColor]);

  return (
    <motion.div
      data-slot="star-layer"
      animate={{ y: [0, -2000] }}
      transition={transition}
      className={cn("absolute left-0 top-0 h-[2000px] w-full", className)}
      {...props}
    >
      <div
        className="absolute rounded-full bg-transparent"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow,
        }}
      />
      <div
        className="absolute top-[2000px] rounded-full bg-transparent"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow,
        }}
      />
    </motion.div>
  );
}

export type StarsBackgroundProps = React.ComponentProps<"div"> & {
  factor?: number;
  speed?: number;
  transition?: SpringOptions;
  starColor?: string;
  pointerEvents?: boolean;
  transparent?: boolean;
  blendMode?: React.CSSProperties["mixBlendMode"];
  fieldOpacity?: number;
  layers?: Array<{
    count: number;
    size: number;
    durationMultiplier: number;
  }>;
};

export function StarsBackground({
  children,
  className,
  factor = 0.05,
  speed = 50,
  transition = { stiffness: 50, damping: 20 },
  starColor = "rgba(var(--rgb-accent-max), 0.32)",
  pointerEvents = true,
  transparent = false,
  blendMode = "screen",
  fieldOpacity = 1,
  layers = [
    { count: 1000, size: 1, durationMultiplier: 1 },
    { count: 400, size: 2, durationMultiplier: 2 },
    { count: 200, size: 3, durationMultiplier: 3 },
  ],
  ...props
}: StarsBackgroundProps) {
  const offsetX = useMotionValue(1);
  const offsetY = useMotionValue(1);

  const springX = useSpring(offsetX, transition);
  const springY = useSpring(offsetY, transition);

  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      offsetX.set(-(event.clientX - centerX) * factor);
      offsetY.set(-(event.clientY - centerY) * factor);
    },
    [factor, offsetX, offsetY]
  );

  return (
    <div
      data-slot="stars-background"
      className={cn(
        "relative size-full overflow-hidden",
        transparent
          ? "bg-transparent"
          : "bg-[radial-gradient(ellipse_at_bottom,var(--color-surface)_0%,var(--color-ink)_100%)]",
        className
      )}
      onMouseMove={factor > 0 ? handleMouseMove : undefined}
      {...props}
    >
      <motion.div
        style={{
          x: springX,
          y: springY,
          opacity: fieldOpacity,
          mixBlendMode: blendMode,
          willChange: "transform, opacity",
        }}
        className={cn({ "pointer-events-none": !pointerEvents })}
      >
        {layers.map((layer) => (
          <StarLayer
            key={`${layer.count}-${layer.size}-${layer.durationMultiplier}`}
            count={layer.count}
            size={layer.size}
            transition={{
              repeat: Infinity,
              duration: speed * layer.durationMultiplier,
              ease: "linear",
            }}
            starColor={starColor}
          />
        ))}
      </motion.div>
      {children}
    </div>
  );
}

export type GravityStarsProps = StarsBackgroundProps;

export function GravityStarsBackground(props: GravityStarsProps) {
  return <StarsBackground {...props} />;
}
