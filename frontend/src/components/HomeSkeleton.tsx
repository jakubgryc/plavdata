import {
  Flex,
  SimpleGrid,
  Paper,
  Group,
  Stack,
  Skeleton,
  Title,
  SegmentedControl,
  ThemeIcon,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

interface HomeSkeletonProps {
  periodType?: string;
  onPeriodTypeChange?: (value: string) => void;
}

function HomeSkeleton({
  periodType = "season",
  onPeriodTypeChange,
}: HomeSkeletonProps) {
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
        {[...Array(4)].map((_, i) => (
          <Paper key={i} p="lg" radius="md" withBorder shadow="sm">
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
        {[...Array(2)].map((_, i) => (
          <Paper key={i} p="lg" radius="md" withBorder shadow="sm">
            <Skeleton height={24} width={120} mb="lg" />
            <Stack gap="xs">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} height={48} radius="md" />
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
          {[...Array(5)].map((_, j) => (
            <Skeleton key={j} height={40} radius="sm" />
          ))}
        </Stack>
      </Paper>

      <Paper p="lg" radius="md" withBorder shadow="sm" mb="xl">
        <Skeleton height={24} width={200} mb={4} />
        <Skeleton height={14} width={300} mb="lg" />
        <Stack gap="xs">
          {[...Array(5)].map((_, j) => (
            <Skeleton key={j} height={40} radius="sm" />
          ))}
        </Stack>
      </Paper>
    </Flex>
  );
}

export default HomeSkeleton;
