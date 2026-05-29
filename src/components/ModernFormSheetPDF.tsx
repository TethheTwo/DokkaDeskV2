import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { FormReportData } from "./ModernFormSheet";
import { formatCode } from "@/lib/utils";

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

const C = {
  brand: "#005da9",
  label: "#6b7280",
  value: "#111827",
  text: "#374151",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: C.value,
  },
  accent: {
    borderTop: "1.5 solid " + C.brand,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  formCode: {
    fontSize: 12,
    color: C.label,
    fontWeight: 500,
    letterSpacing: 0.5,
  },
  formCodeBadge: {
    backgroundColor: "#f2f3f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 1,
  },
  rightMeta: {
    textAlign: "right" as const,
  },
  nroLabel: {
    fontSize: 11,
    color: C.label,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  nroValue: {
    fontSize: 20,
    fontWeight: 700,
    color: C.brand,
    marginBottom: 4,
  },
  metaValue: {
    fontWeight: 600,
    color: C.value,
  },
  headerDate: {
    fontSize: 12,
    color: C.label,
    marginBottom: 8,
  },
  divider: {
    borderTop: "1 solid #d1d5db",
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionAccent: {
    width: 4,
    height: 14,
    backgroundColor: C.brand,
    marginRight: 6,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.label,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  fieldCol: {
    width: "50%",
  },
  fieldLabel: {
    fontSize: 12,
    color: C.label,
    fontWeight: 500,
  },
  fieldValue: {
    fontSize: 15,
    color: C.value,
    fontWeight: 500,
    marginTop: 1,
  },
  fieldFullWidth: {
    marginBottom: 6,
  },
  descTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.label,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  obsText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 1.5,
    marginTop: 1,
  },
});

function F({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{v}</Text>
    </View>
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
    <View style={styles.fieldRow}>
      <View style={styles.fieldCol}>
        <F label={a.label} value={a.value} />
      </View>
      <View style={styles.fieldCol}>
        <F label={b.label} value={b.value} />
      </View>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
  );
}

export function ModernFormSheetPDF({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";
  const codePrefix = variant === "ap" ? "AP" : "CG";
  const displayCode = formatCode(codePrefix, data.nro);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} />

        <View style={styles.headerRow}>
          <View>
            <View style={styles.formCodeBadge}>
              <Text style={styles.formCode}>{code}</Text>
            </View>
            <Text style={styles.formTitle}>
              {variant === "ap" ? "Accidentes Personales Patrimoniales" : "Casos Generales"}
            </Text>
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.nroLabel}>Código</Text>
            <Text style={styles.nroValue}>{displayCode}</Text>
            <Text>{data.colaborador || "—"}</Text>
          </View>
        </View>

        <Text style={styles.headerDate}>
          Fecha de solicitud:{" "}
          <Text style={{ fontWeight: 500, color: C.value }}>
            {fmtDate(data.fecha_solicitud)}
          </Text>
        </Text>

        <View style={styles.divider} />

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
            b={{
              label: "Daños personales",
              value: data.danos_personales || "—",
            }}
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
        <View style={styles.fieldFullWidth}>
          <F label="Dirección" value={data.direccion} />
        </View>

        {data.descripcion && (
          <>
            <View style={styles.divider} />
            <SectionTitle text="Descripción del Incidente" />
            <Text style={styles.descText}>{data.descripcion}</Text>
          </>
        )}

        <View style={styles.divider} />

        <SectionTitle text="Datos del Ejecutivo" />

        <Pair
          a={{ label: "Nombre", value: data.ejecutivo_nombre }}
          b={{ label: "Celular", value: data.ejecutivo_celular }}
        />
        <Pair
          a={{ label: "Intentos de llamada", value: data.intentos_llamada }}
          b={{ label: "Hubo tripartita", value: data.hubo_tripartita }}
        />
        <View style={styles.fieldRow}>
          <View style={styles.fieldCol}>
            <F label="Hora de contacto" value={data.hora_contacto} />
          </View>
          <View style={styles.fieldCol} />
        </View>

        {data.observaciones && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.fieldLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{data.observaciones}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
