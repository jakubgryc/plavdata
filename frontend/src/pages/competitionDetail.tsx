import { Center, Flex, Skeleton, Stack, Tabs, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { API_BASE_URL } from "../../config";
import CompetitionDisciplineStats from "../components/competition/CompetitionDisciplineStats";
import CompetitionHeader from "../components/competition/CompetitionHeader";
import CompetitionStrokeChart from "../components/competition/CompetitionStrokeChart";
import CompetitionSwimmersTable from "../components/competition/CompetitionSwimmersTable";
import CompetitionTopResults from "../components/competition/CompetitionTopResults";
import type { CompetitionDetailResponse } from "../schema/types";

function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CompetitionDetailResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchCompetition = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/competitions/${id}`, { method: "GET" });
        if (!response.ok) {
          setError(
            response.status === 404 ? "Závod nebyl nalezen" : "Nepodařilo se načíst data závodu",
          );
          return;
        }
        const json: CompetitionDetailResponse = await response.json();
        setData(json);
      } catch (err) {
        console.error("Error fetching competition:", err);
        setError("Nepodařilo se načíst data závodu");
      } finally {
        setIsFetching(false);
      }
    };

    fetchCompetition();
  }, [id]);

  if (isFetching) {
    return (
      <Flex direction="column" w="100%" py="md" gap="md">
        <Skeleton height={220} radius="lg" />
        <Skeleton height={400} radius="lg" />
      </Flex>
    );
  }

  if (error || !data) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="xs">
          <Text c="red" fw={600}>
            {error || "Nepodařilo se načíst data závodu"}
          </Text>
          <Text c="dimmed" size="sm">
            ID závodu: {id}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Flex direction="column" w="100%" pb="xl" gap="md">
      <CompetitionHeader
        competition={data.competition}
        totalStarts={data.totalStarts}
        totalPersonalBests={data.totalPersonalBests}
        clubRecordsCount={data.clubRecordsCount}
      />

      <Tabs defaultValue="results" mt="sm">
        <Tabs.List>
          <Tabs.Tab value="results">Výsledky plavců</Tabs.Tab>
          <Tabs.Tab value="stats">Statistiky</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="results" pt="md">
          <CompetitionSwimmersTable swimmers={data.swimmers} />
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="md">
          <Flex direction="column" gap="md">
            <CompetitionDisciplineStats swimmers={data.swimmers} />
            <CompetitionStrokeChart swimmers={data.swimmers} />
            <CompetitionTopResults swimmers={data.swimmers} />
          </Flex>
        </Tabs.Panel>
      </Tabs>
    </Flex>
  );
}

export default CompetitionDetail;
