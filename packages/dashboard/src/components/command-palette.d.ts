declare module "@/components/command-palette" {
  import type { ReactNode } from "react";

  export type CommandPaletteItem = {
    id?: string;
    label: string;
    icon?: ReactNode;
    shortcut?: string[];
    keywords?: string[];
    onSelect?: () => void;
  };

  export type CommandPaletteGroup = {
    heading?: string;
    items: CommandPaletteItem[];
  };

  export function CommandPaletteProvider(props: {
    children: ReactNode;
  }): ReactNode;

  export function CommandPalette(props: {
    groups?: CommandPaletteGroup[];
    placeholder?: string;
    onSelect?: (item: CommandPaletteItem) => void;
    emptyMessage?: string;
    footer?: ReactNode | boolean;
    className?: string;
  }): ReactNode;

  export function CommandPaletteSearchTrigger(props?: {
    className?: string;
  }): ReactNode;

  export function useCommandPalette(): {
    isOpen: boolean;
    isClosing: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
}
