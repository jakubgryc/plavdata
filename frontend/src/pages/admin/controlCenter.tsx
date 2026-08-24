import {
  ActionIcon,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import {
  IconCalculator,
  IconCalendarEvent,
  IconCheck,
  IconDatabaseImport,
  IconFlame,
  IconLink,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { Navigate } from "react-router";
import { API_BASE_URL } from "../../../config";
import TaskCard from "../../components/admin/TaskCard";
import { useAuth } from "../../hooks/useAuth";
import { authApi } from "../../utils/auth";

function AdminControlCenterPage() {
  const { isAuthenticated } = useAuth();

  // States for Results Sync
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);
  const [resultsStatus, setResultsStatus] = useState<"idle" | "syncing" | "success" | "error">(
    "idle",
  );
  const [syncedCount, setSyncedCount] = useState(0);
  const [resultsMessage, setResultsMessage] = useState("");

  // States for Competitions Sync
  const [compYear, setCompYear] = useState<number | "">(new Date().getFullYear());
  const [compStatus, setCompStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [compSyncedCount, setCompSyncedCount] = useState(0);
  const [compMessage, setCompMessage] = useState("");

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSyncResults = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      setResultsStatus("error");
      setResultsMessage("Vyberte prosím počáteční a koncové datum.");
      return;
    }

    setResultsStatus("syncing");
    setSyncedCount(0);
    setResultsMessage("Navazuji spojení se serverem...");

    try {
      const afterDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const beforeDate = dayjs(dateRange[1]).format("YYYY-MM-DD");

      const response = await fetch(`${API_BASE_URL}/admin/sync/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authApi.getToken()}`,
        },
        body: JSON.stringify({ after_date: afterDate, before_date: beforeDate }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.substring(6));
                setResultsStatus(parsed.status);
                setResultsMessage(parsed.message);
                setSyncedCount(parsed.synced_count);
              } catch (e) {
                console.error("Failed to parse stream data chunk", e);
              }
            }
          }
        }
      }
    } catch (error) {
      setResultsStatus("error");
      setResultsMessage(error instanceof Error ? error.message : "Chyba při synchronizaci");
    }
  };

  const handleSyncCompetitions = async () => {
    setCompStatus("syncing");
    setCompSyncedCount(0);
    setCompMessage("Navazuji spojení se serverem...");

    try {
      const payload = { year: compYear === "" ? null : Number(compYear) };

      const response = await fetch(`${API_BASE_URL}/admin/sync/competitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authApi.getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.substring(6));
                setCompStatus(parsed.status);
                setCompMessage(parsed.message);
                setCompSyncedCount(parsed.synced_count);
              } catch (e) {
                console.error("Failed to parse stream chunk", e);
              }
            }
          }
        }
      }
    } catch (error) {
      setCompStatus("error");
      setCompMessage(error instanceof Error ? error.message : "Chyba při synchronizaci závodů");
    }
  };

  // --- 2. OFFLINE DB TASK HANDLERS ---
  const executeOfflineTask = async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}/admin${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authApi.getToken()}` },
    });
    if (!response.ok) throw new Error(`Chyba serveru: ${response.statusText}`);
    const data = await response.json();
    return data.message;
  };

  const executeLinkResults = () => executeOfflineTask("/sync/link-results");
  const executeCalcImprovements = () => executeOfflineTask("/sync/calculate-improvements");
  const executeUpdatePersonalBests = () => executeOfflineTask("/sync/update-pbs");
  const executeUpdateClubRecords = () => executeOfflineTask("/sync/update-club-records");

  return (
    <Stack gap="xl" w="100%" pb="xl">
      <Title order={2}>Ovládací centrum</Title>

      <Stack gap="md">
        <Title order={4} c="dimmed" tt="uppercase" lts={1}>
          1. Externí synchronizace z ČSPS
        </Title>

        {/* Sync Results */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Group gap="sm" align="center">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconDatabaseImport size={20} />
              </ThemeIcon>
              <Title order={4}>Synchronizace výsledků plavců</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Stáhne a spáruje nové výsledky z ČSPS pro vybrané časové období.
            </Text>
            <Group align="flex-end" wrap="wrap">
              <Box style={{ flex: 1, minWidth: "250px" }}>
                <DatePickerInput
                  type="range"
                  label="Časové období"
                  placeholder="Vyberte rozmezí dat (od - do)"
                  value={dateRange}
                  onChange={setDateRange}
                  clearable
                  disabled={resultsStatus === "syncing"}
                />
              </Box>
              <Button
                onClick={handleSyncResults}
                loading={resultsStatus === "syncing"}
                disabled={!dateRange[0] || !dateRange[1]}
                color="blue"
              >
                Spustit stahování
              </Button>
            </Group>

            {resultsStatus !== "idle" && (
              <Paper p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text
                      size="sm"
                      fw={500}
                      c={resultsStatus === "error" ? "red" : "var(--mantine-color-text)"}
                    >
                      {resultsMessage}
                    </Text>
                    {resultsStatus === "success" && (
                      <ActionIcon variant="transparent" color="green">
                        <IconCheck size={24} />
                      </ActionIcon>
                    )}
                    {resultsStatus === "error" && (
                      <ActionIcon variant="transparent" color="red">
                        <IconX size={24} />
                      </ActionIcon>
                    )}
                  </Group>
                  {(resultsStatus === "syncing" || resultsStatus === "success") && (
                    <Group justify="space-between" mt="sm">
                      <Text size="sm" fw={600} c="dimmed">
                        Nové výsledky:
                      </Text>
                      <Text size="lg" fw={700} c="blue">
                        {syncedCount}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Card>

        {/* Sync Competitions Card */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Group gap="sm" align="center">
              <ThemeIcon size="lg" variant="light" color="indigo">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <Title order={4}>Synchronizace závodů</Title>
            </Group>

            <Text size="sm" c="dimmed">
              Stáhne závody z ČSPS.
            </Text>

            <Group align="flex-end" wrap="wrap">
              <Box style={{ flex: 1, minWidth: "250px" }}>
                <NumberInput
                  label="Rok (volitelné)"
                  placeholder="Všechny roky (od 2002)"
                  allowDecimal={false}
                  allowNegative={false}
                  value={compYear}
                  onChange={(val) => setCompYear(val === "" ? "" : Number(val))}
                  disabled={compStatus === "syncing"}
                  min={2002}
                  max={new Date().getFullYear()}
                />
              </Box>
              <Button
                onClick={handleSyncCompetitions}
                loading={compStatus === "syncing"}
                color="indigo"
              >
                Synchronizovat závody
              </Button>
            </Group>

            {compStatus !== "idle" && (
              <Paper p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text
                      size="sm"
                      fw={500}
                      c={compStatus === "error" ? "red" : "var(--mantine-color-text)"}
                    >
                      {compMessage}
                    </Text>
                    {compStatus === "success" && (
                      <ActionIcon variant="transparent" color="green">
                        <IconCheck size={24} />
                      </ActionIcon>
                    )}
                    {compStatus === "error" && (
                      <ActionIcon variant="transparent" color="red">
                        <IconX size={24} />
                      </ActionIcon>
                    )}
                  </Group>

                  {(compStatus === "syncing" || compStatus === "success") && (
                    <Group justify="space-between" mt="sm">
                      <Text size="sm" fw={600} c="dimmed">
                        Nové závody:
                      </Text>
                      <Text size="lg" fw={700} c="indigo">
                        {compSyncedCount}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Card>
      </Stack>

      <Divider />

      {/* SECTION 2: OFFLINE DATABASE OPERATIONS */}
      <Stack gap="md">
        <Title order={4} c="dimmed" tt="uppercase" lts={1}>
          2. Interní operace a přepočty
        </Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TaskCard
              title="Spárovat výsledky se závody"
              description="Automaticky přiřadí volné výsledky ke správným závodům podle data a místa konání."
              buttonText="Spárovat"
              icon={<IconLink size={20} />}
              color="teal"
              onExecute={executeLinkResults}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TaskCard
              title="Přepočítat zlepšení"
              description="Analyzuje chronologicky všechny starty a označí ty, které představovaly zlepšení (OR)."
              buttonText="Přepočítat"
              icon={<IconCalculator size={20} />}
              color="grape"
              onExecute={executeCalcImprovements}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TaskCard
              title="Aktualizovat Osobní rekordy"
              description="Najde absolutně osobní rekordy a přiřadí je do tabulek osobních rekordů."
              buttonText="Aktualizovat OR"
              icon={<IconFlame size={20} />}
              color="orange"
              onExecute={executeUpdatePersonalBests}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TaskCard
              title="Aktualizovat Klubové rekordy"
              description="Projde osobní rekordy a přiřadí je do věkových kategorií klubových tabulek."
              buttonText="Aktualizovat KR"
              icon={<IconTrophy size={20} />}
              color="yellow"
              onExecute={executeUpdateClubRecords}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Stack>
  );
}

export default AdminControlCenterPage;
