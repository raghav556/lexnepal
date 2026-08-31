import * as React from "react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import {
  getFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from "@/lib/floating-position";

export function DropdownMenu({ children }: any) {
  const [open, setOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative w-full text-left">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if ((child.type as any).displayName === "DropdownMenuTrigger") {
            return React.cloneElement(child as any, {
              onClick: (event: React.MouseEvent<HTMLElement>) => {
                setAnchorElement(event.currentTarget);
                setOpen((current) => !current);
              },
              open,
            });
          }
          if ((child.type as any).displayName === "DropdownMenuContent") {
            if (!open) return null;
            return React.cloneElement(child as any, {
              onClose: () => setOpen(false),
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

    const alignClass =
      align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
    const sideClass = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

    const menu = (
      <>
        <div className="fixed inset-0 z-[90]" onClick={onClose} aria-hidden="true" />
        <div
          ref={setRefs}
          role="menu"
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
