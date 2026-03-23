"use client";

import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, memo } from "react";
import { createPortal } from "react-dom";

const commandPaletteStyles = `
@keyframes command-palette-overshoot {
  0% {
    opacity: 0;
    transform: scale(0.94) translateY(-10px);
  }
  85% {
    opacity: 1;
    transform: scale(1.002) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes command-palette-close {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.94) translateY(-8px);
  }
}

@keyframes command-palette-backdrop-close {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}
`;

const CommandPaletteContext = createContext(null);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}

export function CommandPaletteProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const open = useCallback(() => {
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, close]);

  const value = useMemo(() => ({ isOpen, isClosing, open, close, toggle }), [isOpen, isClosing, open, close, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export const CommandPalette = memo(function CommandPalette({
  groups = [],
  placeholder = "Type a command or search...",
  onSelect,
  emptyMessage = "No results found.",
  footer,
  className = "",
}) {
  const { isOpen, isClosing, close } = useCommandPalette();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });

  const filteredGroups = useMemo(() => {
    const searchLower = search.toLowerCase();
    return groups.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(searchLower) ||
        item.keywords?.some((k) => k.toLowerCase().includes(searchLower))
      ),
    })).filter((group) => group.items.length > 0);
  }, [groups, search]);

  const allItems = useMemo(() => filteredGroups.flatMap((g) => g.items), [filteredGroups]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (!isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item) => {
    onSelect?.(item);
    item.onSelect?.();
    close();
  }, [onSelect, close]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsKeyboardNav(true);
      setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsKeyboardNav(true);
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      onSelect?.(allItems[selectedIndex]);
      allItems[selectedIndex].onSelect?.();
      close();
    }
  }, [allItems, selectedIndex, onSelect, close]);

  useEffect(() => {
    if (!isOpen) return;

    const keySequence = [];
    let keyTimeout;

    const handleShortcut = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      const key = e.key.toUpperCase();
      if (key.length === 1 && /[A-Z0-9]/.test(key)) {
        keySequence.push(key);
        clearTimeout(keyTimeout);
        keyTimeout = setTimeout(() => keySequence.length = 0, 500);

        for (const group of groups) {
          for (const item of group.items) {
            if (item.shortcut) {
              const shortcutKeys = item.shortcut.filter(k => !['⌘', 'Ctrl', '⇧', 'Shift', 'Alt', '⌥'].includes(k));
              if (shortcutKeys.length === keySequence.length && 
                  shortcutKeys.every((k, i) => k.toUpperCase() === keySequence[i])) {
                e.preventDefault();
                handleSelect(item);
                keySequence.length = 0;
                return;
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
      clearTimeout(keyTimeout);
    };
  }, [isOpen, groups, handleSelect]);

  useEffect(() => {
    if (!isKeyboardNav) return;
    
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      const groupContainer = selectedEl.closest('[data-group]');
      const heading = groupContainer?.querySelector('[data-heading]');
      const listContainer = listRef.current;
      
      if (heading && listContainer) {
        const headingRect = heading.getBoundingClientRect();
        const containerRect = listContainer.getBoundingClientRect();
        
        if (headingRect.top < containerRect.top) {
          heading.scrollIntoView({ block: "start" });
          setIsKeyboardNav(false);
          return;
        }
      }
      
      selectedEl.scrollIntoView({ block: "nearest" });
    }
    setIsKeyboardNav(false);
  }, [selectedIndex, isKeyboardNav]);

  if (!isOpen && !isClosing) return null;

  let itemIndex = -1;

  const paletteContent = (
    <>
      <style>{commandPaletteStyles}</style>
      
      <div
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
        style={{
          animation: isClosing
            ? "command-palette-backdrop-close 0.15s ease-in-out forwards"
            : "none",
          opacity: isClosing ? undefined : 1,
        }}
        onClick={close}
      />

      <div 
        className="fixed inset-0 z-[121] flex items-start justify-center px-4 pt-24 sm:px-6"
        onClick={close}
      >
        <div
          className={`
            w-full max-w-xl
            bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(5,9,18,0.96))] backdrop-blur-2xl
            border border-white/10
            rounded-3xl
            shadow-[0_40px_100px_rgba(0,0,0,0.5)]
            overflow-hidden
            ${className}
          `}
          style={{
            animation: isClosing
              ? "command-palette-close 0.35s ease-in-out forwards"
              : "command-palette-overshoot 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-14 items-center gap-3 border-b border-white/8 px-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
            />
            <button
              onClick={close}
              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={listRef}
            className="max-h-96 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredGroups.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-neutral-600">
                {emptyMessage}
              </div>
            ) : (
              filteredGroups.map((group, groupIndex) => (
                <div key={groupIndex} data-group>
                  {group.heading && (
                    <div data-heading className="px-3 py-1.5 text-xs font-medium text-neutral-500">
                      {group.heading}
                    </div>
                  )}
                  {group.items.map((item) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    return (
                      <CommandItem
                        key={item.id || currentIndex}
                        item={item}
                        index={currentIndex}
                        isSelected={selectedIndex === currentIndex}
                        onSelect={handleSelect}
                        onHover={setSelectedIndex}
                        isKeyboardNav={isKeyboardNav}
                        pointerPositionRef={pointerPositionRef}
                        setIsKeyboardNav={setIsKeyboardNav}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {footer !== false && (
            <div className="flex items-center gap-4 px-3 py-2 border-t border-neutral-800 text-xs text-neutral-600">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-500">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-500">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-500">esc</kbd>
                <span>Close</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(paletteContent, document.body);
});

const CommandItem = memo(function CommandItem({ item, index, isSelected, onSelect, onHover, isKeyboardNav, pointerPositionRef, setIsKeyboardNav }) {
  const handleMouseMove = useCallback((e) => {
    const { x, y } = pointerPositionRef.current;
    if (Math.abs(e.clientX - x) > 1 || Math.abs(e.clientY - y) > 1) {
      pointerPositionRef.current = { x: e.clientX, y: e.clientY };
      setIsKeyboardNav(false);
      onHover(index);
    }
  }, [index, onHover, pointerPositionRef, setIsKeyboardNav]);

  return (
    <button
      data-index={index}
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(item)}
      onMouseMove={handleMouseMove}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 mx-1
        text-left text-sm rounded-md cursor-pointer
        transition-colors duration-0 ease-out
        ${isSelected
          ? "bg-neutral-800 text-white"
          : "text-neutral-400"
        }
      `}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {item.icon && (
        <span className={`shrink-0 ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
          {item.icon}
        </span>
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.shortcut && (
        <span className="flex items-center gap-0.5 text-xs">
          {item.shortcut.map((key, i) => (
            <kbd
              key={i}
              className="px-1 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-500"
            >
              {key}
            </kbd>
          ))}
        </span>
      )}
    </button>
  );
});

export function CommandPaletteTrigger({ children, className = "" }) {
  const { open } = useCommandPalette();

  return (
    <button onClick={open} className={className}>
      {children}
    </button>
  );
}

export function CommandPaletteSearchTrigger({ className = "" }) {
  const { open } = useCommandPalette();
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');

  return (
    <button
      onClick={open}
      className={`
        inline-flex items-center gap-2
        pl-2.5 pr-2 h-8
        bg-neutral-950
        border border-neutral-800
        rounded-full cursor-pointer
        text-neutral-500
        transition-all duration-150 ease-out
        hover:bg-neutral-900/40 hover:border-neutral-700/50
        ${className}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-neutral-600"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="flex items-center gap-0.5">
        <kbd className="px-1.5 py-0.5 text-[11px] text-neutral-400 bg-neutral-800/80 border border-neutral-700/70 rounded-md font-medium">
          {isMac ? '⌘' : 'Ctrl'}
        </kbd>
        <kbd className="px-1.5 py-0.5 text-[11px] text-neutral-400 bg-neutral-800/80 border border-neutral-700/70 rounded-md font-medium">
          K
        </kbd>
      </span>
    </button>
  );
}
