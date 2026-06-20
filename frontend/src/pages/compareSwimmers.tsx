import { Flex, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import ComparisonFilterBar from "../components/ComparisonFilterBar";
import ComparisonSwimmerChart from "../components/ComparisonSwimmerChart";
import type { GroupedSwimmers, SwimmerResults } from "../schema/types";
import { parseCurrentDiscipline, shiftResults } from "../utils/chartUtils";
import { DISCIPLINES } from "../utils/constants";

function CompareSwimmers() {
  const [results, setResults] = useState<SwimmerResults[]>([]);
  const [groupedSwimmers, setGroupedSwimmers] = useState<GroupedSwimmers[]>([]);
  const [selectedSwimmers, setSelectedSwimmers] = useState<number[]>([]);

  // Filter bar states
  const [pool, setPool] = useState<string>("25");
  const [timeAxis, setTimeAxis] = useState<string>("absolute");
  const [intermediateTimes, setIntermediateTimes] = useState<string>("all");
  const [resultType, setResultType] = useState<string>("all");

  /*
   * difference between selectedDiscipline and parsedDiscipline is that
   * selectedDiscipline is used for API fetch, whereas parsedDiscipline is used
   * for displaying the actual discipline that is being displayed in the chart
   * parsedDiscipline can be different when user selects discipline but does not
   * update the results yet
   */
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(DISCIPLINES[0]);
  const [parsedDiscipline, setParsedDiscipline] = useState<string | null>(null);

  const [lastFetchedFilterHash, setLastFetchedFilterHash] = useState<string>("");

  const parsedResults = useMemo(() => {
    if (timeAxis === "relative") {
      return shiftResults(results);
    }
    return results;
  }, [results, timeAxis]);

  useEffect(() => {
    const fetchGroupedSwimmers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swimmers/grouped?include_former=true`, {
          method: "GET",
        });
        if (!response.ok) {
          console.error("Error fetching grouped swimmers", response.status);
          return;
        }
        const data: GroupedSwimmers[] = await response.json();
        setGroupedSwimmers(data);
      } catch (error) {
        console.error("Error fetching grouped swimmers:", error);
      }
    };

    void fetchGroupedSwimmers();
  }, []);

  const fetchComparisonResults = async () => {
    try {
      let discipline = "";
      if (selectedDiscipline) {
        // convert VZ to K for API
        if (selectedDiscipline.endsWith(" VZ")) {
          discipline = selectedDiscipline.replace(" VZ", " K");
        } else {
          discipline = selectedDiscipline;
        }
      }
      const response = await fetch(`${API_BASE_URL}/api/results/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swimmer_ids: selectedSwimmers,
          discipline_code: discipline,
          course: pool,
        }),
      });

      if (!response.ok) {
        console.error("Error fetching comparison results", response.status);
        return;
      }
      const data: SwimmerResults[] = await response.json();
      setResults(data);
      const currentDiscipline = parseCurrentDiscipline(data);
      setParsedDiscipline(currentDiscipline);
      setLastFetchedFilterHash(`${selectedSwimmers.join(",")}|${selectedDiscipline}|${pool}`);
    } catch (error) {
      console.error("Error fetching comparison results:", error);
    }
  };

  return (
    <Flex direction="column" w="100%" pb="xl">
      <Title order={2} mb="4">
        Srovnání výsledků
      </Title>
      <ComparisonFilterBar
        groupedSwimmers={groupedSwimmers}
        selectedSwimmers={selectedSwimmers}
        setSelectedSwimmers={setSelectedSwimmers}
        selectedDiscipline={selectedDiscipline}
        setSelectedDiscipline={setSelectedDiscipline}
        pool={pool}
        setPool={setPool}
        timeAxis={timeAxis}
        setTimeAxis={setTimeAxis}
        intermediateTimes={intermediateTimes}
        setIntermediateTimes={setIntermediateTimes}
        resultType={resultType}
        setResultType={setResultType}
        onFetchResults={fetchComparisonResults}
        lastFetchedFilterHash={lastFetchedFilterHash}
      />
      <ComparisonSwimmerChart
        parsedResults={parsedResults}
        currentDiscipline={parsedDiscipline}
        timeAxis={timeAxis}
        intermediateTimes={intermediateTimes}
        resultType={resultType}
      />
    </Flex>
  );
}

export default CompareSwimmers;
