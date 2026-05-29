import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";

const OUTPUT_SIZE = 512;
const FIXED_SQ = 380;

type CropModalProps = {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

export function CropModal({ file, onConfirm, onCancel }: CropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const clampRef = useRef({ minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity });
  const [imageUrl, setImageUrl] = useState("");
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [cW, setCW] = useState(0);
  const [cH, setCH] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [imgOff, setImgOff] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, offX: 0, offY: 0 });

  const ready = cW > 0 && naturalW > 0;

  const sqSize = ready ? Math.min(FIXED_SQ, cW - 20, cH - 20) : 0;
  const sqLeft = ready ? (cW - sqSize) / 2 : 0;
  const sqTop = ready ? (cH - sqSize) / 2 : 0;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => { setNaturalW(img.naturalWidth); setNaturalH(img.naturalHeight); };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!naturalW) return;
    const maxH = window.innerHeight * 0.7;
    const scale = Math.min(1, maxH / naturalH);
    const w = Math.round(naturalW * scale);
    const h = Math.round(naturalH * scale);
    setCW(Math.max(280, w));
    setCH(Math.max(280, h));
  }, [naturalW, naturalH]);

  const defaultZoom = (() => {
    if (!ready) return 1;
    return Math.max(cW / naturalW, cH / naturalH);
  })();

  const effectiveZoom = zoom * defaultZoom;
  const dispImgW = ready ? naturalW * effectiveZoom : 0;
  const dispImgH = ready ? naturalH * effectiveZoom : 0;

  const computedMinZoom = (() => {
    if (!ready) return 0.3;
    return (sqSize / Math.min(naturalW, naturalH)) / defaultZoom;
  })();
  const minZoom = ready ? Math.max(0.3, computedMinZoom) : 0.3;
  const maxZoom = 5;

  const updateClamp = useCallback(() => {
    if (!ready || !dispImgW || !dispImgH) return;
    clampRef.current = {
      minX: sqLeft + sqSize - cW / 2 - dispImgW / 2,
      maxX: sqLeft - cW / 2 + dispImgW / 2,
      minY: sqTop + sqSize - cH / 2 - dispImgH / 2,
      maxY: sqTop - cH / 2 + dispImgH / 2,
    };
  }, [ready, dispImgW, dispImgH, sqLeft, sqSize, sqTop, cW, cH]);

  updateClamp();

  const clampOffset = useCallback((x: number, y: number) => {
    const { minX, maxX, minY, maxY } = clampRef.current;
    return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !ready) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: imgOff.x, offY: imgOff.y };
  }, [imgOff, ready]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !ready) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setImgOff(clampOffset(dragRef.current.offX + dx, dragRef.current.offY + dy));
  }, [isDragging, ready, clampOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const scaleAndClampOff = useCallback((ratio: number, nextZoom: number) => {
    const eZ = nextZoom * defaultZoom;
    const dW = naturalW * eZ;
    const dH = naturalH * eZ;
    const clamp = {
      minX: sqLeft + sqSize - cW / 2 - dW / 2,
      maxX: sqLeft - cW / 2 + dW / 2,
      minY: sqTop + sqSize - cH / 2 - dH / 2,
      maxY: sqTop - cH / 2 + dH / 2,
    };
    setImgOff((off) => ({
      x: Math.max(clamp.minX, Math.min(clamp.maxX, off.x * ratio)),
      y: Math.max(clamp.minY, Math.min(clamp.maxY, off.y * ratio)),
    }));
  }, [defaultZoom, naturalW, naturalH, sqLeft, sqSize, sqTop, cW, cH]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!ready) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => {
      const next = Math.max(minZoom, Math.min(maxZoom, prev + delta));
      scaleAndClampOff(next / prev, next);
      return next;
    });
  }, [ready, minZoom, maxZoom, scaleAndClampOff]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    setZoom((prev) => {
      scaleAndClampOff(next / prev, next);
      return next;
    });
  }, [scaleAndClampOff]);

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || !ready) return;

    const imgLeft = cW / 2 - dispImgW / 2 + imgOff.x;
    const imgTop = cH / 2 - dispImgH / 2 + imgOff.y;
    const scale = 1 / effectiveZoom;
    const natX = (sqLeft - imgLeft) * scale;
    const natY = (sqTop - imgTop) * scale;
    const natW = sqSize * scale;
    const natH = sqSize * scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const sx = Math.max(0, natX);
    const sy = Math.max(0, natY);
    const sw = Math.min(natW, naturalW - sx);
    const sh = Math.min(natH, naturalH - sy);
    const scaleX = OUTPUT_SIZE / natW;
    const scaleY = OUTPUT_SIZE / natH;
    ctx.drawImage(img, sx, sy, sw, sh, (sx - natX) * scaleX, (sy - natY) * scaleY, sw * scaleX, sh * scaleY);

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/jpeg", 0.92);
  }, [naturalW, naturalH, effectiveZoom, cW, cH, sqSize, sqLeft, sqTop, imgOff, ready, dispImgW, dispImgH, onConfirm]);

  const imgLeft = ready ? cW / 2 - dispImgW / 2 + imgOff.x : 0;
  const imgTop = ready ? cH / 2 - dispImgH / 2 + imgOff.y : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0 duration-150"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full animate-in zoom-in-95 duration-200"
        style={{ maxWidth: ready ? `${Math.min(cW + 48, window.innerWidth * 0.95)}px` : "560px" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <h3 className="text-base font-semibold text-[#191c1e]">Ajustar foto de perfil</h3>
          <button onClick={onCancel} className="text-[#64748b] hover:text-[#191c1e] p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div
            ref={containerRef}
            className="relative mx-auto rounded-lg overflow-hidden bg-black select-none"
            style={{
              width: ready ? cW : "100%",
              height: ready ? cH : 300,
              maxWidth: "100%",
            }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
          >
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#f2f3f6] z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-[#005da9] animate-spin" />
                  <span className="text-xs text-[#64748b]">Cargando imagen...</span>
                </div>
              </div>
            )}

            {ready && (
              <>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="absolute pointer-events-none"
                  draggable={false}
                  style={{
                    left: imgLeft,
                    top: imgTop,
                    width: dispImgW,
                    height: dispImgH,
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                />

                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: sqLeft,
                    top: sqTop,
                    width: sqSize,
                    height: sqSize,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                    border: "2px solid rgba(255,255,255,0.9)",
                    borderRadius: "2px",
                  }}
                >
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                </div>

                <div className="absolute pointer-events-none" style={{
                  left: sqLeft, top: sqTop, width: sqSize, height: sqSize,
                }}>
                  <div className="absolute left-0 right-0 top-1/3 border-t border-white/20" />
                  <div className="absolute left-0 right-0 top-2/3 border-t border-white/20" />
                  <div className="absolute top-0 bottom-0 left-1/3 border-l border-white/20" />
                  <div className="absolute top-0 bottom-0 left-2/3 border-l border-white/20" />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 px-1">
            <span className="material-symbols-outlined text-[#64748b]" style={{ fontSize: "20px" }}>remove</span>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={handleSlider}
              disabled={!ready}
              className="flex-1 h-1.5 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer accent-[#005da9] disabled:opacity-40 disabled:cursor-not-allowed
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#005da9] [&::-webkit-slider-thumb]:shadow"
            />
            <span className="material-symbols-outlined text-[#64748b]" style={{ fontSize: "20px" }}>add</span>
          </div>

          <p className="text-xs text-[#64748b] text-center mt-2">
            {ready ? "Arrastra la imagen para reposicionar · Rueda o slider para zoom" : "Preparando imagen..."}
          </p>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#e2e8f0]">
          <button
            onClick={onCancel}
            className="h-9 px-5 rounded-md border border-[#d1d5db] text-sm font-medium text-[#575f67] hover:bg-[#f2f3f6] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!ready}
            className="h-9 px-5 rounded-md bg-[#005da9] text-white text-sm font-medium hover:bg-[#2868b3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
