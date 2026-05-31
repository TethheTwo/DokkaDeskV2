import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Ticket, TicketAttachment } from "@/lib/tickets-store";
import { formatCode } from "@/lib/utils";

const SUPABASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : (import.meta.env.VITE_SUPABASE_URL || "http://localhost:3000");

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadTicketsCSV(tickets: Ticket[], filename = "tickets.csv") {
  const headers = [
    "Nro",
    "Fecha",
    "Solicitante",
    "Contratante",
    "Departamento",
    "Celular",
    "Poliza",
    "Tipo",
    "Tipo Asistencia",
    "Severidad",
    "Registrado por",
    "Estado",
    "Cerrado por",
    "Notas",
  ];
  const rows = tickets.map((t) => [
    t.nro,
    format(new Date(t.fechaCreacion), "dd/MM/yyyy HH:mm"),
    t.solicitante,
    t.contratante ?? "",
    t.departamento ?? "",
    t.celular ?? "",
    t.poliza ?? "",
    t.tipo,
    t.tipoAsistencia ?? "",
    t.severidad,
    t.registradoPor,
    t.estado,
    t.cerradoPor,
    String(t.notes.length),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTicketPDF(ticket: Ticket) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const tc = formatCode("TK", ticket.nro);

  // Header — white bar with bottom border (like AppTopBar)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(0, 93, 169);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DOKKA Desk", 40, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(25, 28, 30);
  doc.text(`Reporte de ${tc}`, pageW - 40, 22, { align: "right" });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 34, pageW - 40, 34);
  doc.setFontSize(7.5);
  doc.setTextColor(65, 71, 82);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - 40, 48, { align: "right" });

  // Info table
  const descNote = ticket.notes.find((n) => n.nota?.startsWith("__DESCRIPCION__:"));
  const descripcion = descNote ? descNote.nota.replace(/^__DESCRIPCION__:\s*/, "").trim() : "";

  const info: [string, string][] = [
    [tc, "Nro. Ticket"],
    [format(new Date(ticket.fechaCreacion), "dd/MM/yyyy HH:mm"), "Fecha de registro"],
    [ticket.tipo, "Tipo"],
    ...(ticket.tipoAsistencia
      ? [[ticket.tipoAsistencia, "Tipo de asistencia"] as [string, string]]
      : []),
    [ticket.solicitante, "Solicitante"],
    ...(ticket.contratante ? [[ticket.contratante, "Contratante"] as [string, string]] : []),
    ...(ticket.departamento ? [[ticket.departamento, "Departamento"] as [string, string]] : []),
    ...(ticket.celular ? [[ticket.celular, "Celular"] as [string, string]] : []),
    ...(ticket.poliza ? [[ticket.poliza, "Póliza"] as [string, string]] : []),
    [ticket.severidad, "Severidad"],
    [ticket.estado, "Estado actual"],
    [ticket.registradoPor, "Registrado por"],
    [ticket.cerradoPor || "—", "Cerrado por"],
    ...(descripcion ? [[descripcion, "Descripción"] as [string, string]] : []),
  ].map(([v, l]) => [l, v] as [string, string]);

  autoTable(doc, {
    startY: 80,
    head: [["Campo", "Valor"]],
    body: info,
    theme: "grid",
    headStyles: { fillColor: [242, 243, 246], textColor: [65, 71, 82], fontStyle: "bold", fontSize: 9, halign: "left" },
    bodyStyles: { fontSize: 8.5, textColor: [25, 28, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5,
    styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.25 },
    columnStyles: { 0: { cellWidth: 130, fontStyle: "bold" } },
    margin: { left: 40, right: 40 },
    rowPageBreak: "avoid",
  });

  let nextY = (doc as any).lastAutoTable.finalY + 20;

  const ensureSpace = (needed: number) => {
    const ph = doc.internal.pageSize.getHeight();
    if (nextY + needed > ph - 40) {
      doc.addPage();
      nextY = 40;
    }
  };

  const displayNotes = ticket.notes.filter((n) => !n.nota?.startsWith("__DESCRIPCION__:"));

  // Notes section title
  ensureSpace(55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 28, 30);
  doc.text(`Historial de notas (${displayNotes.length})`, 40, nextY);

  if (displayNotes.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Sin notas registradas.", 40, nextY + 14);
    nextY += 28;
  } else {
    autoTable(doc, {
      startY: nextY + 6,
      head: [["Fecha", "Estado", "Usuario", "Nota"]],
      body: displayNotes.map((n) => [
        format(new Date(n.fecha), "dd/MM/yyyy HH:mm"),
        n.estado,
        n.usuario,
        (n.nota || "(sin texto)") +
          (n.attachments.length
            ? `\n[Adjuntos: ${n.attachments.map((a) => a.name).join(", ")}]`
            : ""),
      ]),
      theme: "grid",
      headStyles: { fillColor: [242, 243, 246], textColor: [65, 71, 82], fontStyle: "bold", fontSize: 8.5, halign: "left" },
      bodyStyles: { fontSize: 8, textColor: [25, 28, 30] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.25 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 80 },
        2: { cellWidth: 100 },
      },
      margin: { left: 40, right: 40 },
      rowPageBreak: "avoid",
    });
    nextY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Adjuntos con imágenes embebidas
  const allAttachments: (TicketAttachment & { noteRef: string })[] = [
    ...ticket.attachments.map((a) => ({ ...a, noteRef: "Ticket" })),
    ...ticket.notes.flatMap((n) =>
      n.attachments.map((a) => ({
        ...a,
        noteRef: `${format(new Date(n.fecha), "dd/MM HH:mm")} - ${n.usuario}`,
      })),
    ),
  ];

  const imageCache = new Map<string, { b64: string; w: number; h: number }>();
  await Promise.all(
    allAttachments
      .filter((a) => a.type.startsWith("image/"))
      .map(async (a) => {
        try {
          const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/ticket-attachments/${a.storage_path}`);
          if (resp.ok) {
            const blob = await resp.blob();
            const b64 = await blobToBase64(blob);
            const dims = await new Promise<{ w: number; h: number }>((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
              img.onerror = () => resolve({ w: 200, h: 150 });
              img.src = b64;
            });
            imageCache.set(a.storage_path, { b64, ...dims });
          }
        } catch {}
      }),
  );

  const imgColW = (pageW - 80) - 100 - 120;
  const maxImgH = 140;

  const buildRow = (a: TicketAttachment & { noteRef: string }) => {
    if (!a.type.startsWith("image/")) {
      return [
        { content: a.noteRef },
        { content: a.name },
        { content: a.type },
      ];
    }
    const cached = imageCache.get(a.storage_path);
    if (!cached) return [
      { content: a.noteRef },
      { content: a.name },
      { content: "(sin imagen)" },
    ];
    const scale = Math.min((imgColW - 6) / cached.w, maxImgH / cached.h);
    const rowH = Math.max(cached.h * scale + 6, 30);
    return [
      { content: a.noteRef, styles: { minCellHeight: rowH } },
      { content: a.name, styles: { minCellHeight: rowH } },
      { content: "", styles: { minCellHeight: rowH } },
    ];
  };

  if (allAttachments.length > 0) {
    ensureSpace(55);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 28, 30);
    doc.text(`Adjuntos (${allAttachments.length})`, 40, nextY);

    autoTable(doc, {
      startY: nextY + 6,
      head: [["Nota", "Archivo", "Vista previa"]],
      body: allAttachments.map((a) => buildRow(a)),
      theme: "grid",
      headStyles: { fillColor: [242, 243, 246], textColor: [65, 71, 82], fontStyle: "bold", fontSize: 8.5, halign: "left" },
      bodyStyles: { fontSize: 8, textColor: [25, 28, 30] },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.25 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 120 },
      },
      margin: { left: 40, right: 40 },
      rowPageBreak: "avoid",
      didDrawCell: (data: any) => {
        if (data.column.index === 2 && data.cell.section === "body") {
          const attach = allAttachments[data.row.index];
          if (attach && attach.type.startsWith("image/")) {
            const cached = imageCache.get(attach.storage_path);
            if (cached) {
              const cellW = data.cell.width - 6;
              const cellH = data.cell.height - 6;
              const scale = Math.min(cellW / cached.w, cellH / cached.h);
              const drawW = cached.w * scale;
              const drawH = cached.h * scale;
              const cx = data.cell.x + 3 + (cellW - drawW) / 2;
              const cy = data.cell.y + 3 + (cellH - drawH) / 2;
              try {
                doc.addImage(cached.b64, "JPEG" as any, cx, cy, drawW, drawH);
              } catch {}
            }
          }
        }
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(40, pageH - 36, pageW - 40, pageH - 36);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("DOKKA Desk", 40, pageH - 24);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW / 2,
      pageH - 24,
      { align: "center" },
    );
    doc.text(tc, pageW - 40, pageH - 24, { align: "right" });
  }

  doc.save(`ticket-${ticket.nro}.pdf`);
}
