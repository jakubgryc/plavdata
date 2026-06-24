import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

// Custom primary color (your blue)
const primaryBlue: MantineColorsTuple = [
  "#e6f7fc",
  "#c3ebf7",
  "#8ed9f0",
  "#52c4e8",
  "#12a0d8", // primary color (index 4)
  "#0e8fc2",
  "#0b7aa8",
  "#08658d",
  "#065073",
  "#043b59",
];

export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue: primaryBlue,
  },
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
  headings: {
    fontFamily:
      "Work Sans, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
    fontWeight: "600",
  },
  defaultRadius: "md",
  other: {
    appBg: {
      light: "#d0d0d0",
      dark: "#1a1b1e",
    },
  },
  components: {
    Button: {
      defaultProps: {
        color: "blue.5",
      },
    },
    SegmentedControl: {
      defaultProps: {
        color: "blue.5",
      },
    },
    ActionIcon: {
      defaultProps: {
        color: "blue.5",
      },
    },
    Chip: {
      defaultProps: {
        color: "blue.5",
      },
    },
    Text: {
      styles: {
        root: {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
          letterSpacing: "-0.01em",
        },
      },
    },
    Title: {
      styles: {
        root: {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
          letterSpacing: "-0.01em",
        },
      },
    },
    TableTd: {
      styles: {
        td: {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
          letterSpacing: "-0.01em",
        },
      },
    },
    TableTh: {
      styles: {
        th: {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
          letterSpacing: "-0.01em",
        },
      },
    },
    Tab: {
      defaultProps: {
        color: "blue.5",
      },
    },
  },
});
