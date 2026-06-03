import { Box, Group, Paper, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";
import type { CompetitionResultDetail, CompetitionSwimmerResult } from "../../schema/types";
import { DISCIPLINES, DNF_THRESHOLD } from "../../utils/constants";
import { parseTimeFromMillis } from "../../utils/timeUtils";

interface CompetitionDisciplineStatsProps {
  swimmers: CompetitionSwimmerResult[];
}

type CellState = "pb" | "swam" | "dnf" | "none";

interface CellData {
  state: CellState;
  result?: CompetitionResultDetail;
}

const CELL_COLORS: Record<CellState, string> = {
  pb: "#2ecc71",
  swam: "#3b82f6",
  dnf: "#e74c3c",
  none: "transparent",
};

const CELL_LABELS: Record<CellState, string> = {
  pb: "Osobní rekord",
  swam: "Zaplaváno",
  dnf: "DNF / DNS",
  none: "Nestartoval/a",
};

const CELL_SIZE = 45;
const NAME_COL_WIDTH = 130;
const HEADER_HEIGHT = 110;
const MAX_HEIGHT = 520;

function CompetitionDisciplineStats({ swimmers }: CompetitionDisciplineStatsProps) {
  const lookup = new Map<number, Map<string, CellData>>();
  for (const swimmer of swimmers) {
    const dmap = new Map<string, CellData>();
    for (const result of swimmer.results) {
      if (result.relayPart) continue;
      const isDnf = result.time >= DNF_THRESHOLD;
      dmap.set(result.disciplineCode, {
        state: isDnf ? "dnf" : result.improvement ? "pb" : "swam",
        result,
      });
    }
    lookup.set(swimmer.swimmerId, dmap);
  }

  return (
    <Paper p={{ base: "sm", sm: "lg" }} radius="lg" withBorder>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon variant="transparent" color="blue">
          <IconLayoutGrid />
        </ThemeIcon>
        <Title order={3}>Heatmapa startů</Title>
      </Group>

      <Group gap="md" mb="md" wrap="wrap">
        {(["pb", "swam", "dnf", "none"] as CellState[]).map((state) => (
          <Group gap={6} key={state}>
            <Box
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: CELL_COLORS[state],
                border: state === "none" ? "1px solid #373A40" : undefined,
                flexShrink: 0,
              }}
            />
            <Text size="xs" c="dimmed">
              {CELL_LABELS[state]}
            </Text>
          </Group>
        ))}
      </Group>

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: MAX_HEIGHT, width: "100%" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              {/* Top-left corner cell — sticky both */}
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  background: "var(--mantine-color-body)",
                  width: NAME_COL_WIDTH,
                  minWidth: NAME_COL_WIDTH,
                  padding: 0,
                }}
              />
              {DISCIPLINES.map((d) => (
                <th
                  key={d}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    background: "var(--mantine-color-body)",
                    padding: 0,
                    verticalAlign: "bottom",
                  }}
                >
                  <div
                    style={{
                      width: CELL_SIZE,
                      height: HEADER_HEIGHT,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      paddingBottom: 4,
                    }}
                  >
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      {d}
                    </Text>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {swimmers.map((swimmer) => {
              const dmap = lookup.get(swimmer.swimmerId) ?? new Map<string, CellData>();
              return (
                <tr key={swimmer.swimmerId}>
                  {/* Sticky name cell */}
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: "var(--mantine-color-body)",
                      padding: "0 8px 4px 0",
                      width: NAME_COL_WIDTH,
                      minWidth: NAME_COL_WIDTH,
                    }}
                  >
                    <Text
                      size="xs"
                      fw={500}
                      style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {swimmer.surname} {swimmer.name}
                    </Text>
                  </td>

                  {DISCIPLINES.map((d) => {
                    const cell: CellData = dmap.get(d) ?? { state: "none" };
                    const tooltipLabel = cell.result
                      ? `${swimmer.surname} ${swimmer.name} — ${d}\n${parseTimeFromMillis(cell.result.time)}${cell.result.points != null ? ` · ${cell.result.points} b.` : ""}`
                      : `${swimmer.surname} ${swimmer.name} — ${d}\nNestartoval/a`;

                    return (
                      <td key={d} style={{ padding: "0 4px 4px 0" }}>
                        <Tooltip
                          label={tooltipLabel}
                          multiline
                          withArrow
                          position="top"
                          styles={{ tooltip: { whiteSpace: "pre-line", fontSize: 11 } }}
                        >
                          <Box
                            style={{
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              borderRadius: 5,
                              backgroundColor: CELL_COLORS[cell.state],
                              border: cell.state === "none" ? "1px solid #373A40" : undefined,
                              cursor: cell.state !== "none" ? "pointer" : "default",
                              opacity: cell.state === "none" ? 0.4 : 1,
                              transition: "opacity 0.15s",
                            }}
                          />
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Paper>
  );
}

export default CompetitionDisciplineStats;
