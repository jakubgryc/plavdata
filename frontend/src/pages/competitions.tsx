import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Flex, Center, Text } from "@mantine/core";
import { API_BASE_URL } from "../../config";
import type { CompetitionListItem } from "../schema/types";
import CompetitionsPageHeader from "../components/competition/CompetitionsPageHeader";
import CompetitionList from "../components/competition/CompetitionList";

const MAX_YEAR = new Date().getFullYear();

function Competitions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = parseInt(searchParams.get("year") ?? "");
  const selectedYear = isNaN(yearParam) ? MAX_YEAR : yearParam;

  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleYearChange = (year: number) => {
    setSearchParams({ year: String(year) });
  };

  useEffect(() => {
    const fetchYear = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/competitions?year=${selectedYear}`);
        if (!res.ok) {
          setError("Nepodařilo se načíst závody");
          return;
        }
        setCompetitions(await res.json());
      } catch (err) {
        console.error(err);
        setError("Nepodařilo se načíst závody");
      } finally {
        setLoading(false);
      }
    };
    fetchYear();
  }, [selectedYear]);

  const filtered = competitions.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.location ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Flex direction="column" w="100%" py="md" pb="xl" gap="lg">
      <CompetitionsPageHeader
        selectedYear={selectedYear}
        maxYear={MAX_YEAR}
        search={search}
        loading={loading}
        onYearChange={handleYearChange}
        onSearchChange={setSearch}
      />

      {error ? (
        <Center h="30vh">
          <Text c="red">{error}</Text>
        </Center>
      ) : (
        <CompetitionList competitions={filtered} loading={loading} />
      )}
    </Flex>
  );
}

export default Competitions;

