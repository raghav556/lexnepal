"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, LockKeyhole, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";
import { getFloatingPosition } from "@/lib/floating-position";
import { AD_MIN_DATE, AD_MAX_DATE, BS_START_YEAR, BS_END_YEAR, bsToIsoDate, bsToString, gregorianToBs, parseBsString, toNepaliDigits, isIsoDateOnly, supportsBsConversion, nepalDateOnly, calendarMonthBounds, calendarMonthLabel, calendarDayLabel, calendarWeekdays, calendarMonthOptions, shiftCalendarMonth, canShiftCalendarMonth } from "@/lib/nepali-calendar";

type BsDateFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "ref"> & {
  /** Compatibility name; callbacks and storage remain Gregorian. */
  value?: string | null;
  onDateChange: (adDate: string) => void;
};
const subscribeToHydration = () => () => {};
const serverCalendarLanguage = () => "en" as const;
export function reportBsDateValidity(root: ParentNode = document): boolean {
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-slot="bs-date-field"] input[data-date-primary]')) {
    if (!input.reportValidity()) return false;
  }
  return true;
}
/** Locale controls presentation. Language changes never emit a date mutation. */
export const BsDateField = React.forwardRef<HTMLInputElement, BsDateFieldProps>(function BsDateField(
  { value = "", onDateChange, id, name, min, max, required, disabled, readOnly, onBlur, ...props }, forwardedRef,
) {
  const { language: preferredLanguage } = useI18n();
  // Match the server during hydration, then adopt the existing persisted locale.
  // Context updates still drive this snapshot; no second preference store is added.
  const language = React.useSyncExternalStore(subscribeToHydration, () => preferredLanguage, serverCalendarLanguage);
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const popoverId = `${fieldId}-picker`;
  const ne = language === "ne";
  const sourceValue = value ?? "";
  let current = sourceValue;
  try { if (sourceValue) current = nepalDateOnly(sourceValue); } catch { /* Preserve unsupported source text with an explicit notice. */ }
  const display = (ad: string) => {
    if (!ad || !ne) return ad;
    try { return toNepaliDigits(bsToString(gregorianToBs(ad))); } catch { return ""; }
  };
  const ref = React.useRef<HTMLInputElement | null>(null);
  const trigger = React.useRef<HTMLButtonElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = React.useState(`${language}|${sourceValue}`);
  const [draft, setDraft] = React.useState(() => display(current));
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const initial = supportsBsConversion(current) ? current : nepalDateOnly();
  const [month, setMonth] = React.useState(initial);
  const [focusDate, setFocusDate] = React.useState(initial);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  if (seen !== `${language}|${sourceValue}`) {
    setSeen(`${language}|${sourceValue}`); setDraft(display(current)); setError("");
    setMonth(initial); setFocusDate(initial);
  }
  React.useEffect(() => { ref.current?.setCustomValidity(""); }, [sourceValue, language]);
  const close = React.useCallback((restore = true) => { setOpen(false); if (restore) trigger.current?.focus(); }, []);
  const isAllowed = (ad: string) => supportsBsConversion(ad) && (!min || ad >= String(min)) && (!max || ad <= String(max));
  const choose = (ad: string) => {
    if (!isAllowed(ad)) return;
    ref.current?.setCustomValidity(""); setDraft(display(ad)); setError(""); if (ad !== current) onDateChange(ad); close();
  };
  React.useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const update = () => {
      if (!panel.current || !trigger.current) return;
      const rect = panel.current.getBoundingClientRect();
      setPosition(getFloatingPosition({ anchor: trigger.current.getBoundingClientRect(), contentWidth: rect.width, contentHeight: rect.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, align: "end", gap: 6 }));
    };
    update(); const observer = new ResizeObserver(update); observer.observe(panel.current);
    window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    const focus = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus());
    return () => { observer.disconnect(); cancelAnimationFrame(focus); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, month, language, focusDate]);
  React.useEffect(() => {
    if (!open) return;
    const parentDialog = trigger.current?.closest('[role="dialog"]');
    const priorOwnership = parentDialog?.getAttribute("aria-owns");
    parentDialog?.setAttribute("aria-owns", [priorOwnership, popoverId].filter(Boolean).join(" "));
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
    document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape, true);
      if (priorOwnership) parentDialog?.setAttribute("aria-owns", priorOwnership); else parentDialog?.removeAttribute("aria-owns");
    };
  }, [open, close, popoverId]);
  const unmapped = Boolean(current && !supportsBsConversion(current));
  let conversion = "";
  if (current) { try { conversion = ne ? current : bsToString(gregorianToBs(current)); } catch { conversion = ne ? current : "B.S. unavailable"; } }
  const bounds = calendarMonthBounds(month, language);
  const first = new Date(`${bounds.start}T12:00:00Z`), last = new Date(`${bounds.end}T12:00:00Z`);
  const count = Math.round((last.valueOf() - first.valueOf()) / 86400000) + 1;
  const monthNumber = ne ? gregorianToBs(month).month : Number(month.slice(5, 7));
  const yearNumber = ne ? gregorianToBs(month).year : Number(month.slice(0, 4));
  const changeHeading = (year: number, selectedMonth: number) => {
    try {
      const ad = ne ? bsToIsoDate({ year, month: selectedMonth, day: 1 }) : `${year}-${String(selectedMonth).padStart(2, "0")}-01`;
      const bounded = ad < AD_MIN_DATE ? AD_MIN_DATE : ad > AD_MAX_DATE ? AD_MAX_DATE : ad;
      setMonth(bounded); setFocusDate(bounded);
    } catch { /* Selectors expose supported years; boundary months retain valid dates. */ }
  };
  const descriptionId = `${fieldId}-calendar-description`, conversionId = `${fieldId}-conversion`;
  const popup = open ? <div ref={panel} id={popoverId} data-calendar-popover data-calendar-system={ne ? "bs" : "ad"}
    role="dialog" aria-modal="false" aria-label={ne ? "नेपाली मिति पात्रो" : "Gregorian date picker"}
    className="locale-date-popover" style={{ left: position?.left ?? 8, top: position?.top ?? 8, visibility: position ? "visible" : "hidden" }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), select'));
      if ((!event.shiftKey && document.activeElement === nodes.at(-1)) || (event.shiftKey && document.activeElement === nodes[0])) close();
    }}>
    <div className="locale-date-picker-heading">
      <button type="button" aria-label={ne ? "अघिल्लो महिना" : "Previous month"} disabled={!canShiftCalendarMonth(month, -1, language)} onClick={() => { const next = shiftCalendarMonth(month, -1, language); setMonth(next); setFocusDate(next); }}><ChevronLeft size={17} aria-hidden /></button>
      <strong aria-live="polite">{calendarMonthLabel(month, language)}</strong>
      <button type="button" aria-label={ne ? "अर्को महिना" : "Next month"} disabled={!canShiftCalendarMonth(month, 1, language)} onClick={() => { const next = shiftCalendarMonth(month, 1, language); setMonth(next); setFocusDate(next); }}><ChevronRight size={17} aria-hidden /></button>
      <button type="button" aria-label={ne ? "पात्रो बन्द गर्नुहोस्" : "Close calendar"} onClick={() => close()}><X size={17} aria-hidden /></button>
    </div>
    <div className="locale-date-picker-selects">
      <select aria-label={ne ? "महिना" : "Calendar month"} value={monthNumber} onChange={e => changeHeading(yearNumber, Number(e.target.value))}>{calendarMonthOptions(language).map((label, i) => <option value={i + 1} key={label}>{label}</option>)}</select>
      <select aria-label={ne ? "वर्ष" : "Calendar year"} value={yearNumber} onChange={e => changeHeading(Number(e.target.value), monthNumber)}>{Array.from({ length: ne ? BS_END_YEAR - BS_START_YEAR + 1 : Number(AD_MAX_DATE.slice(0, 4)) - Number(AD_MIN_DATE.slice(0, 4)) + 1 }, (_, i) => i + (ne ? BS_START_YEAR : Number(AD_MIN_DATE.slice(0, 4)))).map(year => <option key={year} value={year}>{ne ? toNepaliDigits(year) : year}</option>)}</select>
    </div>
    <div role="grid" aria-label={calendarMonthLabel(month, language)} className="locale-date-picker-grid" onKeyDown={event => {
      const ad = (event.target as HTMLElement).dataset.date; if (!ad) return;
      const weekday = new Date(`${ad}T12:00:00Z`).getUTCDay();
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }[event.key];
      let next: string | undefined;
      if (delta !== undefined) next = new Date(Date.parse(`${ad}T12:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);
      else if (event.key === "PageUp" || event.key === "PageDown") { try { next = shiftCalendarMonth(ad, event.key === "PageUp" ? -1 : 1, language); } catch { return; } }
      if (!next || !isAllowed(next)) return;
      event.preventDefault(); setFocusDate(next); setMonth(next);
    }}>
      <div role="row" className="locale-date-picker-weekdays">{calendarWeekdays(language).map(day => <span role="columnheader" key={day}>{day}</span>)}</div>
      {Array.from({ length: Math.ceil((first.getUTCDay() + count) / 7) }, (_, row) => <div role="row" key={row}>
        {Array.from({ length: 7 }, (_, weekday) => {
          const day = row * 7 + weekday - first.getUTCDay() + 1;
          if (day < 1 || day > count) return <span role="gridcell" key={weekday} />;
          const ad = new Date(first.valueOf() + (day - 1) * 86400000).toISOString().slice(0, 10);
          return <span role="gridcell" aria-selected={ad === current} key={ad}><button type="button" data-date={ad} aria-label={ne ? `${calendarDayLabel(ad, language)} ${calendarMonthLabel(ad, language)}` : ad} aria-current={ad === nepalDateOnly() ? "date" : undefined} aria-pressed={ad === current} disabled={!isAllowed(ad)} tabIndex={ad === focusDate ? 0 : -1} onClick={() => choose(ad)}>{calendarDayLabel(ad, language)}</button></span>;
        })}
      </div>)}
    </div>
  </div> : null;
  let portalRoot = trigger.current?.closest(".dashboard-theme") ?? null;
  while (portalRoot?.parentElement?.closest(".dashboard-theme")) portalRoot = portalRoot.parentElement.closest(".dashboard-theme");
  return <div className="locale-date-field min-w-0" data-slot="bs-date-field" data-calendar-system={ne ? "bs" : "ad"} data-ad-date={current}>
    <div className="locale-date-pair">
    <label className="locale-date-primary-label" htmlFor={fieldId}>{ne ? "नेपाली मिति (वि.सं.)" : "Gregorian (A.D.)"}</label>
    <div className="locale-date-primary">
      <Input {...props} className={cn(props.className, "min-h-11 sm:min-h-9")} id={fieldId} data-date-primary type="text" inputMode="text" name={undefined} placeholder={ne ? "वर्ष-महिना-दिन" : "YYYY-MM-DD"} value={draft} required={required && !unmapped} disabled={disabled} readOnly={readOnly}
        aria-label={props["aria-label"] ? `${props["aria-label"]} (${ne ? "वि.सं." : "A.D."})` : undefined} aria-invalid={Boolean(error) || props["aria-invalid"]} aria-describedby={[props["aria-describedby"], descriptionId, error ? `${fieldId}-error` : ""].filter(Boolean).join(" ")}
        ref={element => { ref.current = element; if (typeof forwardedRef === "function") forwardedRef(element); else if (forwardedRef) forwardedRef.current = element; }}
        onKeyDown={event => { props.onKeyDown?.(event); if (event.key === "ArrowDown" && !readOnly) { event.preventDefault(); setOpen(true); } }}
        onChange={event => {
          const next = event.target.value; setDraft(next); let problem = "";
          try {
            const ad = !next.trim() ? "" : ne ? bsToIsoDate(parseBsString(next)) : next.trim();
            if (ad && !isIsoDateOnly(ad)) throw new RangeError("Enter an A.D. date as YYYY-MM-DD.");
            if (ad && !supportsBsConversion(ad) && ad !== current) throw new RangeError(`Supported A.D. dates: ${AD_MIN_DATE}–${AD_MAX_DATE}.`);
            if (ad && min && ad < String(min)) throw new RangeError(`Choose a date on or after A.D. ${min}.`);
            if (ad && max && ad > String(max)) throw new RangeError(`Choose a date on or before A.D. ${max}.`);
            if (ad !== current) onDateChange(ad);
          } catch (failure) { problem = failure instanceof Error ? failure.message : "Invalid date."; }
          event.currentTarget.setCustomValidity(problem); setError(problem);
        }} onBlur={event => { setError(event.currentTarget.validationMessage); onBlur?.(event); }} />
      <button ref={trigger} type="button" className="locale-date-trigger" disabled={disabled || readOnly} aria-label={ne ? "मिति छान्नुहोस्" : "Open calendar"} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popoverId : undefined} onClick={() => { setPosition(null); setOpen(!open); }}><CalendarDays size={18} aria-hidden /></button>
    </div>
    <label className="locale-date-conversion-label" htmlFor={conversionId}>
      <span>{ne ? "ई.सं. रूपान्तरण" : "B.S. conversion"}<span className="sr-only">{ne ? " (स्वतः रूपान्तरित, पढ्न मात्र)" : " (automatic, read-only)"}</span></span>
      <LockKeyhole size={12} aria-hidden />
    </label>
    <Input className="locale-date-conversion" id={conversionId} data-date-conversion value={error ? "" : conversion} readOnly tabIndex={-1} placeholder="—" />
    </div>
    {name ? <input type="hidden" name={name} value={sourceValue} disabled={disabled} /> : null}
    <span className="sr-only" id={descriptionId} aria-live="polite">{conversion}</span>
    {unmapped ? <p className="text-xs text-muted-foreground">{ne ? "वि.सं. उपलब्ध छैन; पुरानो ई.सं. मिति सुरक्षित छ।" : "B.S. unavailable; existing A.D. date retained."}</p> : null}
    {error ? <p id={`${fieldId}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}
    {popup && typeof document !== "undefined" ? createPortal(popup, portalRoot ?? document.body) : null}
  </div>;
});
