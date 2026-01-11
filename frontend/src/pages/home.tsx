import { useEffect, useState } from "react";
import {
  Flex,
  Title,
  Text,
  SimpleGrid,
  Group,
  ThemeIcon,
  Center,
  SegmentedControl,
} from "@mantine/core";
import {
  IconSwimming,
  IconCalendarEvent,
  IconTrophy,
  IconFlame,
  IconChartBar,
} from "@tabler/icons-react";

import { API_BASE_URL } from "../../config";
import StatCard from "../components/StatCard";
import TopSwimmersCard from "../components/TopSwimmersCard";
import ClubRecordsTable from "../components/ClubRecordsTable";
import HomeSkeleton from "../components/HomeSkeleton";
import type { DashboardResponse } from "../schema/types";

function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<string>("season");

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/stats/dashboard?period_type=${periodType}`,
          {
            method: "GET",
          },
        );
        if (!response.ok) throw new Error("Failed to fetch dashboard stats");
        const data: DashboardResponse = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Nepodařilo se načíst data");
      } finally {
        setIsFetching(false);
      }
    };

    fetchDashboardStats();
  }, [periodType]);

  if (isFetching) {
    return (
      <HomeSkeleton
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
      />
    );
  }

  if (error || !dashboardData) {
    return (
      <Center h="50vh">
        <Text c="red">{error || "Nepodařilo se načíst data"}</Text>
      </Center>
    );
  }

  const {
    stats,
    topMen,
    topWomen,
    recentRecords,
    oldestRecords,
    currentPeriod,
    previousPeriod,
  } = dashboardData;

  const currentPeriodLabel =
    periodType === "season"
      ? `za sezónu ${currentPeriod}`
      : `za rok ${currentPeriod}`;
  const previousPeriodLabel =
    periodType === "season"
      ? `za sezónu ${previousPeriod}`
      : `za rok ${previousPeriod}`;

  const statCards = [
    {
      title: "Celkem startů",
      value: stats.totalStarts.current,
      previousValue: stats.totalStarts.previous,
      icon: IconSwimming,
      color: "blue",
      periodType: periodType as "year" | "season",
      currentPeriodLabel,
      previousPeriodLabel,
    },
    {
      title: "Počet závodů",
      value: stats.totalMeets.current,
      previousValue: stats.totalMeets.previous,
      icon: IconCalendarEvent,
      color: "teal",
      periodType: periodType as "year" | "season",
      currentPeriodLabel,
      previousPeriodLabel,
    },
    {
      title: "Nové klubové rekordy",
      value: stats.clubRecords.current,
      previousValue: stats.clubRecords.previous,
      icon: IconTrophy,
      color: "yellow",
      periodType: periodType as "year" | "season",
      currentPeriodLabel,
      previousPeriodLabel,
    },
    {
      title: "Počet osobních rekordů",
      value: stats.personalBests.current,
      previousValue: stats.personalBests.previous,
      icon: IconFlame,
      color: "violet",
      periodType: periodType as "year" | "season",
      currentPeriodLabel,
      previousPeriodLabel,
    },
  ];

  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      {/* Header */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Title order={2}>Statistiky PKBoh</Title>
        <SegmentedControl
          value={periodType}
          onChange={setPeriodType}
          data={[
            { label: "Sezónní", value: "season" },
            { label: "Roční", value: "year" },
          ]}
        />
      </Group>

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="xl">
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
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
        <TopSwimmersCard title="Muži - Top 5" swimmers={topMen} />
        <TopSwimmersCard title="Ženy - Top 5" swimmers={topWomen} />
      </SimpleGrid>

      {/* Recent Records Table */}
      <ClubRecordsTable
        records={recentRecords}
        title="Nové klubové rekordy"
        subtitle={`${recentRecords.length} nejnovějších pokořených rekordů`}
        variant="recent"
      />

      {/* Oldest Records Table */}
      <ClubRecordsTable
        records={oldestRecords}
        title="Nejstarší klubové rekordy"
        subtitle={`${oldestRecords.length} nejstarších nepokořených rekordů`}
        variant="oldest"
      />
    </Flex>
  );
}

export default Home;
