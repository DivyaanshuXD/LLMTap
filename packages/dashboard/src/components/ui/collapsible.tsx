"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

type CollapsibleTriggerProps = React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
  render?: React.ReactElement;
};

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

const CollapsibleTrigger = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  CollapsibleTriggerProps
>(({ render, children, ...props }, ref) => {
  if (render) {
    return (
      <CollapsiblePrimitive.CollapsibleTrigger asChild ref={ref} {...props}>
        {render}
      </CollapsiblePrimitive.CollapsibleTrigger>
    );
  }

  return (
    <CollapsiblePrimitive.CollapsibleTrigger ref={ref} {...props}>
      {children}
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
});

CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
