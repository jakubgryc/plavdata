import { Flex, SimpleGrid, Paper, Group, Stack, Skeleton } from "@mantine/core";

function HomeSkeleton() {
  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      {/* Header Skeleton */}
      <Skeleton height={32} width={250} mb="md" />

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

      {/* Top Swimmers Section Skeleton */}
      <Skeleton height={24} width={280} mb="md" />
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
      {[...Array(2)].map((_, i) => (
        <Paper key={i} p="lg" radius="md" withBorder shadow="sm" mb="xl">
          <Skeleton height={24} width={200} mb={4} />
          <Skeleton height={14} width={250} mb="lg" />
          <Stack gap="xs">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} height={40} radius="sm" />
            ))}
          </Stack>
        </Paper>
      ))}
    </Flex>
  );
}

export default HomeSkeleton;
