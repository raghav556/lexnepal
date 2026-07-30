import * as React from "react"
import { useState, useRef, useEffect } from "react"

export function DropdownMenu({ children }: any) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if ((child.type as any).displayName === "DropdownMenuTrigger") {
            return React.cloneElement(child as any, { 
              onClick: () => setOpen(!open),
              open
            })
          }
          if ((child.type as any).displayName === "DropdownMenuContent") {
            if (!open) return null
            return React.cloneElement(child as any, { 
              onClose: () => setOpen(false)
            })
          }
        }
        return child
      })}
    </div>
  )
}

export const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, any>(({ children, onClick, open, asChild, ...props }, ref) => {
  return (
    <div ref={ref} onClick={onClick} className="cursor-pointer" {...props}>
      {children}
    </div>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, any>(({ children, onClose, className, align = "end", ...props }, ref) => {
  const alignClass = align === "end" ? "right-0" : "left-0";
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        ref={ref} 
        className={`absolute z-50 mt-2 ${alignClass} bg-card border border-border rounded-md shadow-lg py-1 ${className || ""}`}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuGroup = ({ children }: any) => <>{children}</>
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, any>(({ children, className, onClick, ...props }, ref) => (
  <div 
    ref={ref} 
    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${className || ""}`}
    onClick={(e) => {
      if (onClick) onClick(e);
    }}
    {...props}
  >
    {children}
  </div>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

export const DropdownMenuLabel = ({ children, className }: any) => (
  <div className={`px-3 py-1.5 text-sm font-semibold ${className || ""}`}>{children}</div>
)

export const DropdownMenuSeparator = () => (
  <div className="h-px my-1 bg-border" />
)
