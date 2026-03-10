import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Flex, Center, Text, Skeleton, Stack } from "@mantine/core";
import { API_BASE_URL } from "../../config";
import type { CompetitionDetailResponse } from "../schema/types";
import CompetitionHeader from "../components/competition/CompetitionHeader";
import CompetitionSwimmersTable from "../components/competition/CompetitionSwimmersTable";

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
        const response = await fetch(
          `${API_BASE_URL}/api/competitions/${id}`,
          { method: "GET" },
        );
        if (!response.ok) {
          setError(
            response.status === 404
              ? "Závod nebyl nalezen"
              : "Nepodařilo se načíst data závodu",
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
    <Flex direction="column" w="100%" py="md" pb="xl" gap="md">
      <CompetitionHeader
        competition={data.competition}
        totalStarts={data.totalStarts}
        totalPersonalBests={data.totalPersonalBests}
        clubRecordsCount={data.clubRecordsCount}
      />
      <CompetitionSwimmersTable swimmers={data.swimmers} />
    </Flex>
  );
}

export default CompetitionDetail;



