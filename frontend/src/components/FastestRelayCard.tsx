import {
  Anchor,
  Badge,
  Box,
  Card,
  Group,
  rem,
  Table,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconSwimming } from "@tabler/icons-react";
import { useNavigate } from "react-router";
import type { RelaySwimmer } from "../schema/types";
import { parseTimeFromMillis } from "../utils/timeUtils";

interface FastestRelayCard {
  swimmers: RelaySwimmer[];
  totalTime: number;
  relayType: string;
  relayNumber?: number;
  isBest?: boolean;
}

// Map stroke to color
const getStrokeColor = (stroke: string) => {
  switch (stroke) {
    case "Z": // Backstroke
      return "green";
    case "P": // Breaststroke
      return "yellow";
    case "M": // Butterfly
      return "red";
    case "VZ": // Freestyle
      return "blue";
    default:
      return "gray";
  }
};

export function FastestRelayCard({
  swimmers,
  totalTime,
  relayType,
  relayNumber = 1,
  isBest = false,
}: FastestRelayCard) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  return (
    <Card
      withBorder
      shadow="sm"
      radius="lg"
      p={0}
      style={{
        overflow: "hidden",
        border: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      }}
    >
      {/* Card Header */}
      <Group
        p="md"
        justify="space-between"
        style={{
          borderBottom: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
        }}
      >
        <Group gap="md">
          {isBest && (
            <Box
              p="sm"
              style={{
                borderRadius: theme.radius.md,
                backgroundColor:
                  colorScheme === "dark" ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)",
              }}
            >
              <IconSwimming size={24} color={colorScheme === "dark" ? "#81c784" : "#4caf50"} />
            </Box>
          )}
          <Box>
            <Text fw={700} size={isBest ? "lg" : "md"}>
              {isBest
                ? `4 x 50 ${relayType === "freestyle" ? "VZ" : "PZ"}`
                : `Štafeta ${relayNumber}`}
            </Text>
            {isBest && (
              <Text size="xs" c="dimmed">
                Nejrychlejší sestava
              </Text>
            )}
          </Box>
        </Group>

        <Box ta="right">
          <Text size={isBest ? "xl" : "lg"} fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
            {parseTimeFromMillis(totalTime)}
          </Text>
          {isBest && (
            <Text size="xs" c="green" fw={500}>
              Odhadovaný čas
            </Text>
          )}
        </Box>
      </Group>

      {/* Table */}
      <Table highlightOnHover>
        <Table.Thead
          style={{
            backgroundColor: colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
          }}
        >
          <Table.Tr>
            <Table.Th style={{ width: relayType === "medley" ? "80px" : "60px" }}>
              <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                {relayType === "medley" ? "Poloha" : "#"}
              </Text>
            </Table.Th>
            <Table.Th>
              <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                Plavec
              </Text>
            </Table.Th>
            <Table.Th ta="right">
              <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                Čas
              </Text>
            </Table.Th>
            <Table.Th ta="right">
              <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                Mezičas
              </Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {swimmers.map((swimmer, idx) => {
            const isLast = idx === swimmers.length - 1;
            const cumulativeTime = swimmers.slice(0, idx + 1).reduce((sum, s) => sum + s.time, 0);

            return (
              <Table.Tr key={`${swimmer.swimmerId}-${idx}`}>
                <Table.Td>
                  {relayType === "medley" ? (
                    <Badge
                      variant="light"
                      color={getStrokeColor(swimmer.stroke || "")}
                      style={{
                        minWidth: rem(40),
                        textAlign: "center",
                      }}
                    >
                      {swimmer.stroke}
                    </Badge>
                  ) : (
                    <Text
                      c="dimmed"
                      style={{
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {idx + 1}.
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Anchor
                    component="button"
                    fw={500}
                    underline="never"
                    c="inherit"
                    onClick={() => navigate(`/swimmer/${swimmer.swimmerId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {swimmer.surname} {swimmer.name}
                  </Anchor>
                </Table.Td>
                <Table.Td ta="right">
                  <Text
                    fw={isLast ? 700 : undefined}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {parseTimeFromMillis(swimmer.time)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text
                    c={isLast ? "blue" : "dimmed"}
                    fw={isLast ? 700 : undefined}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {parseTimeFromMillis(cumulativeTime)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
