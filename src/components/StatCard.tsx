import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "violet" | "teal" | "slate";
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, { bg: string; fg: string }> = {
  blue: { bg: "rgba(0,93,169,0.1)", fg: "#005da9" },
  green: { bg: "rgba(0,107,44,0.1)", fg: "#006b2c" },
  amber: { bg: "rgba(234,88,12,0.1)", fg: "#ea580c" },
  red: { bg: "rgba(186,26,26,0.1)", fg: "#ba1a1a" },
  violet: { bg: "rgba(147,51,234,0.1)", fg: "#9333ea" },
  teal: { bg: "rgba(0,156,156,0.1)", fg: "#009c9c" },
  slate: { bg: "rgba(87,95,103,0.1)", fg: "#575f67" },
};

export function StatCard({ label, value, icon: Icon, tone = "blue" }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-[#c1c7d4] hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: t.bg, color: t.fg }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <div className="text-label-caps text-[#414752]">{label}</div>
      <div className="text-display-lg text-[#191c1e] mt-1">{value}</div>
    </div>
  );
}
