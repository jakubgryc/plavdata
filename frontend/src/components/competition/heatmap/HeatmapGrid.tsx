import { Box, Table, Text, Tooltip } from "@mantine/core";
import { useMemo } from "react";
import { Link } from "react-router";
import type { CompetitionResultDetail, CompetitionSwimmerResult } from "../../../schema/types";
import { DISCIPLINES } from "../../../utils/constants";
import { parseTimeFromMillis } from "../../../utils/timeUtils";
import { CELL_COLORS, STROKE_GROUPS } from "./heatmap.constants";

import { generateHeatmapLookup } from "./heatmap.utils";

interface HeatmapGridProps {
  swimmers: CompetitionSwimmerResult[];
}

const SEPARATOR_BORDER = "2px solid var(--mantine-color-dark-4)";

function _getTooltipLabel(swimmerName: string, result: CompetitionResultDetail, state: string) {
  return (
    <Box p={3}>
      <Text fw={700} size="sm" mb={2}>
        {swimmerName}
      </Text>
      <Text size="xs">
        Disciplína:{" "}
        <Text span fw={500}>
          {result.disciplineCode}
        </Text>
      </Text>
      <Text size="xs">
        Čas:{" "}
        <Text span fw={500} c={state === "dnf" ? "red.4" : "inherit"}>
          {state === "dnf" ? "DNF / DNS" : parseTimeFromMillis(result.time)}
        </Text>
      </Text>
      {result?.points !== undefined && (
        <Text size="xs">
          Body:{" "}
          <Text span fw={500}>
            {result.points}
          </Text>
        </Text>
      )}
    </Box>
  );
}

function HeatmapGrid({ swimmers }: HeatmapGridProps) {
  const heatmapLookup = useMemo(() => generateHeatmapLookup(swimmers), [swimmers]);

  const strokeHeaders = STROKE_GROUPS.map((group, index) => {
    const isLastGroup = index === STROKE_GROUPS.length - 1;

    return (
      <Table.Th
        key={group.label}
        colSpan={group.colSpan}
        style={{
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 600,
          paddingBottom: "6px",
          borderRight: !isLastGroup ? SEPARATOR_BORDER : undefined,
        }}
      >
        {group.label}
      </Table.Th>
    );
  });

  const distanceHeaders = DISCIPLINES.map((discipline, index) => {
    const distanceOnly = discipline.split(" ")[0];
    const currentSuffix = discipline.split(" ")[1];
    const nextSuffix = DISCIPLINES[index + 1]?.split(" ")[1];

    const isLastInGroup = nextSuffix && currentSuffix !== nextSuffix;

    return (
      <Table.Th
        key={discipline}
        style={{
          textAlign: "center",
          fontWeight: "normal",
          fontSize: "12px",
          color: "var(--mantine-color-dimmed)",
          paddingTop: "6px",
          borderRight: isLastInGroup ? SEPARATOR_BORDER : undefined,
        }}
      >
        {distanceOnly}
      </Table.Th>
    );
  });

  const rows = swimmers.map((swimmer) => {
    const swimmerDisciplineMap = heatmapLookup.get(swimmer.swimmerId);

    return (
      <Table.Tr key={swimmer.swimmerId}>
        <Table.Td
          style={{
            whiteSpace: "nowrap",
            fontWeight: 500,
            fontSize: "14px",
            width: 140,
            borderRight: "1px solid var(--mantine-color-dark-4)",
            position: "sticky",
            left: 0,
            zIndex: 1,
            backgroundColor: "var(--mantine-color-body)",
          }}
        >
          <Text className="swimmerLink" component={Link} to={`/swimmer/${swimmer.swimmerId}`}>
            {`${swimmer.surname} ${swimmer.name}`}
          </Text>
        </Table.Td>

        {DISCIPLINES.map((discipline, index) => {
          const cellData = swimmerDisciplineMap?.get(discipline) || { state: "none" };
          const { state, result } = cellData;

          const currentSuffix = discipline.split(" ")[1];
          const nextSuffix = DISCIPLINES[index + 1]?.split(" ")[1];
          const isLastInGroup = nextSuffix && currentSuffix !== nextSuffix;

          const tooltipLabel =
            result !== undefined
              ? _getTooltipLabel(`${swimmer.surname} ${swimmer.name}`, result, state)
              : undefined;

          return (
            <Table.Td
              key={discipline}
              p={3}
              style={{
                textAlign: "center",
                borderRight: isLastInGroup ? SEPARATOR_BORDER : undefined,
              }}
            >
              <Tooltip
                position="top"
                withArrow
                withinPortal
                disabled={state === "none"}
                label={tooltipLabel}
              >
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: CELL_COLORS[state],
                    border: state === "none" ? "1px solid var(--mantine-color-dark-4)" : undefined,
                    margin: "0 auto",
                    cursor: state !== "none" ? "pointer" : "default",
                    transition: "transform 0.1s ease",
                  }}
                />
              </Tooltip>{" "}
            </Table.Td>
          );
        })}
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={700} maxHeight={450} type="native">
      <Table
        stickyHeader={true}
        withRowBorders={false}
        verticalSpacing="xs"
        horizontalSpacing="xs"
        className="competitions-table"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th
              rowSpan={2}
              style={{
                width: 140,
                verticalAlign: "middle",
                borderRight: "1px solid var(--mantine-color-dark-4)",
                position: "sticky",
                left: 0,
                zIndex: 3,
                backgroundColor: "var(--mantine-color-body)",
              }}
            />
            {strokeHeaders}
          </Table.Tr>

          <Table.Tr>{distanceHeaders}</Table.Tr>
        </Table.Thead>

        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export default HeatmapGrid;
