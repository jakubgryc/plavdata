import { useEffect, useState } from "react";
import {
  Title,
  Text,
  Flex,
  Select,
  MultiSelect,
  Button,
  Card,
  Stack,
  Group,
  Badge,
  Grid,
} from "@mantine/core";

import { API_BASE_URL } from "../../config";
import { parseTimeFromMillis } from "../utils/timeUtils";
import type { GroupedSwimmers } from "../schema/types";

interface RelayResult {
  totalTime: number;
  swimmers: {
    id: number;
    name: string;
    surname: string;
    stroke: string;
    time: number;
  }[];
}

function Utils() {
  const [groupedSwimmers, setGroupedSwimmers] = useState<GroupedSwimmers[]>([]);
  const [swimmers, setSwimmers] = useState<any[]>([]);
  const [selectedSwimmers, setSelectedSwimmers] = useState<number[]>([]);
  const [relayType, setRelayType] = useState<string>("freestyle");
  const [results, setResults] = useState<RelayResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSwimmers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/swimmers/grouped`);
        if (!response.ok) throw new Error("Failed to fetch swimmers");
        const data: GroupedSwimmers[] = await response.json();
        setGroupedSwimmers(data);
        const groupedOptions = data.map((groupData) => ({
          group: groupData.group,
          items: groupData.swimmers.map((swimmer) => ({
            value: swimmer.id.toString(),
            label: `${swimmer.surname} ${swimmer.name}`,
          })),
        }));
        setSwimmers(groupedOptions);
      } catch (error) {
        console.error("Error fetching swimmers:", error);
      }
    };
    fetchSwimmers();
  }, []);

  const handleCalculate = async () => {
    if (selectedSwimmers.length < 4) {
      alert("Vyberte alespoň 4 plavce");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utils/best-relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swimmerIds: selectedSwimmers,
          relayType,
        }),
      });
      if (!response.ok) throw new Error("Failed to calculate relay");
      const data = await response.json();
      setResults(data.relays);
    } catch (error) {
      console.error("Error calculating relay:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" w="100%" py="md" pb="xl">
      <Title order={2} mb="md">
        Nástroje
      </Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder shadow="sm" p="lg" mb="lg">
            <Title order={3} mb="md">
              Sestavení štafety
            </Title>
            <Stack>
              <Select
                label="Typ štafety"
                data={[
                  { value: "freestyle", label: "4x50 VZ (volný způsob)" },
                  { value: "medley", label: "4x50 O (polohový závod)" },
                ]}
                value={relayType}
                onChange={(value) => setRelayType(value || "freestyle")}
              />
              <MultiSelect
                label="Vyberte plavce"
                data={swimmers}
                value={selectedSwimmers.map(String)}
                onChange={(values) => setSelectedSwimmers(values.map(Number))}
                placeholder="Vyberte plavce pro štafetu"
                clearable
                searchable
              />
              <Button onClick={handleCalculate} loading={isLoading}>
                Vypočítat nejlepší štafetu
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          {results.length > 0 && (
            <Card withBorder shadow="sm" p="lg" mb="lg">
              <Title order={4} mb="md">
                Nejlepší {relayType === "freestyle" ? "VZ" : "O"} štafeta
              </Title>
              <Text size="lg" fw={700} mb="md" c="green">
                Štafeta 1 - Celkový čas:{" "}
                {parseTimeFromMillis(results[0].totalTime)}
              </Text>
              <Stack>
                {results[0].swimmers.map((swimmer, idx) => (
                  <Group key={swimmer.id} justify="space-between">
                    <Text>
                      {idx + 1}. {swimmer.surname} {swimmer.name}
                    </Text>
                    <Group>
                      <Badge variant="light">
                        {relayType === "medley" ? swimmer.stroke : "VZ"}
                      </Badge>
                      <Text>{parseTimeFromMillis(swimmer.time)}</Text>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}
        </Grid.Col>
      </Grid>

      {results.length > 1 && (
        <Stack mt="lg">
          {results.slice(1).map((result, index) => (
            <Card key={index} withBorder shadow="sm" p="lg">
              <Text size="lg" fw={700} mb="md">
                Štafeta {index + 2} - Celkový čas:{" "}
                {parseTimeFromMillis(result.totalTime)}
              </Text>
              <Stack>
                {result.swimmers.map((swimmer, idx) => (
                  <Group key={swimmer.id} justify="space-between">
                    <Text>
                      {idx + 1}. {swimmer.surname} {swimmer.name}
                    </Text>
                    <Group>
                      <Badge variant="light">
                        {relayType === "medley" ? swimmer.stroke : "VZ"}
                      </Badge>
                      <Text>{parseTimeFromMillis(swimmer.time)}</Text>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Flex>
  );
}

export default Utils;
