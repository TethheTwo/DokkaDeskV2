import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, FileText, X, Image as ImageIcon } from "lucide-react";
import { domToCanvas } from "modern-screenshot";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { formatCode } from "@/lib/utils";
import { ModernFormSheet, type FormReportData } from "./ModernFormSheet";
import { ModernFormSheetPDF } from "./ModernFormSheetPDF";

export interface ReportField {
  label: string;
  value: string | number | null | undefined;
  full?: boolean;
}
export interface ReportSection {
  title: string;
  fields: ReportField[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  nro: number | string;
  sections?: ReportSection[];
  variant?: "ap" | "cg";
  data?: FormReportData;
}

const SHEET_W = 595;
const SHEET_H = 842;

export function ReportPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  nro,
  sections,
  variant,
  data,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cachedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const recalc = () => {
      setScale(Math.min(1, el.clientWidth / SHEET_W));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) cachedCanvasRef.current = null;
  }, [open]);

  if (!open) return null;

  const renderCanvas = async () => {
    if (cachedCanvasRef.current) return cachedCanvasRef.current;
    const node = sheetRef.current;
    if (!node) throw new Error("no node");
    const savedTransform = node.style.transform;
    node.style.transform = "none";
    const canvas = await domToCanvas(node, {
      backgroundColor: "#ffffff",
      width: SHEET_W,
      height: SHEET_H,
      scale: 5,
    });
    node.style.transform = savedTransform;
    cachedCanvasRef.current = canvas;
    return canvas;
  };

  const fileBase = () => {
    const prefix = variant === "ap" ? "AP" : variant === "cg" ? "CG" : "RP";
    const code = formatCode(prefix as "AP" | "CG", nro as number);
    const slug =
      variant === "ap"
        ? "reporte_accidentes_personales"
        : variant === "cg"
          ? "reporte_casos_generales"
          : `reporte-${nro}`;
    return `${slug}_${code}`;
  };

  const downloadPNG = async () => {
    try {
      setBusy("png");
      const c = await renderCanvas();
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Imagen descargada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la imagen");
    } finally {
      setBusy(null);
    }
  };

  const downloadPDF = async () => {
    if (!variant || !data) {
      toast.error("No hay datos para generar el PDF");
      return;
    }
    try {
      setBusy("pdf");
      const blob = await pdf(<ModernFormSheetPDF variant={variant} data={data} />).toBlob();
      if (!blob) throw new Error("no blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(null);
    }
  };

  const downloadCanvasAsFallback = (c: HTMLCanvasElement) => {
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${fileBase()}.png`;
    a.click();
  };

  const copyToClipboard = async () => {
    try {
      setBusy("copy");
      const tid = toast.loading("Capturando reporte…");
      const c = await renderCanvas();
      toast.dismiss(tid);
      if (
        typeof window === "undefined" ||
        typeof (window as unknown as { ClipboardItem: unknown }).ClipboardItem === "undefined" ||
        !navigator.clipboard?.write
      ) {
        downloadCanvasAsFallback(c);
        toast.success("Tu navegador no permite copiar imágenes — se descargó como archivo");
        return;
      }
      await new Promise<void>((resolve) => {
        c.toBlob(async (blob) => {
          if (!blob) {
            downloadCanvasAsFallback(c);
            toast.success("Se descargó como archivo");
            resolve();
            return;
          }
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast.success("Reporte copiado como imagen al portapapeles");
          } catch {
            downloadCanvasAsFallback(c);
            toast.success("No se pudo copiar — se descargó como archivo");
          } finally {
            resolve();
          }
        }, "image/png");
      });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la captura");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto animate-in fade-in-0 duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-[#c1c7d4] w-full max-w-[960px] animate-in zoom-in-95 fade-in-0 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-[4px] bg-[#005da9] rounded-t-xl" />

        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2e8f0]">
          <div className="text-[14px] font-bold text-[#191c1e]">Vista previa del reporte</div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#f2f3f6] text-[#191c1e] text-xs font-semibold hover:bg-[#edeef1] disabled:opacity-50 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" /> Captura
            </button>
            <button
              onClick={downloadPNG}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#f2f3f6] text-[#191c1e] text-xs font-semibold hover:bg-[#edeef1] disabled:opacity-50 transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> Imagen
            </button>
            <button
              onClick={downloadPDF}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#f2f3f6] text-[#191c1e] text-xs font-semibold hover:bg-[#edeef1] disabled:opacity-50 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-rose-600" /> PDF
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-[#f2f3f6] text-[#575f67] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 bg-[#f8f9fc] rounded-b-xl">
          <div
            ref={stageRef}
            className="mx-auto"
            style={{ width: "100%", maxWidth: `${SHEET_W}px` }}
          >
            <div
              className="relative bg-white shadow-lg border border-[#c1c7d4] rounded-md overflow-hidden mx-auto"
              style={{ width: `${SHEET_W * scale}px`, height: `${SHEET_H * scale}px` }}
            >
              <div
                ref={sheetRef}
                style={{
                  width: `${SHEET_W}px`,
                  height: `${SHEET_H}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  background: "#ffffff",
                  color: "#191c1e",
                }}
              >
                {variant && data ? (
                  <ModernFormSheet variant={variant} data={data} />
                ) : (
                  <GenericSheet
                    title={title}
                    subtitle={subtitle}
                    nro={nro}
                    sections={sections ?? []}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Generic sheet (fallback) ---------- */

function SectionTitle({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-[6px] mt-[8px] first:mt-0">
      <div className="w-[4px] h-[14px] bg-[#005da9] rounded-sm shrink-0" />
      <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
        {text}
      </span>
    </div>
  );
}

function Divider() {
  return <hr className="border-t border-[#d1d5db] mb-[8px] mt-[8px]" />;
}

function FieldRow({
  label,
  value,
  full,
}: {
  label: string;
  value: string | number | null | undefined;
  full?: boolean;
}) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className={full ? "col-span-2 mb-[6px] last:mb-0" : "mb-[6px] last:mb-0"}>
      <div className="text-[13px] text-[#64748b] font-medium leading-tight">{label}</div>
      <div className="text-[16px] text-[#191c1e] font-medium mt-[1px] leading-snug break-words whitespace-pre-wrap">
        {v}
      </div>
    </div>
  );
}

function GenericSheet({
  title,
  subtitle,
  nro,
  sections,
}: {
  title: string;
  subtitle?: string;
  nro: number | string;
  sections: ReportSection[];
}) {
  return (
    <div className="w-full h-full bg-white text-[#191c1e] flex flex-col overflow-hidden px-[24px] py-[12px]">
      <div className="h-[3px] bg-[#005da9] mb-[8px] shrink-0" />

      <div className="flex items-start justify-between mb-[2px]">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-[#005da9] mb-[2px]">
            DOKKA Desk
          </div>
          <h2 className="text-[18px] font-bold leading-tight text-[#191c1e]">{title}</h2>
          {subtitle && <div className="text-[13px] text-[#64748b] mt-[2px]">{subtitle}</div>}
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[11px] uppercase tracking-[0.05em] text-[#64748b] font-medium">
            Reporte N°
          </div>
          <div className="text-[22px] font-bold text-[#005da9] leading-none">{nro}</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden mt-[6px]">
        {sections.map((s, i) => (
          <div key={i}>
            {i > 0 && <Divider />}
            <SectionTitle text={s.title} />
            <div className="grid grid-cols-2 gap-x-4">
              {s.fields.map((f, j) => (
                <div key={j} className={f.full ? "col-span-2" : ""}>
                  <FieldRow label={f.label} value={f.value} full={f.full} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
