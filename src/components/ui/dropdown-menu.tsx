import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import {
  getFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from "@/lib/floating-position";
import { cn } from "@/lib/utils";

export function DropdownMenu({ children, className, keyboardNavigation = false }: any) {
  const [open, setOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (keyboardNavigation) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        setOpen(false);
        if (keyboardNavigation) anchorElement?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, anchorElement, keyboardNavigation]);

  return (
    <div className={cn("relative w-full text-left", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if ((child.type as any).displayName === "DropdownMenuTrigger") {
            return React.cloneElement(child as any, {
              onClick: (event: React.MouseEvent<HTMLElement>) => {
                setAnchorElement(event.currentTarget);
                setOpen((current) => !current);
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
                if (!keyboardNavigation || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
                event.preventDefault();
                setAnchorElement(event.currentTarget);
                setOpen(true);
              },
              open,
            });
          }
          if ((child.type as any).displayName === "DropdownMenuContent") {
            if (!open) return null;
            return React.cloneElement(child as any, {
              onClose: (restore = true) => {
                setOpen(false);
                if (restore && keyboardNavigation) anchorElement?.focus();
              },
              keyboardNavigation,
              anchorElement,
            });
          }
        }
        return child;
      })}
    </div>
  );
}

export const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, any>(
  ({ children, onClick, open, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        onClick={onClick}
        className="cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, any>(
  (
    {
      children,
      onClose,
      className,
      align = "end",
      side = "bottom",
      collisionAware = false,
      anchorElement,
      keyboardNavigation = false,
      forceMount: _forceMount,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    useLayoutEffect(() => {
      if (!collisionAware || !anchorElement || !contentRef.current) return;

      const updatePosition = () => {
        if (!contentRef.current) return;
        const anchor = anchorElement.getBoundingClientRect();
        const content = contentRef.current.getBoundingClientRect();
        setPosition(
          getFloatingPosition({
            anchor,
            contentWidth: content.width,
            contentHeight: content.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            align: align as FloatingAlign,
            side: side as FloatingSide,
          }),
        );
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      const resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(contentRef.current);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
        resizeObserver.disconnect();
      };
    }, [align, anchorElement, collisionAware, side]);

    React.useEffect(() => {
      if (!keyboardNavigation) return;
      const id = requestAnimationFrame(() => {
        const items = contentRef.current?.querySelectorAll<HTMLElement>(
          '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
        );
        items?.forEach((item) => {
          item.tabIndex = -1;
        });
        items?.[0]?.focus();
      });
      return () => cancelAnimationFrame(id);
    }, [keyboardNavigation]);

    const alignClass =
      align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
    const sideClass = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

    const menu = (
      <>
        <div className="fixed inset-0 z-[90]" onClick={() => onClose?.()} aria-hidden="true" />
        <div
          ref={setRefs}
          role="menu"
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            const item = (event.target as Element).closest('[role="menuitem"]');
            if (
              keyboardNavigation &&
              item &&
              item.getAttribute("aria-disabled") !== "true" &&
              !(item as HTMLButtonElement).disabled
            )
              onClose?.(false);
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
            if (!keyboardNavigation) return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
              ),
            );
            const current = items.indexOf(document.activeElement as HTMLElement);
            let next = current;
            if (event.key === "ArrowDown") next = (current + 1) % items.length;
            else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else if (event.key === "Tab") {
              onClose?.();
              return;
            } else if (
              ["Enter", " "].includes(event.key) &&
              document.activeElement?.tagName === "DIV"
            ) {
              event.preventDefault();
              (document.activeElement as HTMLElement).click();
              return;
            } else return;
            event.preventDefault();
            items[next]?.focus();
          }}
          style={
            collisionAware
              ? {
                  ...style,
                  left: position?.left ?? 0,
                  top: position?.top ?? 0,
                  visibility: position ? "visible" : "hidden",
                }
              : style
          }
          className={`${collisionAware ? "fixed min-w-0" : `absolute ${sideClass} ${alignClass} min-w-[14rem]`} z-[100] bg-dashboard-panel border border-dashboard-border rounded-xl shadow-xl py-1.5 ${className || ""}`}
          {...props}
        >
          {children}
        </div>
      </>
    );

    if (!collisionAware || typeof document === "undefined") return menu;

    // Escape clipped sidebars while retaining the portal-specific dashboard color variables.
    const portalContainer = anchorElement?.closest(".dashboard-theme") ?? document.body;
    return createPortal(menu, portalContainer);
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuGroup = ({ children }: any) => <>{children}</>;
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, any>(
  ({ children, className, onClick, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        role="menuitem"
        className={`px-3 py-2 text-xs font-medium text-foreground cursor-pointer hover:bg-dashboard-primary-soft hover:text-dashboard-primary transition-colors flex items-center ${className || ""}`}
        onClick={(e: React.MouseEvent) => {
          if (onClick) onClick(e);
        }}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = ({ children, className }: any) => (
  <div
    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground ${className || ""}`}
  >
    {children}
  </div>
);

export const DropdownMenuSeparator = () => <div className="h-px my-1 bg-dashboard-border" />;
