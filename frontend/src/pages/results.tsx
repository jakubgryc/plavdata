import { Flex, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { API_BASE_URL } from "../../config";
import ResultsFilterBar from "../components/ResultsFilterBar";
import ResultsTable from "../components/ResultsTable";

export interface SwimResultRow {
  id: number;
  swimmer_id: number;
  swimmer_name: string;
  birth_year: number;
  time_formatted: string;
  fina_points: number;
  pool_length: string;
  location: string;
  competition_name: string;
  date: string;
}

function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SwimResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const pool = searchParams.get("pool") ?? "all";
  const discipline = searchParams.get("discipline") ?? "50 VZ";
  const gender = searchParams.get("gender") ?? "male";
  const ageCategory = searchParams.get("ageCategory") ?? "open";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const timeType = searchParams.get("timeType") ?? "onlyFinal";
  const viewMode = searchParams.get("viewMode") ?? "best";

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (pool !== "all") queryParams.append("course", pool);

        let mappedDiscipline = discipline;
        if (discipline.endsWith(" VZ")) {
          mappedDiscipline = discipline.replace(" VZ", " K");
        }
        queryParams.append("discipline_code", mappedDiscipline);
        queryParams.append("gender", gender);
        queryParams.append("age_category", ageCategory);
        queryParams.append("time_type", timeType);
        queryParams.append("view_mode", viewMode);

        if (dateFrom) queryParams.append("date_from", dateFrom);
        if (dateTo) queryParams.append("date_to", dateTo);

        const response = await fetch(`${API_BASE_URL}/api/results?${queryParams.toString()}`, {
          method: "GET",
        });

        if (!response.ok) {
          console.error("Error fetching results dataset", response.status);
          return;
        }

        const data: SwimResultRow[] = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchResults();
  }, [pool, discipline, gender, ageCategory, dateFrom, dateTo, timeType, viewMode]);

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (!value) {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  };

  return (
    <Flex direction="column" w="100%" pb="xl">
      <Title order={2} mb="md">
        Výsledky
      </Title>

      <ResultsFilterBar
        filters={{ pool, discipline, gender, ageCategory, dateFrom, dateTo, timeType, viewMode }}
        onFilterChange={updateFilter}
      />

      <ResultsTable results={results} loading={loading} />
    </Flex>
  );
}

export default ResultsPage;
