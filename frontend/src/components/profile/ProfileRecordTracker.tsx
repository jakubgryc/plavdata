import {
  Box,
  Center,
  Chip,
  Flex,
  Group,
  Paper,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconLock, IconTarget, IconTrophy } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import type { RecordChance } from "../../schema/types";
import { getAgeCategoryLabel } from "../../utils/constants";
import { parseTimeFromMillis } from "../../utils/timeUtils";

const CATEGORY_ORDER = ["9", "10", "11", "12", "13", "14", "junior", "open"];

function formatGap(gap: number): string {
  return `+${(gap / 1000).toFixed(2)} s`;
}

function gapColor(chance: RecordChance, beatable: boolean): string | undefined {
  if (!beatable || chance.gap == null || chance.holdsRecord) return undefined;
  if (chance.gap < 1000) return "green";
  if (chance.gap < 3000) return "orange";
  return undefined;
}

function Holder({ chance, size }: { chance: RecordChance; size: "sm" | "xs" }) {
  if (chance.holdsRecord) {
    return (
      <Group gap={4} wrap="nowrap">
        <IconTrophy size={size === "sm" ? 14 : 12} color="#f59f00" style={{ flexShrink: 0 }} />
        <Text size={size} c="dimmed" truncate>
          vlastní rekord
        </Text>
      </Group>
    );
  }
  return (
    <Text
      className="textHoverLink"
      component={Link}
      to={`/swimmer/${chance.holderId}`}
      size={size}
      c={size === "xs" ? "dimmed" : undefined}
      truncate
    >
      {chance.holderSurname} {chance.holderName}
    </Text>
  );
}

interface RecordRowProps {
  chance: RecordChance;
  beatable: boolean;
}

function TableRow({ chance, beatable }: RecordRowProps) {
  return (
    <Table.Tr style={{ opacity: beatable ? 1 : 0.75 }}>
      <Table.Td>
        <Text fw={600} size="sm">
          {chance.disciplineCode}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text ff="monospace" size="sm" c="dimmed">
          {chance.pbTime != null ? parseTimeFromMillis(chance.pbTime) : "–"}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text ff="monospace" size="sm" fw={600}>
          {parseTimeFromMillis(chance.recordTime)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Holder chance={chance} size="sm" />
      </Table.Td>
      <Table.Td ta="right">
        {chance.holdsRecord ? (
          <IconTrophy size={16} color="#f59f00" />
        ) : chance.gap != null ? (
          <Text ff="monospace" size="sm" fw={700} c={gapColor(chance, beatable)}>
            {formatGap(chance.gap)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            –
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

interface CourseSectionProps {
  courseLength: number;
  chances: RecordChance[];
  beatable: boolean;
}

function CourseSection({ courseLength, chances, beatable }: CourseSectionProps) {
  // One entry per discipline (single selected category) — closest first
  const sorted = useMemo(
    () =>
      chances
        .slice()
        .sort((a, b) => (a.gap ?? Number.MAX_SAFE_INTEGER) - (b.gap ?? Number.MAX_SAFE_INTEGER)),
    [chances],
  );

  if (sorted.length === 0) return null;

  return (
    <Paper radius="lg" withBorder p={{ base: "xs", sm: "lg" }}>
      <Group gap="xs" mb={{ base: "xs", sm: "md" }}>
        <ThemeIcon variant="transparent" color="blue" size={28}>
          <IconTarget size={18} />
        </ThemeIcon>
        <Title order={3} fz={{ base: 17, sm: 22 }}>
          {courseLength}m bazén
        </Title>
      </Group>

      <Table.ScrollContainer minWidth={540}>
        <Table
          striped
          highlightOnHover
          verticalSpacing={6}
          className="responsive-results-table"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Disciplína</Table.Th>
              <Table.Th>PB</Table.Th>
              <Table.Th>Rekord</Table.Th>
              <Table.Th>Držitel</Table.Th>
              <Table.Th ta="right">Rozdíl</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((chance) => (
              <TableRow key={chance.disciplineCode} chance={chance} beatable={beatable} />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

interface ProfileRecordTrackerProps {
  chances: RecordChance[];
}

function ProfileRecordTracker({ chances }: ProfileRecordTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Only records where the swimmer has an age-eligible time are comparable
  const comparable = useMemo(
    () => chances.filter((c) => c.pbTime != null && c.gap != null),
    [chances],
  );

  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => comparable.some((c) => c.ageCategory === cat)),
    [comparable],
  );

  const beatableCategories = useMemo(
    () => new Set(comparable.filter((c) => c.beatable).map((c) => c.ageCategory)),
    [comparable],
  );

  // Default: the youngest category the swimmer can still break records in
  const defaultCategory = useMemo(
    () => availableCategories.find((cat) => beatableCategories.has(cat)) ?? availableCategories[0],
    [availableCategories, beatableCategories],
  );

  const category =
    selectedCategory && availableCategories.includes(selectedCategory)
      ? selectedCategory
      : defaultCategory;

  const filtered = comparable.filter((c) => c.ageCategory === category);
  const chances25 = filtered.filter((c) => c.courseLength === 25);
  const chances50 = filtered.filter((c) => c.courseLength === 50);
  const categoryBeatable = category != null && beatableCategories.has(category);

  if (comparable.length === 0) {
    return (
      <Center h={200}>
        <Text c="dimmed">
          Zatím není s čím srovnávat — chybí časy v rekordních disciplínách.
        </Text>
      </Center>
    );
  }

  return (
    <Flex direction="column" gap="md">
      <Box>
        <Text size="xs" c="dimmed" mb="xs">
          PB = nejlepší čas zaplavaný ještě v dané kategorii. Vyber kategorii — rozdíly k jejím
          rekordům jsou seřazené od nejmenšího.
        </Text>
        <Chip.Group
          value={category ?? ""}
          onChange={(val) => setSelectedCategory(val as string)}
        >
          <Flex gap="xs" wrap="wrap">
            {availableCategories.map((cat) => (
              <Chip key={cat} value={cat} size="xs" variant="filled">
                <Group gap={4} wrap="nowrap">
                  {!beatableCategories.has(cat) && <IconLock size={11} />}
                  {getAgeCategoryLabel(cat)}
                </Group>
              </Chip>
            ))}
          </Flex>
        </Chip.Group>
      </Box>

      {category && !categoryBeatable && (
        <Group gap={4}>
          <IconLock size={13} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            V této kategorii už není možné rekord překonat (věkový limit) — jde o historické
            srovnání.
          </Text>
        </Group>
      )}

      <CourseSection courseLength={25} chances={chances25} beatable={categoryBeatable} />
      <CourseSection courseLength={50} chances={chances50} beatable={categoryBeatable} />
    </Flex>
  );
}

export default ProfileRecordTracker;
