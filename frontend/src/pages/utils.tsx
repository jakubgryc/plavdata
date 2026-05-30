import { Box, Flex, Paper, Stack, Tabs, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrophy, IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "../../config";
import { EqualRelayFilterBar } from "../components/EqualRelayFilterBar.tsx";
import { EqualRelayResults } from "../components/EqualRelayResults";
import { FastestRelayFilterBar } from "../components/FastestRelayFilterBar.tsx";
import { FastestRelayResults } from "../components/FastestRelayResults";
import type { EqualRelayResult, GroupedSwimmers, RelayResult } from "../schema/types";
import { findSwimmerIds } from "../utils/chartUtils";

function Utils() {
  const [activeTab, setActiveTab] = useState<string | null>("fastest");

  const [swimmers, setSwimmers] = useState<GroupedSwimmers[]>([]);
  const [selectedSwimmers, setSelectedSwimmers] = useState<string[]>([]);
  const [relayType, setRelayType] = useState<string>("freestyle");
  const [results, setResults] = useState<RelayResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedRelayHash, setLastFetchedRelayHash] = useState<string>("");

  // Equal Relays state
  const [selectedEqualRelaySwimmers, setSelectedEqualRelaySwimmers] = useState<string[]>([]);
  const [numRelays, setNumRelays] = useState<number>(2);
  const [equalRelayResults, setequalRelayResults] = useState<EqualRelayResult | null>(null);
  const [isLoadingEqualRelay, setIsLoadingEqualRelay] = useState(false);

  useEffect(() => {
    const fetchSwimmers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swimmers/grouped`);
        if (!response.ok) throw new Error("Failed to fetch swimmers");
        const data: GroupedSwimmers[] = await response.json();
        setSwimmers(data);
      } catch (error) {
        console.error("Error fetching swimmers:", error);
      }
    };
    fetchSwimmers();
  }, []);

  const handleCalculate = async () => {
    const swimmerIds = findSwimmerIds(selectedSwimmers, swimmers);
    if (swimmerIds.length < 4) {
      notifications.show({
        title: "Chyba",
        message: "Vyberte alespoň 4 plavce",
        color: "red",
      });
      return;
    }

    if (swimmerIds.length > 30) {
      notifications.show({
        title: "Chyba",
        message: "Maximální počet plavců je 30 pro výpočet nejrychlejší štafety",
        color: "red",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utils/best-relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swimmerIds: swimmerIds,
          relayType,
        }),
      });

      if (response.status === 429) {
        notifications.show({
          title: "Příliš mnoho požadavků",
          message: "Překročili jste limit 20 výpočtů za minutu. Zkuste to prosím za chvíli.",
          color: "orange",
          autoClose: 5000,
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to calculate relay");
      }

      const data = await response.json();
      setResults(data.relays);
      // Set the hash after successful fetch
      const hash = `${selectedSwimmers.sort().join(",")}|${relayType}`;
      setLastFetchedRelayHash(hash);
    } catch (error) {
      console.error("Error calculating relay:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se vypočítat štafetu. Zkuste to prosím znovu.",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateEqualFun = async () => {
    const swimmerIds = findSwimmerIds(selectedEqualRelaySwimmers, swimmers);
    if (swimmerIds.length < numRelays * 2) {
      notifications.show({
        title: "Chyba",
        message: `Vyberte alespoň ${numRelays * 2} plavců`,
        color: "red",
      });
      return;
    }
    if (swimmerIds.length > 50) {
      notifications.show({
        title: "Chyba",
        message: "Maximální počet plavců je 50 pro výpočet vyrovnaných štafet",
        color: "red",
      });
      return;
    }
    setIsLoadingEqualRelay(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utils/equal-relays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swimmerIds: swimmerIds,
          numRelays,
        }),
      });

      if (response.status === 429) {
        notifications.show({
          title: "Příliš mnoho požadavků",
          message: "Překročili jste limit 20 výpočtů za minutu. Zkuste to prosím za chvíli.",
          color: "orange",
          autoClose: 5000,
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to calculate equal fun relays");
      }

      const data = await response.json();
      setequalRelayResults(data);
    } catch (error) {
      console.error("Error calculating equal fun relays:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se vypočítat vyrovnané štafety. Zkuste to prosím znovu.",
        color: "red",
      });
    } finally {
      setIsLoadingEqualRelay(false);
    }
  };

  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      {/* Header */}
      <Box mb="xl">
        <Title order={2}>Sestavování štafet</Title>
      </Box>

      {/* Tabbed Interface */}
      <Paper withBorder shadow="sm" radius="lg" p={0} style={{ overflow: "hidden" }}>
        <Tabs value={activeTab} onChange={setActiveTab} variant="default">
          <Tabs.List grow>
            <Tabs.Tab value="fastest" leftSection={<IconTrophy size={16} />}>
              Nejrychlejší štafeta
            </Tabs.Tab>
            <Tabs.Tab value="equal" leftSection={<IconUsers size={16} />}>
              Vyrovnané štafety
            </Tabs.Tab>
          </Tabs.List>

          {/* Fastest Relay Tab */}
          <Tabs.Panel value="fastest" p="lg">
            <Stack gap="lg">
              <FastestRelayFilterBar
                groupedSwimmers={swimmers}
                selectedSwimmers={selectedSwimmers}
                onSwimmersChange={setSelectedSwimmers}
                relayType={relayType}
                onRelayTypeChange={setRelayType}
                onCalculate={handleCalculate}
                isLoading={isLoading}
                lastFetchedRelayHash={lastFetchedRelayHash}
              />

              <FastestRelayResults
                results={results}
                relayType={lastFetchedRelayHash ? lastFetchedRelayHash.split("|")[1] : relayType}
                isLoading={isLoading}
              />
            </Stack>
          </Tabs.Panel>

          {/* Equal Relays Tab */}
          <Tabs.Panel value="equal" p="lg">
            <Stack gap="lg">
              <EqualRelayFilterBar
                groupedSwimmers={swimmers}
                selectedSwimmers={selectedEqualRelaySwimmers}
                onSwimmersChange={setSelectedEqualRelaySwimmers}
                numRelays={numRelays}
                onNumRelaysChange={setNumRelays}
                onCalculate={handleCalculateEqualFun}
                isLoading={isLoadingEqualRelay}
              />

              <EqualRelayResults results={equalRelayResults} isLoading={isLoadingEqualRelay} />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Flex>
  );
}

export default Utils;
