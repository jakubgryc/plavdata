import { Group, Title, Text, TextInput, Stack, ThemeIcon, Button } from "@mantine/core";
import { IconCalendarEvent, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

const MIN_YEAR = 2005;
const WINDOW = 3; // how many year buttons to show at once

interface CompetitionsPageHeaderProps {
  selectedYear: number;
  maxYear: number;
  search: string;
  loading: boolean;
  onYearChange: (year: number) => void;
  onSearchChange: (value: string) => void;
}

function CompetitionsPageHeader({
  selectedYear,
  maxYear,
  search,
  loading,
  onYearChange,
  onSearchChange,
}: CompetitionsPageHeaderProps) {
  const half = Math.floor(WINDOW / 2);
  let winStart = selectedYear - half;
  let winEnd = selectedYear + half;
  if (winStart < MIN_YEAR) { winStart = MIN_YEAR; winEnd = MIN_YEAR + WINDOW - 1; }
  if (winEnd > maxYear)    { winEnd = maxYear;    winStart = maxYear - WINDOW + 1; }
  winStart = Math.max(winStart, MIN_YEAR);
  winEnd   = Math.min(winEnd, maxYear);
  const visibleYears = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winEnd - i);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          <ThemeIcon variant="light" color="blue" size="lg" radius="md">
            <IconCalendarEvent size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2}>Závody</Title>
            <Text size="sm" c="dimmed">
              Závody, kde startovali plavci klubu
            </Text>
          </Stack>
        </Group>
        <TextInput
          placeholder="Hledat závod nebo místo..."
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          size="sm"
          w={{ base: "100%", xs: 280 }}
          disabled={loading}
        />
      </Group>

      <Group gap="xs" align="center" wrap="wrap">
        <Button
          variant="default"
          size="sm"
          radius="md"
          px="xs"
          disabled={selectedYear >= maxYear}
          onClick={() => onYearChange(selectedYear + 1)}
        >
          <IconChevronLeft size={16} />
        </Button>
        {visibleYears.map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? "filled" : "default"}
            size="sm"
            radius="md"
            onClick={() => onYearChange(year)}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {year}
          </Button>
        ))}
        <Button
          variant="default"
          size="sm"
          radius="md"
          px="xs"
          disabled={selectedYear <= MIN_YEAR}
          onClick={() => onYearChange(selectedYear - 1)}
        >
          <IconChevronRight size={16} />
        </Button>
      </Group>
    </Stack>
  );
}

export default CompetitionsPageHeader;

