import {
  Card,
  Group,
  Text,
  Box,
  Table,
  Badge,
  Avatar,
  useMantineTheme,
  useMantineColorScheme,
  Anchor,
} from "@mantine/core";
import { useNavigate } from "react-router";
import { parseTimeFromMillis } from "../utils/timeUtils";
import type { RelaySwimmer } from "../schema/types";

interface TeamColor {
  letter: string;
  color: string;
  bg: string;
}

interface EqualRelayTeamCardProps {
  teamNumber: number;
  swimmers: RelaySwimmer[];
  totalTime: number;
  teamColor: TeamColor;
  delta: number;
  isFastest: boolean;
}

export function EqualRelayTeamCard({
  teamNumber,
  swimmers,
  totalTime,
  teamColor,
  delta,
  isFastest,
}: EqualRelayTeamCardProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  // Count swimmer occurrences
  const swimmerCounts = new Map<number, number>();
  swimmers.forEach((swimmer) => {
    swimmerCounts.set(
      swimmer.swimmerId,
      (swimmerCounts.get(swimmer.swimmerId) || 0) + 1,
    );
  });

  return (
    <Card
      withBorder
      shadow="sm"
      radius="lg"
      p={0}
      style={{
        overflow: "hidden",
        border: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        transition: "border-color 0.2s",
      }}
      styles={{
        root: {
          "&:hover": {
            borderColor: `${theme.colors[teamColor.color][5]}80`,
          },
        },
      }}
    >
      {/* Card Header */}
      <Group
        p="md"
        justify="space-between"
        style={{
          borderBottom: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.dark[6]
              : theme.colors.gray[0],
        }}
      >
        <Group gap="sm">
          <Avatar
            size="sm"
            radius="xl"
            color={teamColor.color}
            styles={{
              root: {
                backgroundColor: teamColor.bg,
              },
              placeholder: {
                color:
                  colorScheme === "dark"
                    ? theme.colors[teamColor.color][4]
                    : theme.colors[teamColor.color][6],
                fontWeight: 700,
                fontSize: "0.875rem",
              },
            }}
          >
            {teamColor.letter}
          </Avatar>
          <Text fw={700} size="sm">
            Štafeta {teamNumber}
          </Text>
        </Group>

        <Box ta="right">
          <Text
            size="xl"
            fw={700}
            style={{
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.2,
            }}
          >
            {parseTimeFromMillis(totalTime)}
          </Text>
          <Text size="10px" fw={500} c={isFastest ? "green" : "dimmed"}>
            {isFastest ? "Nejrychlejší" : `+${parseTimeFromMillis(delta)}`}
          </Text>
        </Box>
      </Group>

      {/* Table */}
      <Box style={{ flex: 1 }}>
        <Table
          highlightOnHover
          styles={{
            th: {
              fontSize: "0.625rem",
              padding: "0.5rem 1rem",
            },
            td: {
              fontSize: "0.75rem",
              padding: "0.5rem 1rem",
            },
          }}
        >
          <Table.Thead
            style={{
              backgroundColor:
                colorScheme === "dark"
                  ? theme.colors.dark[6]
                  : theme.colors.gray[0],
              borderBottom: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            }}
          >
            <Table.Tr>
              <Table.Th style={{ width: "2rem" }}>
                <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                  #
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                  Plavec
                </Text>
              </Table.Th>
              <Table.Th style={{ textAlign: "right" }}>
                <Text size="xs" tt="uppercase" fw={500} c="dimmed">
                  Čas
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {swimmers.map((swimmer, idx) => {
              const swimsTwice =
                (swimmerCounts.get(swimmer.swimmerId) || 0) > 1;
              const isFirstOccurrence =
                swimsTwice &&
                swimmers.findIndex((s) => s.swimmerId === swimmer.swimmerId) ===
                  idx;

              return (
                <Table.Tr
                  key={`${swimmer.swimmerId}-${idx}`}
                  style={{
                    backgroundColor:
                      swimsTwice && !isFirstOccurrence
                        ? colorScheme === "dark"
                          ? "rgba(255, 193, 7, 0.1)"
                          : "rgba(255, 193, 7, 0.05)"
                        : undefined,
                  }}
                >
                  <Table.Td>
                    <Text
                      c={swimsTwice && !isFirstOccurrence ? "orange" : "dimmed"}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {idx + 1}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="wrap">
                      <Anchor
                        component="button"
                        fw={500}
                        underline="never"
                        c={
                          swimsTwice && !isFirstOccurrence
                            ? "orange"
                            : "inherit"
                        }
                        onClick={() =>
                          navigate(`/swimmer/${swimmer.swimmerId}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        {swimmer.surname} {swimmer.name}
                      </Anchor>
                      {swimsTwice && !isFirstOccurrence && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="orange"
                          styles={{
                            root: {
                              fontSize: "0.5625rem",
                              height: "auto",
                              padding: "0.125rem 0.375rem",
                              fontWeight: 700,
                            },
                          }}
                        >
                          2. START
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text style={{ fontVariantNumeric: "tabular-nums" }}>
                      {parseTimeFromMillis(swimmer.time)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Card>
  );
}
