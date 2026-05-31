import {
  Flex,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

interface HomeSkeletonProps {
  periodType?: string;
  onPeriodTypeChange?: (value: string) => void;
}

function HomeSkeleton({ periodType = "season", onPeriodTypeChange }: HomeSkeletonProps) {
  const STATS_SKELETON_KEYS = Array.from({ length: 4 }, (_, i) => `stats-skeleton-${i}`);
  const MEN_WOMEN_SKELETON_KEYS = Array.from({ length: 2 }, (_, i) => `men-women-skeleton-${i}`);
  const TOP_SWIMMERS_SKELETON_KEYS = Array.from(
    { length: 5 },
    (_, i) => `top-swimmer-skeleton-${i}`,
  );
  const RECORDS_SKELETON_KEYS = Array.from({ length: 5 }, (_, i) => `record-skeleton-${i}`);
  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      {/* Header */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Title order={2}>Statistiky PKBoh</Title>
        <SegmentedControl
          value={periodType}
          onChange={onPeriodTypeChange}
          data={[
            { label: "Sezónní", value: "season" },
            { label: "Roční", value: "year" },
          ]}
        />
      </Group>

      {/* Stats Grid Skeleton */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="xl">
        {STATS_SKELETON_KEYS.map((key) => (
          <Paper key={key} p="lg" radius="md" withBorder shadow="sm">
            <Group justify="space-between" mb="md">
              <Skeleton height={40} width={40} radius="md" />
              <Skeleton height={20} width={60} radius="xl" />
            </Group>
            <Skeleton height={14} width={100} mb={8} />
            <Skeleton height={32} width={80} mb={4} />
            <Skeleton height={12} width={120} />
          </Paper>
        ))}
      </SimpleGrid>

      {/* Top Swimmers Section */}
      <Group gap="xs" mb="md">
        <ThemeIcon size="md" variant="transparent" color="blue">
          <IconChartBar size={20} />
        </ThemeIcon>
        <Title order={3}>Nejlepší plavci dle FINA bodů</Title>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="xl">
        {MEN_WOMEN_SKELETON_KEYS.map((men_women_key) => (
          <Paper key={men_women_key} p="lg" radius="md" withBorder shadow="sm">
            <Skeleton height={24} width={120} mb="lg" />
            <Stack gap="xs">
              {TOP_SWIMMERS_SKELETON_KEYS.map((top_swimmer_key) => (
                <Skeleton key={top_swimmer_key} height={48} radius="md" />
              ))}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Records Tables Skeleton */}
      <Paper p="lg" radius="md" withBorder shadow="sm" mb="xl">
        <Skeleton height={24} width={200} mb={4} />
        <Skeleton height={14} width={300} mb="lg" />
        <Stack gap="xs">
          {RECORDS_SKELETON_KEYS.map((record_key) => (
            <Skeleton key={record_key} height={40} radius="sm" />
          ))}
        </Stack>
      </Paper>

      <Paper p="lg" radius="md" withBorder shadow="sm" mb="xl">
        <Skeleton height={24} width={200} mb={4} />
        <Skeleton height={14} width={300} mb="lg" />
        <Stack gap="xs">
          {RECORDS_SKELETON_KEYS.map((record_key) => (
            <Skeleton key={record_key} height={40} radius="sm" />
          ))}
        </Stack>
      </Paper>
    </Flex>
  );
}

export default HomeSkeleton;
