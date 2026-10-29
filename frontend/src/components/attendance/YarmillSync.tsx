import {
  Badge,
  Button,
  Chip,
  ChipGroup,
  Divider,
  Flex,
  Loader,
  Paper,
  PasswordInput,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloudUpload, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";
import type { WeekDayOut } from "../../schema/attendance";
import { toApiDate } from "../../utils/attendance";
import { authenticatedFetch } from "../../utils/authenticatedFetch";

const TOKEN_KEY = "yarmill_token";

function readStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return ""; 
  }
}

function storeToken(value: string): void {
  try {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
  }
}

interface YarmillSyncProps {
  groupId: number;
  weekStart: Date;
  days: WeekDayOut[];
}

interface SyncResponse {
  details?: string;
  synced?: number;
  synced_days?: number;
  skipped?: number;
  skipped_swimmers?: number;
  detail?: unknown;
}

export function YarmillSync({ groupId, weekStart, days }: YarmillSyncProps) {
  const [token, setToken] = useState<string>(readStoredToken);
  const [tokenInput, setTokenInput] = useState("");
  const [syncingPlan, setSyncingPlan] = useState(false);
  const [syncingDay, setSyncingDay] = useState<string | null>(null);
  const [copyingReality, setCopyingReality] = useState(false);

  const filledDays = days.filter((d) => d.filled);

  // Plan sync day selection — all filled days by default
  const filledDatesKey = filledDays.map((d) => d.date).join(",");
  const [planDays, setPlanDays] = useState<string[]>([]);
  useEffect(() => {
    setPlanDays(filledDatesKey ? filledDatesKey.split(",") : []);
  }, [filledDatesKey]);

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    storeToken(trimmed);
    setToken(trimmed);
    setTokenInput("");
    notifications.show({ color: "green", message: "Yarmill token uložen." });
  };

  const handleClearToken = () => {
    storeToken("");
    setToken("");
    setTokenInput("");
  };

  /** Shared POST helper; clears the token when Yarmill reports it expired. */
  const postSync = async (path: string, body: Record<string, unknown>) => {
    const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, yarmill_token: token }),
    });
    const parsed = (await response.json().catch(() => null)) as SyncResponse | null;

    if (response.ok) {
      notifications.show({
        color: "green",
        title: "Yarmill",
        message: parsed?.details ?? "Synchronizace proběhla.",
      });
      return;
    }

    // FastAPI validation errors return detail as an array — only strings are shown
    const detail =
      typeof parsed?.detail === "string" ? parsed.detail : "Synchronizace selhala.";
    if (detail.includes("vypršel")) {
      handleClearToken();
    }
    notifications.show({ color: "red", title: "Yarmill", message: detail });
  };

  const handleSyncPlan = async () => {
    if (!token || syncingPlan) return;
    setSyncingPlan(true);
    try {
      await postSync("/yarmill/sync-plan", {
        group_id: groupId,
        week_start: toApiDate(weekStart),
        days: planDays,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Yarmill",
        message: "Spojení se serverem se nezdařilo.",
      });
    } finally {
      setSyncingPlan(false);
    }
  };

  const handleCopyToReality = async () => {
    if (!token || copyingReality) return;
    setCopyingReality(true);
    try {
      await postSync("/yarmill/copy-attendance-to-reality", {
        group_id: groupId,
        week_start: toApiDate(weekStart),
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Yarmill",
        message: "Spojení se serverem se nezdařilo.",
      });
    } finally {
      setCopyingReality(false);
    }
  };

  const handleSyncAttendance = async (date: string) => {
    if (!token || syncingDay) return;
    setSyncingDay(date);
    try {
      await postSync("/yarmill/sync-attendance", { group_id: groupId, date });
    } catch {
      notifications.show({
        color: "red",
        title: "Yarmill",
        message: "Spojení se serverem se nezdařilo.",
      });
    } finally {
      setSyncingDay(null);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" mt="md">
      <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
        <Text fw={500}>Yarmill synchronizace</Text>
        {token ? (
          <Badge color="green" size="sm" variant="light">
            Token uložen
          </Badge>
        ) : (
          <Badge color="yellow" size="sm" variant="light">
            Token není uložen
          </Badge>
        )}
      </Flex>

      <Flex gap="xs" mb="md" align="center">
        <PasswordInput
          flex={1}
          size="xs"
          placeholder="Bearer token z Yarmillu"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSaveToken();
          }}
        />
        <Button size="xs" onClick={handleSaveToken} disabled={!tokenInput.trim()}>
          Uložit
        </Button>
        {token && (
          <Tooltip label="Smazat uložený token">
            <Button size="xs" variant="subtle" color="red" onClick={handleClearToken}>
              <IconTrash size={14} />
            </Button>
          </Tooltip>
        )}
      </Flex>

      {filledDays.length > 0 && (
        <>
          <Text size="xs" c="dimmed" mb={4}>
            Dny pro synchronizaci plánu:
          </Text>
          <ChipGroup multiple value={planDays} onChange={setPlanDays}>
            <Flex gap="xs" wrap="wrap" mb="sm">
              {filledDays.map((day) => (
                <Chip key={day.date} value={day.date} size="xs">
                  {dayjs(day.date).locale("cs").format("ddd D.M.")}
                </Chip>
              ))}
            </Flex>
          </ChipGroup>
        </>
      )}

      <Button
        fullWidth
        size="sm"
        leftSection={syncingPlan ? <Loader size="xs" /> : <IconCloudUpload size={16} />}
        disabled={
          !token || syncingPlan || syncingDay !== null || copyingReality || planDays.length === 0
        }
        onClick={handleSyncPlan}
      >
        Synchronizovat plán do Yarmillu
      </Button>

      {filledDays.length > 0 && (
        <>
          <Divider my="sm" />
          <Text size="xs" c="dimmed" mb={4}>
            Docházka po dnech (nejprve ulož týden v plavdata):
          </Text>
          <Flex gap="xs" wrap="wrap">
            {filledDays.map((day) => (
              <Button
                key={day.date}
                size="xs"
                variant="light"
                loading={syncingDay === day.date}
                disabled={
                  !token ||
                  syncingPlan ||
                  copyingReality ||
                  (syncingDay !== null && syncingDay !== day.date)
                }
                onClick={() => handleSyncAttendance(day.date)}
              >
                {dayjs(day.date).format("D.M.")} → Yarmill
              </Button>
            ))}
          </Flex>
        </>
      )}

      <Divider my="sm" />
      <Button
        fullWidth
        size="xs"
        variant="light"
        color="teal"
        loading={copyingReality}
        disabled={!token || syncingPlan || syncingDay !== null}
        onClick={handleCopyToReality}
      >
        Zkopírovat docházku týdne do reality
      </Button>
    </Paper>
  );
}
