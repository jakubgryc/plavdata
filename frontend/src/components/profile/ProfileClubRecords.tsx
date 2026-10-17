import {
  Badge,
  Box,
  Divider,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import type { SwimmerClubRecord } from "../../schema/types";
import { getAgeCategoryLabel } from "../../utils/constants";
import { formatDate, parseTimeFromMillis } from "../../utils/timeUtils";

// Display order: butterfly, backstroke, breaststroke, freestyle, medley
const STROKE_ORDER = ["M", "Z", "P", "VZ", "O"];

const STROKE_NAMES: Record<string, string> = {
  M: "Motýlek",
  Z: "Znak",
  P: "Prsa",
  VZ: "Volný způsob",
  O: "Polohový závod",
};

const CATEGORY_ORDER = ["9", "10", "11", "12", "13", "14", "junior", "open"];

const CATEGORY_COLORS: Record<string, string> = {
  "9": "teal",
  "10": "cyan",
  "11": "blue",
  "12": "indigo",
  "13": "violet",
  "14": "grape",
  junior: "orange",
  open: "yellow",
};

function parseDiscipline(code: string): { distance: number; stroke: string } {
  const [distance, stroke] = code.split(" ");
  return { distance: Number(distance), stroke };
}

function RecordCard({ record }: { record: SwimmerClubRecord }) {
  const { distance, stroke } = parseDiscipline(record.disciplineCode);

  return (
    <Paper withBorder radius="md" p={{ base: 8, sm: "sm" }}>
      <Group justify="space-between" mb={4} gap="xs" align="flex-start">
        <Text fw={700} size="sm" truncate>
          {distance} m {STROKE_NAMES[stroke]?.toLowerCase() ?? stroke}
        </Text>
        <Group gap={4} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
          {record.ageCategories.map((category) => (
            <Badge
              key={category}
              size="xs"
              variant="light"
              color={CATEGORY_COLORS[category] ?? "gray"}
            >
              {getAgeCategoryLabel(category)}
            </Badge>
          ))}
        </Group>
      </Group>
      <Group gap="xs" align="baseline" wrap="nowrap">
        <Text ff="monospace" fw={700} fz={{ base: "md", sm: "lg" }}>
          {parseTimeFromMillis(record.time)}
        </Text>
        {record.splitTime && (
          <Badge size="xs" color="orange" variant="light">
            M
          </Badge>
        )}
        {record.relayPart && (
          <Badge size="xs" color="grape" variant="light">
            Š
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" mt={2} truncate>
        {formatDate(record.date)}
        {record.competitionLocation ? ` • ${record.competitionLocation}` : ""}
      </Text>
    </Paper>
  );
}

interface CourseSectionProps {
  courseLength: number;
  records: SwimmerClubRecord[];
}

function CourseSection({ courseLength, records }: CourseSectionProps) {
  // Group by stroke, keeping the fixed stroke order
  const byStroke = new Map<string, SwimmerClubRecord[]>();
  for (const record of records) {
    const { stroke } = parseDiscipline(record.disciplineCode);
    const list = byStroke.get(stroke) ?? [];
    list.push(record);
    byStroke.set(stroke, list);
  }

  return (
    <Paper radius="lg" withBorder p={{ base: "xs", sm: "lg" }}>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon variant="transparent" color="yellow" size={28}>
          <IconTrophy size={18} />
        </ThemeIcon>
        <Title order={3} fz={{ base: 17, sm: 22 }}>
          {courseLength}m bazén
        </Title>
        <Badge size="sm" variant="light" color="yellow">
          {records.reduce((sum, r) => sum + r.ageCategories.length, 0)}
        </Badge>
      </Group>

      <Flex direction="column" gap={{ base: "sm", sm: "lg" }}>
        {STROKE_ORDER.filter((stroke) => byStroke.has(stroke)).map((stroke, strokeIndex) => {
          // Group the stroke's records by distance, categories sorted within
          const byDistance = new Map<number, SwimmerClubRecord[]>();
          for (const record of byStroke.get(stroke) ?? []) {
            const { distance } = parseDiscipline(record.disciplineCode);
            const list = byDistance.get(distance) ?? [];
            list.push(record);
            byDistance.set(distance, list);
          }
          const distances = [...byDistance.keys()].sort((a, b) => a - b);

          return (
            <Box key={stroke}>
              {strokeIndex > 0 && (
                <Divider mb={{ base: "xs", sm: "md" }} style={{ opacity: 0.75 }} />
              )}
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                c="dimmed"
                mb="xs"
                style={{ letterSpacing: "0.08em" }}
              >
                {STROKE_NAMES[stroke]}
              </Text>
              {distances.map((distance, index) => {
                const distanceRecords = (byDistance.get(distance) ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      CATEGORY_ORDER.indexOf(a.ageCategories[0]) -
                      CATEGORY_ORDER.indexOf(b.ageCategories[0]),
                  );

                return (
                  <Box key={distance}>
                    {index > 0 && (
                      <Divider
                        my={{ base: 6, sm: "sm" }}
                        variant="dotted"
                        style={{ opacity: 0.5 }}
                      />
                    )}
                    <SimpleGrid
                      cols={{ base: 1, sm: 2, lg: 3 }}
                      spacing={{ base: 6, sm: "sm" }}
                    >
                      {distanceRecords.map((record) => (
                        <RecordCard key={record.resultId} record={record} />
                      ))}
                    </SimpleGrid>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Flex>
    </Paper>
  );
}

interface ProfileClubRecordsProps {
  records: SwimmerClubRecord[];
}

function ProfileClubRecords({ records }: ProfileClubRecordsProps) {
  const records25 = records.filter((r) => r.courseLength === 25);
  const records50 = records.filter((r) => r.courseLength === 50);

  return (
    <Flex direction="column" gap="md">
      {records25.length > 0 && <CourseSection courseLength={25} records={records25} />}
      {records50.length > 0 && <CourseSection courseLength={50} records={records50} />}
    </Flex>
  );
}

export default ProfileClubRecords;
