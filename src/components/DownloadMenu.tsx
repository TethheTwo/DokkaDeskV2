import { useState } from "react";
import { FileDown, FileText, ChevronDown, Table2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker } from "@/components/DateRangePicker";
import { rangeToday, rangeYesterday, type DateRange } from "@/lib/report-exports";

interface Props {
  onPDF: (range: DateRange) => void;
  onExcel: (range: DateRange) => void;
  hidden?: boolean;
}

const defaults = { from: new Date(), to: new Date() };

export function DownloadMenu({ onPDF, onExcel, hidden }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"today" | "yesterday" | "custom">("today");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(defaults);

  if (hidden) return null;

  const resolve = (): DateRange => {
    if (mode === "today") return rangeToday();
    if (mode === "yesterday") return rangeYesterday();
    const from = new Date(customRange.from.getFullYear(), customRange.from.getMonth(), customRange.from.getDate(), 0, 0, 0, 0);
    const to = new Date(customRange.to.getFullYear(), customRange.to.getMonth(), customRange.to.getDate(), 23, 59, 59, 999);
    const fromStr = `${String(from.getDate()).padStart(2, "0")}/${String(from.getMonth() + 1).padStart(2, "0")}/${from.getFullYear()}`;
    const toStr = `${String(to.getDate()).padStart(2, "0")}/${String(to.getMonth() + 1).padStart(2, "0")}/${to.getFullYear()}`;
    return { from, to, label: `${fromStr}_a_${toStr}` };
  };

  const doExport = (type: "pdf" | "xls") => {
    const r = resolve();
    (type === "pdf" ? onPDF : onExcel)(r);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] transition-colors text-body-bold">
          <FileDown className="h-4 w-4 text-[#005da9]" />
          Descargar
          <ChevronDown className="h-3.5 w-3.5 text-[#575f67]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 bg-white border border-[#e2e8f0] rounded-xl shadow-xl">
        <div className="text-label-sm text-[#414752] uppercase tracking-wider mb-3">
          Rango de fechas
        </div>
        <div className="space-y-1 mb-4">
          {[
            { v: "today", label: "Día en curso" },
            { v: "yesterday", label: "Día anterior" },
            { v: "custom", label: "Rango personalizado" },
          ].map((o) => (
            <label
              key={o.v}
              onClick={() => setMode(o.v as any)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                mode === o.v ? "bg-[rgba(0,93,169,0.08)] text-[#005da9] font-semibold" : "text-[#414752] hover:bg-[#f2f3f6]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  mode === o.v ? "border-[#005da9]" : "border-[#c1c7d4]"
                }`}
              >
                {mode === o.v && <div className="w-2 h-2 rounded-full bg-[#005da9]" />}
              </div>
              <span className="text-body-base">{o.label}</span>
            </label>
          ))}
        </div>
        {mode === "custom" && (
          <div className="mb-4 p-3 rounded-lg bg-[#f8f9fc] border border-[#e2e8f0]">
            <label className="block text-label-sm text-[#414752] mb-1">Rango seleccionado</label>
            <DateRangePicker value={customRange} onChange={setCustomRange} />
          </div>
        )}
        <div className="flex gap-2 pt-3 border-t border-[#e2e8f0]">
          <button
            onClick={() => doExport("xls")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] transition-colors text-body-bold"
          >
            <Table2 className="h-3.5 w-3.5 text-emerald-600" /> Excel
          </button>
          <button
            onClick={() => doExport("pdf")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] transition-colors text-body-bold"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" /> PDF
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
