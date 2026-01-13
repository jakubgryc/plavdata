import {
  Paper,
  Title,
  Group,
  ThemeIcon,
  Table,
  Badge,
  useMantineColorScheme,
} from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { parseTimeFromMillis, formatDate } from "../../utils/timeUtils";
import type { SwimmerPersonalBests } from "../../schema/types";
import type { ReactElement } from "react";

interface PersonalBestsTableProps {
  personalBests: SwimmerPersonalBests;
}

function PersonalBestsTable({ personalBests }: PersonalBestsTableProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // Convert backend codes to display abbreviations
  const getDisplayCode = (backendCode: string): string => {
    const code = backendCode.toUpperCase();
    // Replace K (Kraul) with VZ (Volný způsob)
    let displayCode = code.replace(/(\d+)\s*K\b/g, "$1 VZ");
    // Replace O with PZ (Polohový závod)
    displayCode = displayCode.replace(/(\d+)\s*O\b/g, "$1 PZ");
    return displayCode;
  };

  // Group personal bests by stroke type
  const groupByStroke = (records: any[]) => {
    const groups: Record<string, any[]> = {
      Znak: [],
      Prsa: [],
      Motýlek: [],
      "Volný způsob": [],
      "Polohový závod": [],
    };

    records.forEach((record) => {
      const code = record.code.toUpperCase();
      // Backend returns K for freestyle (Kraul), not VZ
      if (code.includes("K") && !code.includes("PZ")) {
        groups["Volný způsob"].push(record);
      } else if (code.includes("Z") && !code.includes("PZ")) {
        groups["Znak"].push(record);
      } else if (code.includes("P") && !code.includes("PZ")) {
        groups["Prsa"].push(record);
      } else if (code.includes("M")) {
        groups["Motýlek"].push(record);
      } else if (code.includes("O") || code.includes("PZ")) {
        // Backend returns O for medley (pOlohový závod)
        groups["Polohový závod"].push(record);
      }
    });

    return groups;
  };

  // Create a unified list of all disciplines from both pools
  const allDisciplines = new Set<string>();
  [...personalBests.pb25M, ...personalBests.pb50M].forEach((pb) => {
    allDisciplines.add(pb.code);
  });

  // Create map for quick lookup
  const pb25mMap = new Map(personalBests.pb25M.map((pb) => [pb.code, pb]));
  const pb50mMap = new Map(personalBests.pb50M.map((pb) => [pb.code, pb]));

  const groups25m = groupByStroke(personalBests.pb25M);
  const groups50m = groupByStroke(personalBests.pb50M);

  const allGroups = new Set([
    ...Object.keys(groups25m),
    ...Object.keys(groups50m),
  ]);

  const renderRows = () => {
    const rows: ReactElement[] = [];

    allGroups.forEach((strokeName) => {
      const disciplines25m = groups25m[strokeName] || [];
      const disciplines50m = groups50m[strokeName] || [];

      const allDisciplinesInGroup = new Set([
        ...disciplines25m.map((d) => d.code),
        ...disciplines50m.map((d) => d.code),
      ]);

      if (allDisciplinesInGroup.size === 0) return;

      // Group header row
      rows.push(
        <Table.Tr
          key={`header-${strokeName}`}
          style={{
            backgroundColor: isDark ? "#2C2E33" : "#f1f3f5",
          }}
        >
          <Table.Td
            colSpan={11}
            py={6}
            style={{
              position: "sticky",
              left: 0,
              zIndex: 1,
              backgroundColor: isDark ? "#2C2E33" : "#f1f3f5",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {strokeName}
            </span>
          </Table.Td>
        </Table.Tr>,
      );

      // Discipline rows
      allDisciplinesInGroup.forEach((code) => {
        const pb25 = pb25mMap.get(code);
        const pb50 = pb50mMap.get(code);

        rows.push(
          <Table.Tr
            key={code}
            style={{
              transition: "background-color 0.2s",
            }}
          >
            <Table.Td
              fw={700}
              style={{
                position: "sticky",
                left: 0,
                zIndex: 1,
                backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
                borderRight: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
              }}
            >
              {getDisplayCode(code)}
            </Table.Td>
            <Table.Td
              ta="center"
              w={40}
              style={{
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.05)"
                  : "rgba(14, 165, 233, 0.03)",
                paddingRight: 4,
              }}
            >
              {pb25?.splitTime && (
                <Badge size="xs" color="orange" variant="light">
                  M
                </Badge>
              )}
              {pb25?.relayPart && (
                <Badge size="xs" color="grape" variant="light">
                  Š
                </Badge>
              )}
            </Table.Td>
            <Table.Td
              ta="left"
              ff="monospace"
              style={{
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.05)"
                  : "rgba(14, 165, 233, 0.03)",
                paddingLeft: 4,
              }}
            >
              {pb25 ? parseTimeFromMillis(pb25.time) : "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.05)"
                  : "rgba(14, 165, 233, 0.03)",
              }}
            >
              {pb25?.points || "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.05)"
                  : "rgba(14, 165, 233, 0.03)",
              }}
            >
              {pb25?.location || "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                borderRight: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.05)"
                  : "rgba(14, 165, 233, 0.03)",
              }}
            >
              {pb25?.date ? formatDate(pb25.date) : "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              w={40}
              style={{
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(6, 182, 212, 0.03)",
                paddingRight: 4,
              }}
            >
              {pb50?.splitTime && (
                <Badge size="xs" color="orange" variant="light">
                  M
                </Badge>
              )}
              {pb50?.relayPart && (
                <Badge size="xs" color="grape" variant="light">
                  Š
                </Badge>
              )}
            </Table.Td>
            <Table.Td
              ta="left"
              ff="monospace"
              style={{
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(6, 182, 212, 0.03)",
                paddingLeft: 4,
              }}
            >
              {pb50 ? parseTimeFromMillis(pb50.time) : "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(6, 182, 212, 0.03)",
              }}
            >
              {pb50?.points || "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(6, 182, 212, 0.03)",
              }}
            >
              {pb50?.location || "-"}
            </Table.Td>
            <Table.Td
              ta="center"
              style={{
                backgroundColor: isDark
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(6, 182, 212, 0.03)",
              }}
            >
              {pb50?.date ? formatDate(pb50.date) : "-"}
            </Table.Td>
          </Table.Tr>,
        );
      });
    });

    return rows;
  };

  return (
    <Paper radius="lg" withBorder>
      <Group
        justify="space-between"
        p={{ base: "sm", sm: "lg" }}
        pb={{ base: "xs", sm: "md" }}
        wrap="wrap"
      >
        <div>
          <Group gap="xs" mb={4}>
            <ThemeIcon variant="transparent" color="blue">
              <IconClock />
            </ThemeIcon>
            <Title order={3}>Osobní rekordy</Title>
          </Group>
        </div>
      </Group>

      <Table.ScrollContainer minWidth={900}>
        <Table
          highlightOnHover
          stickyHeader
          className="personal-bests-table"
          style={{
            fontSize: "0.75rem",
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                w={100}
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  backgroundColor: isDark ? "#1a1b1e" : "#ffffff",
                  borderRight: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
                }}
              >
                Disciplína
              </Table.Th>
              <Table.Th
                colSpan={5}
                ta="center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(14, 165, 233, 0.1)"
                    : "rgba(14, 165, 233, 0.05)",
                  color: "#0ea5e9",
                  borderRight: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
                }}
              >
                25m Bazén
              </Table.Th>
              <Table.Th
                colSpan={5}
                ta="center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(6, 182, 212, 0.1)"
                    : "rgba(6, 182, 212, 0.05)",
                  color: "#06b6d4",
                }}
              >
                50m Bazén
              </Table.Th>
            </Table.Tr>
            <Table.Tr
              style={{
                fontSize: "0.625rem",
                textTransform: "uppercase",
                color: "#909296",
                fontWeight: 700,
              }}
            >
              <Table.Th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  backgroundColor: isDark ? "#25262b" : "#f1f3f5",
                }}
              ></Table.Th>
              <Table.Th w={30}></Table.Th>
              <Table.Th ta="center">Čas</Table.Th>
              <Table.Th ta="center">Body</Table.Th>
              <Table.Th ta="center">Místo</Table.Th>
              <Table.Th
                ta="center"
                style={{
                  borderRight: `1px solid ${isDark ? "#373A40" : "#dee2e6"}`,
                }}
              >
                Datum
              </Table.Th>
              <Table.Th w={30}></Table.Th>
              <Table.Th ta="center">Čas</Table.Th>
              <Table.Th ta="center">Body</Table.Th>
              <Table.Th ta="center">Místo</Table.Th>
              <Table.Th ta="center">Datum</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{renderRows()}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

export default PersonalBestsTable;
