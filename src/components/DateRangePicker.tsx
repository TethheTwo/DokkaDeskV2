import { useEffect, useRef, useState } from "react";
import { format, subDays, differenceInCalendarDays, addMonths, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(value);
  const [calMonth1, setCalMonth1] = useState<Date>(draftRange?.from ?? subDays(new Date(), 30));
  const [calMonth2, setCalMonth2] = useState<Date>(addMonths(calMonth1, 1));

  const [textFrom, setTextFrom] = useState("");
  const [textTo, setTextTo] = useState("");
  const [textErr, setTextErr] = useState("");

  const dragRef = useRef<{ dragging: boolean; anchor: Date | null; startX: number; startY: number }>(
    { dragging: false, anchor: null, startX: 0, startY: 0 }
  );
  const wasDraggedRef = useRef(false);
  const calendarAreaRef = useRef<HTMLDivElement>(null);

  const from = value.from ?? subDays(new Date(), 29);
  const to = value.to ?? new Date();
  const rangeLabel = `${format(from, "dd MMM yyyy", { locale: es })} – ${format(to, "dd MMM yyyy", { locale: es })}`;

  const handleSelect = (range: DateRange | undefined) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    setDraftRange(range);
    if (range?.from && range?.to) {
      setTextFrom(format(range.from, "dd/MM/yyyy"));
      setTextTo(format(range.to, "dd/MM/yyyy"));
    }
  };

  useEffect(() => {
    const el = calendarAreaRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest("[data-day]");
      if (!target) return;
      if (!el.contains(target as HTMLElement)) return;
      const dateStr = target.getAttribute("data-day");
      if (!dateStr) return;
      const day = new Date(dateStr);
      if (isNaN(day.getTime())) return;
      dragRef.current = { dragging: false, anchor: day, startX: e.clientX, startY: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.anchor) return;
      if (!drag.dragging && (Math.abs(e.clientX - drag.startX) > 5 || Math.abs(e.clientY - drag.startY) > 5)) {
        drag.dragging = true;
        wasDraggedRef.current = true;
        setDraftRange({ from: drag.anchor, to: drag.anchor });
      }
      if (!drag.dragging) return;
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-day]");
      if (!target) return;
      const dateStr = target.getAttribute("data-day");
      if (!dateStr) return;
      const day = new Date(dateStr);
      if (isNaN(day.getTime())) return;
      setDraftRange({ from: drag.anchor < day ? drag.anchor : day, to: drag.anchor < day ? day : drag.anchor });
    };

    const onPointerUp = () => {
      dragRef.current.dragging = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const draftFrom = draftRange?.from ?? from;
  const draftTo = draftRange?.to ?? to;
  const draftDays = Math.max(1, differenceInCalendarDays(draftTo, draftFrom) + 1);

  const applyPreset = (n: number) => {
    const t = new Date();
    const from = subDays(t, n - 1);
    const to = t;
    setDraftRange({ from, to });
    setTextFrom(format(from, "dd/MM/yyyy"));
    setTextTo(format(to, "dd/MM/yyyy"));
    setTextErr("");
  };

  const confirmRange = () => {
    if (draftRange?.from && draftRange?.to) {
      onChange({ from: draftRange.from, to: draftRange.to });
      setPickerOpen(false);
    }
  };

  const openPicker = () => {
    setDraftRange(value);
    setPickerOpen(true);
    if (value.from && value.to) {
      setTextFrom(format(value.from, "dd/MM/yyyy"));
      setTextTo(format(value.to, "dd/MM/yyyy"));
    }
    setTextErr("");
  };

  const applyTextInput = () => {
    setTextErr("");
    if (!textFrom.trim() || !textTo.trim()) {
      setTextErr("Ambos campos son obligatorios");
      return;
    }
    const parsedFrom = parse(textFrom.trim(), "dd/MM/yyyy", new Date());
    const parsedTo = parse(textTo.trim(), "dd/MM/yyyy", new Date());
    if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
      setTextErr("Formato inválido. Use dd/mm/yyyy");
      return;
    }
    const rFrom = new Date(parsedFrom.getFullYear(), parsedFrom.getMonth(), parsedFrom.getDate(), 0, 0, 0, 0);
    const rTo = new Date(parsedTo.getFullYear(), parsedTo.getMonth(), parsedTo.getDate(), 23, 59, 59, 999);
    setDraftRange({ from: rFrom, to: rTo });
    setCalMonth1(rFrom > subDays(new Date(), 30) ? subDays(rFrom, 15) : rFrom);
    setCalMonth2(addMonths(rFrom, 1));
  };

  return (
    <>
      <button
        onClick={openPicker}
        className="flex items-center bg-[#f2f3f6] border border-[#d1d5db] rounded-md px-3 h-10 focus-within:ring-2 focus-within:ring-[#005da9]/40 transition-all gap-2"
      >
        <CalendarIcon className="h-4 w-4 text-[#575f67]" />
        <span className="text-body-medium text-[#191c1e]">{rangeLabel}</span>
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden border border-[#e2e8f0] shadow-xl">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#e2e8f0]">
            <DialogTitle className="text-base font-semibold text-[#191c1e]">
              Seleccionar rango de fechas
            </DialogTitle>
            <p className="text-label-sm text-[#414752] mt-1">
              Haz clic en la fecha de inicio y luego en la de fin.
            </p>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-2 px-6 pt-4">
            {[
              { label: "Hoy", n: 1 },
              { label: "7 días", n: 7 },
              { label: "30 días", n: 30 },
              { label: "90 días", n: 90 },
              { label: "1 año", n: 365 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.n)}
                className={`h-8 px-3 rounded-md border text-label-sm transition-colors ${
                  draftDays === p.n
                    ? "bg-[rgba(0,93,169,0.1)] text-[#005da9] border-[#005da9] font-bold"
                    : "border-[#d1d5db] text-[#575f67] hover:bg-[#e7e8eb]"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="w-px h-8 bg-[#e2e8f0] mx-1" />
            <div>
              <label className="block text-label-sm text-[#414752] mb-1 leading-none">Desde</label>
              <input
                type="text"
                value={textFrom}
                onChange={(e) => setTextFrom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyTextInput()}
                placeholder="dd/mm/yyyy"
                className="h-8 w-[130px] px-2.5 rounded-md border border-[#d1d5db] bg-[#f8f9fc] focus:border-[#005da9] focus:ring-2 focus:ring-[#005da9]/40 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-label-sm text-[#414752] mb-1 leading-none">Hasta</label>
              <input
                type="text"
                value={textTo}
                onChange={(e) => setTextTo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyTextInput()}
                placeholder="dd/mm/yyyy"
                className="h-8 w-[130px] px-2.5 rounded-md border border-[#d1d5db] bg-[#f8f9fc] focus:border-[#005da9] focus:ring-2 focus:ring-[#005da9]/40 outline-none transition-all text-sm"
              />
            </div>
            <button
              onClick={applyTextInput}
              className="h-8 px-3 rounded-md bg-[#005da9] hover:bg-[#2868b3] text-white text-xs font-medium transition-colors"
            >
              Aplicar
            </button>
            {textErr && (
              <span className="text-xs text-red-600 ml-1 self-center">{textErr}</span>
            )}
          </div>

          <div
            ref={calendarAreaRef}
            className="flex justify-center gap-4 px-4 py-4 select-none"
          >
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={handleSelect}
              month={calMonth1}
              onMonthChange={setCalMonth1}
              captionLayout="dropdown"
              locale={es}
              showOutsideDays
              fromYear={new Date().getFullYear() - 100}
              toYear={new Date().getFullYear() + 10}
              className="pointer-events-auto"
            />
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={handleSelect}
              month={calMonth2}
              onMonthChange={setCalMonth2}
              captionLayout="dropdown"
              locale={es}
              showOutsideDays
              fromYear={new Date().getFullYear() - 100}
              toYear={new Date().getFullYear() + 10}
              className="pointer-events-auto"
            />
          </div>

          <DialogFooter className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8f9fc] gap-2 sm:gap-2">
            <div className="mr-auto text-label-sm text-[#191c1e] self-center">
              {draftRange?.from && draftRange?.to ? (
                <>
                  <span className="font-semibold text-[#191c1e]">
                    {format(draftRange.from, "dd MMM yyyy", { locale: es })}
                  </span>
                  {" – "}
                  <span className="font-semibold text-[#191c1e]">
                    {format(draftRange.to, "dd MMM yyyy", { locale: es })}
                  </span>
                </>
              ) : draftRange?.from ? (
                <>Selecciona la fecha de fin…</>
              ) : (
                <>Selecciona la fecha de inicio…</>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setPickerOpen(false)}
              className="border-[#d1d5db] text-[#575f67] hover:bg-[#f2f3f6]"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRange}
              disabled={!draftRange?.from || !draftRange?.to}
              className="bg-[#005da9] hover:bg-[#2868b3] text-white"
            >
              Aplicar rango
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
