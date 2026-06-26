import { Center, Flex, Pagination, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { API_BASE_URL } from "../../config";
import ResultsFilterBar from "../components/ResultsFilterBar";
import ResultsTable from "../components/ResultsTable";

export interface SwimResultRow {
  resultId: number;
  swimmerId: number;
  swimmerName: string;
  swimmerSurname: string;
  splitTime: boolean;
  relayPart: boolean;
  birthYear: number;
  time: number;
  points: number;
  poolLength: string;
  location: string;
  date: string;
}

interface PaginatedResultsResponse {
  results: SwimResultRow[];
  total: number;
  page: number;
  pageLimit: number;
}
const PAGE_LIMIT = 25;

function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SwimResultRow[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);

  const pool = searchParams.get("pool") ?? "25";
  const discipline = searchParams.get("discipline") ?? "50 VZ";
  const gender = searchParams.get("gender") ?? "male";
  const ageCategory = searchParams.get("ageCategory") ?? "open";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const timeType = searchParams.get("timeType") ?? "onlyFinal";
  const viewMode = searchParams.get("viewMode") ?? "best";
  const page = Number(searchParams.get("page") ?? "1");

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

        queryParams.append("page", String(page));
        queryParams.append("page_limit", String(PAGE_LIMIT));

        if (dateFrom) queryParams.append("date_from", dateFrom);
        if (dateTo) queryParams.append("date_to", dateTo);

        const response = await fetch(
          `${API_BASE_URL}/results/statistics?${queryParams.toString()}`,
          {
            method: "GET",
          },
        );

        if (!response.ok) {
          console.error("Error fetching results dataset", response.status);
          return;
        }

        const data: PaginatedResultsResponse = await response.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchResults();
  }, [pool, discipline, gender, ageCategory, dateFrom, dateTo, timeType, viewMode, page]);

  const updateFilters = (updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      next.set("page", "1");
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Flex direction="column" w="100%" pb="xl">
      <Title order={2} mb="md">
        Výsledky
      </Title>

      <ResultsFilterBar
        filters={{ pool, discipline, gender, ageCategory, dateFrom, dateTo, timeType, viewMode }}
        onFilterChange={updateFilters}
      />

      <ResultsTable results={results} loading={loading} page={page} />
      {totalPages > 1 && (
        <Center mt="md">
          <Pagination total={totalPages} value={page} onChange={handlePageChange} />
        </Center>
      )}
    </Flex>
  );
}

export default ResultsPage;
