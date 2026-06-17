import type { CompetitionResultDetail } from "../../../schema/types";

export type CellState = "pb" | "swam" | "dnf" | "none";

export interface CellData {
  state: CellState;
  result?: CompetitionResultDetail;
}

export const STROKE_GROUPS = [
  { label: "Motýlek", colSpan: 3 },
  { label: "Znak", colSpan: 3 },
  { label: "Prsa", colSpan: 3 },
  { label: "Volný způsob", colSpan: 6 },
  { label: "Polohový závod", colSpan: 3 },
];

export const CELL_COLORS: Record<CellState, string> = {
  pb: "#2ecc71",
  swam: "#3b82f6",
  dnf: "#e74c3c",
  none: "transparent",
};

export const CELL_LABELS: Record<CellState, string> = {
  pb: "Osobní rekord",
  swam: "Zaplaváno",
  dnf: "DNF / DNS",
  none: "Nestartoval/a",
};
