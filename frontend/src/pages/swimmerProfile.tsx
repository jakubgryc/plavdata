import { Center, Flex, Loader, Tabs, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { API_BASE_URL } from "../../config";
import CompetitionsTable from "../components/profile/CompetitionsTable";
import PerformanceChart from "../components/profile/PerformanceChart";
import PersonalBestsTable from "../components/profile/PersonalBestsTable";
import ProfileHeader from "../components/profile/ProfileHeader";
import QuarterlyImprovementChart from "../components/profile/QuarterlyImprovementChart";
import StrokeRadarChart from "../components/profile/StrokeRadarChart";
import TopResultsCard from "../components/profile/TopResultsCard";
import type { SwimmerProfileResponse } from "../schema/types";

function SwimmerProfile() {
  const params = useParams();
  const id = params.id;
  const [profileData, setProfileData] = useState<SwimmerProfileResponse | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      setIsFetching(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/swimmers/${id}/profile`, {
          method: "GET",
        });

        if (!response.ok) {
          console.error("Error fetching profile", response.status);
          setError("Nepodařilo se načíst profil plavce");
          return;
        }

        const data: SwimmerProfileResponse = await response.json();
        setProfileData(data);
      } catch (err) {
        console.error("Error fetching swimmer profile:", err);
        setError("Nepodařilo se načíst profil plavce");
      } finally {
        setIsFetching(false);
      }
    };

    void fetchProfile();
  }, [id]);

  if (isFetching) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !profileData) {
    return (
      <Center h="50vh">
        <Text c="red">{error || "Nepodařilo se načíst profil plavce"}</Text>
      </Center>
    );
  }

  const {
    basicInfo,
    stats,
    topResults,
    startsByYear,
    competitions,
    personalBests,
    startsByStroke,
    quarterlyImprovements,
  } = profileData;

  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      <ProfileHeader basicInfo={basicInfo} stats={stats} />

      <Tabs defaultValue="overview" mt="xl">
        <Tabs.List>
          <Tabs.Tab value="overview">Přehled</Tabs.Tab>
          <Tabs.Tab value="pb">Osobní rekordy</Tabs.Tab>
          <Tabs.Tab value="competitions">Závody</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Flex direction="column" gap="md">
            <Flex direction={{ base: "column", lg: "row" }} gap="md" align="stretch">
              <div style={{ flex: 4 }}>
                <PerformanceChart data={startsByYear} />
              </div>
              <div style={{ flex: 3 }}>
                <StrokeRadarChart startsByStroke={startsByStroke} />
              </div>
            </Flex>
            <QuarterlyImprovementChart data={quarterlyImprovements} />
            <TopResultsCard results={topResults} />
          </Flex>
        </Tabs.Panel>

        <Tabs.Panel value="pb" pt="md">
          <PersonalBestsTable personalBests={personalBests} />
        </Tabs.Panel>

        <Tabs.Panel value="competitions" pt="md">
          <CompetitionsTable competitions={competitions} />
        </Tabs.Panel>
      </Tabs>
    </Flex>
  );
}

export default SwimmerProfile;
