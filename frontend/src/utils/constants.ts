import type { SegmentedControlItem } from "@mantine/core";

export const GROUPS = [
  { label: "Z1", value: "Z1" },
  { label: "Z2", value: "Z2" },
  { label: "P1", value: "P1" },
  { label: "bývalí", value: "veteran" },
];

export const ACTIVE_GROUPS = ["Z1", "Z2", "P1"];

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
export const DNF_TRESHOLD = 6000000; // 100 minutes in milliseconds
export const FIRST_TIME_TRESHOLD = 4500000; // 75 minutes in milliseconds, used to identify if comparison to best is likely first time ever

// Age category display name mapping
export const AGE_CATEGORY_LABELS: Record<string, string> = {
  "9": "9letí",
  "10": "10letí",
  "11": "11letí",
  "12": "12letí",
  "13": "13letí",
  "14": "14letí",
  junior: "dorost",
  open: "open",
};

export function getAgeCategoryLabel(code: string): string {
  return AGE_CATEGORY_LABELS[code] ?? code;
}

// Remove Czech diacritics for search/filter purposes
export function removeDiacritics(text: string): string {
  const diacriticsMap: Record<string, string> = {
    á: "a",
    Á: "A",
    č: "c",
    Č: "C",
    ď: "d",
    Ď: "D",
    é: "e",
    É: "E",
    ě: "e",
    Ě: "E",
    í: "i",
    Í: "I",
    ň: "n",
    Ň: "N",
    ó: "o",
    Ó: "O",
    ř: "r",
    Ř: "R",
    š: "s",
    Š: "S",
    ť: "t",
    Ť: "T",
    ú: "u",
    Ú: "U",
    ů: "u",
    Ů: "U",
    ý: "y",
    Ý: "Y",
    ž: "z",
    Ž: "Z",
  };

  return text.replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (char) => diacriticsMap[char] || char);
}

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

// Team colors for equal relay results
export const TEAM_COLORS = [
  {
    letter: "A",
    color: "blue",
    bgLight: "rgba(33, 150, 243, 0.1)",
    bgDark: "rgba(33, 150, 243, 0.2)",
  },
  {
    letter: "B",
    color: "violet",
    bgLight: "rgba(156, 39, 176, 0.1)",
    bgDark: "rgba(156, 39, 176, 0.2)",
  },
  {
    letter: "C",
    color: "orange",
    bgLight: "rgba(255, 152, 0, 0.2)",
    bgDark: "rgba(255, 152, 0, 0.2)",
  },
  {
    letter: "D",
    color: "teal",
    bgLight: "rgba(0, 150, 136, 0.2)",
    bgDark: "rgba(0, 150, 136, 0.2)",
  },
  {
    letter: "E",
    color: "pink",
    bgLight: "rgba(233, 30, 99, 0.1)",
    bgDark: "rgba(233, 30, 99, 0.2)",
  },
  {
    letter: "F",
    color: "indigo",
    bgLight: "rgba(63, 81, 181, 0.1)",
    bgDark: "rgba(63, 81, 181, 0.2)",
  },
  {
    letter: "G",
    color: "lime",
    bgLight: "rgba(205, 220, 57, 0.1)",
    bgDark: "rgba(205, 220, 57, 0.2)",
  },
  {
    letter: "H",
    color: "cyan",
    bgLight: "rgba(0, 188, 212, 0.1)",
    bgDark: "rgba(0, 188, 212, 0.2)",
  },
  {
    letter: "I",
    color: "grape",
    bgLight: "rgba(156, 39, 176, 0.1)",
    bgDark: "rgba(156, 39, 176, 0.2)",
  },
  {
    letter: "J",
    color: "red",
    bgLight: "rgba(244, 67, 54, 0.1)",
    bgDark: "rgba(244, 67, 54, 0.2)",
  },
];
