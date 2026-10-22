"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import { getFloatingPosition } from "@/lib/floating-position";
import { cn } from "@/lib/utils";
import { COURT_CATEGORIES, formatCourtName, officialCourtValue, resolveCourt, searchCourts, type NepalCourt } from "@/lib/nepal-courts";

interface CourtSelectProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  "aria-label"?: string;
  required?: boolean;
  disabled?: boolean;
  /** Only existing-record editors may retain an unresolved source string. */
  preserveLegacy?: boolean;
  /** Filtering may reset to all courts; this is never a new court option. */
  filter?: boolean;
  className?: string;
}

/** Input/listbox semantics reuse the existing global palette pattern, Input,
 * Button and floating-position helper. No searchable Select/Popover is installed. */
export function CourtSelect({ id, value, onValueChange, required, disabled, preserveLegacy, filter, className, ...label }: CourtSelectProps) {
  const { language } = useI18n();
  const ne = language === "ne", selected = resolveCourt(value), unresolved = Boolean(value && !selected);
  const [open, setOpen] = React.useState(false), [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [position, setPosition] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const input = React.useRef<HTMLInputElement>(null), root = React.useRef<HTMLDivElement>(null), panel = React.useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = React.useState<Element | null>(null);
  const bindRoot = React.useCallback((node: HTMLDivElement | null) => {
    root.current = node;
    if (!node) return;
    let target = node.closest(".dashboard-theme");
    while (target?.parentElement?.closest(".dashboard-theme")) target = target.parentElement.closest(".dashboard-theme");
    setPortalRoot(target ?? document.body);
  }, []);
  const matches = searchCourts(query), listId = `${id}-options`, popupId = `${id}-popup`, warningId = `${id}-verification`;
  const close = () => { setOpen(false); setQuery(""); };
  const choose = (court: NepalCourt) => { onValueChange(officialCourtValue(court.id)!); close(); input.current?.focus(); };
  React.useEffect(() => {
    input.current?.setCustomValidity(!filter && value && !selected && !preserveLegacy
      ? ne ? "प्रमाणित अदालत रोज्नुहोस्।" : "Select a verified court." : "");
  }, [value, selected, preserveLegacy, filter, ne]);
  React.useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!input.current || !panel.current) return;
      const anchor = input.current.getBoundingClientRect(), width = Math.min(Math.max(anchor.width, 320), window.innerWidth - 16);
      const p = getFloatingPosition({ anchor, contentWidth: width, contentHeight: panel.current.getBoundingClientRect().height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, align: "start", gap: 4 });
      setPosition({ ...p, width });
    };
    update(); const observer = new ResizeObserver(update); if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !root.current?.contains(event.target as Node)) { setOpen(false); setQuery(""); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); setQuery(""); input.current?.focus(); } };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  React.useEffect(() => { if (open) panel.current?.querySelector(`[data-court-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active, open]);
  React.useEffect(() => {
    if (!open) return;
    const dialog = input.current?.closest('[role="dialog"]'), prior = dialog?.getAttribute("aria-owns");
    dialog?.setAttribute("aria-owns", [prior, popupId].filter(Boolean).join(" "));
    return () => { if (prior) dialog?.setAttribute("aria-owns", prior); else dialog?.removeAttribute("aria-owns"); };
  }, [open, popupId]);
  const popup = open ? <div ref={panel} id={popupId} className="court-select-popup" role="region" tabIndex={0} aria-label={ne ? "अदालत खोज नतिजा" : "Court search results"}
    style={{ left: position?.left ?? 8, top: position?.top ?? 8, width: position?.width, visibility: position ? "visible" : "hidden" }}
    onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node) && !panel.current?.contains(event.relatedTarget as Node)) close(); }}
    onKeyDown={event => { if (event.key === "Tab") { close(); input.current?.focus(); } }}
    onPointerDown={event => event.preventDefault()}>
    <div id={listId} role="listbox" aria-label={ne ? "प्रमाणित अदालतहरू" : "Verified courts"}>
      {Object.entries(COURT_CATEGORIES).map(([category, names]) => {
        const group = matches.filter(court => court.category === category);
        return group.length ? <div role="group" aria-label={names[language]} key={category}>
          <div className="court-select-category" aria-hidden="true">{names[language]}</div>
          {group.map(court => { const index = matches.indexOf(court); return <div key={court.id} id={`${id}-${court.id}`} role="option" aria-selected={selected?.id === court.id}
            data-court-id={court.id} data-court-index={index} data-active={active === index} className="court-select-option"
            onPointerMove={() => setActive(index)} onClick={() => choose(court)}>
            <span><span className="block">{court.name[language]}</span><span className="court-select-context">{court.province[language]} · {court.district[language]}{court.temporary ? ne ? " · अस्थायी इजलास" : " · Temporary bench" : ""}</span></span>
            {selected?.id === court.id ? <Check aria-hidden className="size-4 shrink-0" /> : null}
          </div>; })}
        </div> : null;
      })}
    </div>
    {!matches.length ? <p role="status" className="p-3 text-sm">{ne ? "प्रमाणित अदालत भेटिएन।" : "No verified court found."}</p> : null}
  </div> : null;
  return <div ref={bindRoot} data-slot="court-select" data-court-value={value} className={cn("min-w-0", className)}>
    <div className="relative">
      <Input ref={input} id={id} {...label} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-activedescendant={open && matches[active] ? `${id}-${matches[active].id}` : undefined} aria-describedby={unresolved ? warningId : undefined}
        required={required} disabled={disabled} autoComplete="off" className="court-select-input" placeholder={filter ? ne ? "सबै अदालतहरू" : "All courts" : ne ? "अदालत खोज्नुहोस्" : "Search courts"}
        value={open ? query : value ? formatCourtName(value, language) : ""}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onBlur={event => { if (!panel.current?.contains(event.relatedTarget as Node)) close(); }}
        onKeyDown={event => {
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
          else if (event.key === "Tab") close();
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(i => open ? Math.max(0, Math.min(matches.length - 1, i + (event.key === "ArrowDown" ? 1 : -1))) : 0); }
          else if (event.key === "Enter" && open) { event.preventDefault(); if (matches[active]) choose(matches[active]); }
          else if (open && (event.key === "Home" || event.key === "End")) { event.preventDefault(); setActive(event.key === "Home" ? 0 : matches.length - 1); }
        }} />
      <Button type="button" variant="ghost" disabled={disabled} className="court-select-trigger" tabIndex={-1}
        aria-label={ne ? "अदालतहरू खोल्नुहोस्" : "Open courts"} onMouseDown={event => event.preventDefault()}
        onClick={() => { setQuery(""); setActive(0); setOpen(!open); input.current?.focus(); }}><ChevronDown aria-hidden className="size-4" /></Button>
    </div>
    {selected ? <p data-court-selection className="mt-1 text-sm leading-relaxed wrap-anywhere">{selected.name[language]}</p> : null}
    {unresolved ? <p id={warningId} className="mt-1 text-xs text-muted-foreground wrap-anywhere">{value} — {ne ? "प्रमाणीकरण आवश्यक; मूल अभिलेख सुरक्षित छ।" : "Needs verification; original record preserved."}</p> : null}
    {filter && value ? <Button type="button" variant="ghost" size="sm" onClick={() => { onValueChange(""); close(); }}>{ne ? "सबै अदालतहरू" : "All courts"}</Button> : null}
    {popup && typeof document !== "undefined" ? createPortal(popup, portalRoot ?? document.body) : null}
  </div>;
}
