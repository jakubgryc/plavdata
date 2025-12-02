import type { SegmentedControlItem } from "@mantine/core";

export const GROUPS = [
  { label: "Z1", value: "Z1" },
  { label: "Z2", value: "Z2" },
  { label: "P1", value: "P1" },
  { label: "bývalí", value: "veteran" },
];

export const POOLS: SegmentedControlItem[] = [
  { label: "25 m", value: "25" },
  { label: "50 m", value: "50" },
];

export const DISCIPLINES = [
  "50 M",
  "100 M",
  "200 M",
  "50 Z",
  "100 Z",
  "200 Z",
  "50 P",
  "100 P",
  "200 P",
  "50 VZ",
  "100 VZ",
  "200 VZ",
  "400 VZ",
  "800 VZ",
  "1500 VZ",
  "100 O",
  "200 O",
  "400 O",
];

export const DNF_TIME = 6039990; // magic number representing DNF in milliseconds

const GRAPH_COLORS = [
  "#ff5733",
  "#00bc1d",
  "#4162ff",
  "#fc1894",
  "#8e0cff",
  "#b69300",
  "#d10000",
  "#00ebd5",
];

export function getGraphColor(index: number): string {
  return GRAPH_COLORS[index % GRAPH_COLORS.length];
}
