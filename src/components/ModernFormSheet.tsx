import { formatCode } from "@/lib/utils";

export interface FormReportData {
  nro: number | string;
  colaborador?: string | null;
  fecha_solicitud?: string | null;
  fecha_siniestro?: string | null;
  danos_personales?: string | null;
  asegurado?: string | null;
  nombre_accidentado?: string | null;
  carnet_accidentado?: string | null;
  solicitante?: string | null;
  celular?: string | null;
  departamento?: string | null;
  poliza?: string | null;
  direccion?: string | null;
  descripcion?: string | null;
  ejecutivo_nombre?: string | null;
  ejecutivo_celular?: string | null;
  intentos_llamada?: string | null;
  observaciones?: string | null;
  hubo_tripartita?: string | null;
  hora_contacto?: string | null;
  created_at?: string | null;
}

interface Props {
  variant: "ap" | "cg";
  data: FormReportData;
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

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

function F({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <div className="text-[13px] text-[#64748b] font-medium leading-tight">{label}</div>
      <div className="text-[16px] text-[#191c1e] font-medium mt-[1px] leading-snug">{v}</div>
    </div>
  );
}

function Pair({
  a,
  b,
}: {
  a: { label: string; value: string | number | null | undefined };
  b: { label: string; value: string | number | null | undefined };
}) {
  return (
    <div className="flex flex-row mb-[6px] last:mb-0">
      <div className="w-1/2 pr-3">
        <F label={a.label} value={a.value} />
      </div>
      <div className="w-1/2 pl-3">
        <F label={b.label} value={b.value} />
      </div>
    </div>
  );
}

export function ModernFormSheet({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";
  const codePrefix = variant === "ap" ? "AP" : "CG";
  const displayCode = formatCode(codePrefix, data.nro);

  return (
    <div className="w-full h-full bg-white text-[#191c1e] flex flex-col overflow-hidden px-[24px] py-[12px]">
      <div className="h-[3px] bg-[#005da9] mb-[8px] shrink-0" />

      <div className="flex items-start justify-between mb-[2px]">
        <div className="min-w-0">
          <span className="inline-block bg-[#f2f3f6] px-[6px] py-[2px] rounded-[4px] text-[12px] text-[#64748b] font-medium tracking-[0.06em] mb-[4px]">
            {code}
          </span>
          <h1 className="text-[18px] font-bold leading-tight mt-[1px]">
            {variant === "ap" ? "Accidentes Personales Patrimoniales" : "Casos Generales"}
          </h1>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[11px] uppercase tracking-[0.05em] text-[#64748b] font-medium">
            Código
          </div>
          <div className="text-[22px] font-bold text-[#005da9] leading-none">{displayCode}</div>
          <div className="text-[13px] text-[#191c1e] font-medium mt-[2px]">
            {data.colaborador || "—"}
          </div>
        </div>
      </div>

      <div className="text-[13px] text-[#64748b] mt-[6px] mb-[8px]">
        Fecha de solicitud:{" "}
        <span className="font-medium text-[#191c1e]">{fmtDate(data.fecha_solicitud)}</span>
      </div>

      <Divider />

      <SectionTitle text="Datos del Siniestro" />

      <Pair
        a={{ label: "Fecha de solicitud", value: fmtDate(data.fecha_solicitud) }}
        b={{ label: "Fecha del siniestro", value: fmtDate(data.fecha_siniestro) }}
      />
      {variant === "ap" ? (
        <Pair
          a={{ label: "Nombre del accidentado", value: data.nombre_accidentado }}
          b={{ label: "Carnet del accidentado", value: data.carnet_accidentado }}
        />
      ) : (
        <Pair
          a={{ label: "Asegurado", value: data.asegurado }}
          b={{ label: "Daños personales", value: data.danos_personales || "—" }}
        />
      )}
      <Pair
        a={{ label: "Solicitante", value: data.solicitante }}
        b={{ label: "Celular", value: data.celular }}
      />
      <Pair
        a={{ label: "Departamento", value: data.departamento }}
        b={{ label: "Póliza", value: data.poliza }}
      />
      <div className="mb-[6px]">
        <F label="Dirección" value={data.direccion} />
      </div>

      {data.descripcion && (
        <>
          <Divider />
          <SectionTitle text="Descripción del Incidente" />
          <p className="text-[15px] text-[#191c1e] leading-relaxed whitespace-pre-wrap mb-[6px]">
            {data.descripcion}
          </p>
        </>
      )}

      <Divider />

      <SectionTitle text="Datos del Ejecutivo" />

      <Pair
        a={{ label: "Nombre", value: data.ejecutivo_nombre }}
        b={{ label: "Celular", value: data.ejecutivo_celular }}
      />
      <Pair
        a={{ label: "Intentos de llamada", value: data.intentos_llamada }}
        b={{ label: "Hubo tripartita", value: data.hubo_tripartita }}
      />
      <div className="flex flex-row mb-[6px]">
        <div className="w-1/2 pr-3">
          <F label="Hora de contacto" value={data.hora_contacto} />
        </div>
        <div className="w-1/2 pl-3" />
      </div>

      {data.observaciones && (
        <div className="mt-[6px]">
          <div className="text-[13px] text-[#64748b] font-medium">Observaciones</div>
          <div className="text-[15px] text-[#191c1e] leading-relaxed mt-[1px]">{data.observaciones}</div>
        </div>
      )}
    </div>
  );
}
