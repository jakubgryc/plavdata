import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import type {
  AttendanceGroup,
  GroupCoach,
  GroupMember,
  ScheduleSlotForm,
  Season,
} from "../../../schema/attendanceAdmin";
import type { Swimmer } from "../../../schema/swimmers";
import { apiGet, apiPut } from "../../../utils/apiHelpers";
import { swimmersApi } from "../../../utils/swimmersApi";

const WEEKDAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

interface ScheduleRow {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
}

function AttendanceSetupSection() {
  // Top-level selectors
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [groups, setGroups] = useState<AttendanceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState<string | null>("members");

  // --- Members tab state ---
  const [allSwimmers, setAllSwimmers] = useState<Swimmer[]>([]);
  const [currentMembers, setCurrentMembers] = useState<GroupMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [initialMemberIds, setInitialMemberIds] = useState<Set<number>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);

  // --- Schedule tab state ---
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(
    Array.from({ length: 7 }, (_, i) => ({
      weekday: i + 1,
      enabled: false,
      start_time: "16:00",
      end_time: "17:30",
    })),
  );
  const [initialSchedule, setInitialSchedule] = useState<ScheduleSlotForm[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // --- Coaches tab state ---
  const [allCoaches, setAllCoaches] = useState<{ id: number; username: string; is_active: boolean }[]>([]);
  const [currentCoachIds, setCurrentCoachIds] = useState<Set<number>>(new Set());
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<number>>(new Set());
  const [initialCoachIds, setInitialCoachIds] = useState<Set<number>>(new Set());
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [savingCoaches, setSavingCoaches] = useState(false);

  // Load seasons on mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        const [seasonsData] = await Promise.all([
          apiGet<Season[]>(`${API_BASE_URL}/admin/seasons`),
        ]);
        setSeasons(seasonsData);
        if (seasonsData.length > 0) {
          setSelectedSeasonId(String(seasonsData[0].id));
        }
      } catch {
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst sezóny",
          color: "red",
        });
      } finally {
        setLoadingMeta(false);
      }
    };
    loadMeta();
  }, []);

  // Load groups when season changes
  useEffect(() => {
    if (!selectedSeasonId) return;
    const loadGroups = async () => {
      try {
        const data = await apiGet<AttendanceGroup[]>(
          `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups`,
        );
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(String(data[0].id));
        } else {
          setSelectedGroupId(null);
        }
      } catch {
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst skupiny",
          color: "red",
        });
      }
    };
    loadGroups();
  }, [selectedSeasonId]);

  // Load all swimmers once (for the checkbox list) — paginate since backend caps page_size at 200
  useEffect(() => {
    const loadAllSwimmers = async () => {
      try {
        const all: Swimmer[] = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
          const data = await swimmersApi.getAll({ page, pageSize: 200 });
          all.push(...data.swimmers);
          totalPages = data.total_pages;
          page++;
        }
        setAllSwimmers(all);
      } catch {
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst plavce",
          color: "red",
        });
      }
    };
    loadAllSwimmers();
  }, []);

  // Load all coaches (users with role "coach") once
  useEffect(() => {
    const loadAllCoaches = async () => {
      try {
        const data = await apiGet<
          { id: number; username: string; email: string; role: string; is_active: boolean; created_at: string }[]
        >(`${API_BASE_URL}/admin/users`);
        setAllCoaches(
          data
            .filter((u) => u.role === "coach")
            .map((u) => ({ id: u.id, username: u.username, is_active: u.is_active })),
        );
      } catch {
        notifications.show({
          title: "Chyba",
          message: "Nepodařilo se načíst trenéry",
          color: "red",
        });
      }
    };
    loadAllCoaches();
  }, []);

  // Fetch tab data when (season, group) changes
  const fetchMembers = useCallback(async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setLoadingMembers(true);
    try {
      const data = await apiGet<GroupMember[]>(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/members`,
      );
      setCurrentMembers(data);
      const ids = new Set(data.map((m) => m.id));
      setSelectedMemberIds(ids);
      setInitialMemberIds(ids);
    } catch {
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst členy",
        color: "red",
      });
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedSeasonId, selectedGroupId]);

  const fetchSchedule = useCallback(async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setLoadingSchedule(true);
    try {
      const data = await apiGet<ScheduleSlotForm[]>(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/schedule`,
      );
      setInitialSchedule(data);
      setScheduleRows(
        Array.from({ length: 7 }, (_, i) => {
          const slot = data.find((s) => s.weekday === i + 1);
          return {
            weekday: i + 1,
            enabled: !!slot,
            start_time: slot?.start_time ?? "16:00",
            end_time: slot?.end_time ?? "17:30",
          };
        }),
      );
    } catch {
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst rozvrh",
        color: "red",
      });
    } finally {
      setLoadingSchedule(false);
    }
  }, [selectedSeasonId, selectedGroupId]);

  const fetchCoaches = useCallback(async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setLoadingCoaches(true);
    try {
      const data = await apiGet<GroupCoach[]>(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/coaches`,
      );
      const ids = new Set(data.map((c) => c.id));
      setCurrentCoachIds(ids);
      setSelectedCoachIds(ids);
      setInitialCoachIds(ids);
    } catch {
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst trenéry",
        color: "red",
      });
    } finally {
      setLoadingCoaches(false);
    }
  }, [selectedSeasonId, selectedGroupId]);

  useEffect(() => {
    if (!selectedSeasonId || !selectedGroupId) return;
    if (activeTab === "members") fetchMembers();
    if (activeTab === "schedule") fetchSchedule();
    if (activeTab === "coaches") fetchCoaches();
  }, [selectedSeasonId, selectedGroupId, activeTab, fetchMembers, fetchSchedule, fetchCoaches]);

  // --- Members save ---
  const membersDirty = useMemo(() => {
    if (selectedMemberIds.size !== initialMemberIds.size) return true;
    for (const id of selectedMemberIds) {
      if (!initialMemberIds.has(id)) return true;
    }
    return false;
  }, [selectedMemberIds, initialMemberIds]);

  const handleSaveMembers = async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setSavingMembers(true);
    try {
      await apiPut(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/members`,
        { swimmer_ids: Array.from(selectedMemberIds) },
      );
      setInitialMemberIds(new Set(selectedMemberIds));
      notifications.show({
        title: "Uloženo",
        message: "Členové byli uloženi.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se uložit členy",
        color: "red",
      });
    } finally {
      setSavingMembers(false);
    }
  };

  // --- Schedule save ---
  const scheduleDirty = useMemo(() => {
    const enabledSlots = scheduleRows.filter((r) => r.enabled);
    if (enabledSlots.length !== initialSchedule.length) return true;
    for (const slot of enabledSlots) {
      const match = initialSchedule.find((s) => s.weekday === slot.weekday);
      if (!match) return true;
      if (match.start_time !== slot.start_time || match.end_time !== slot.end_time) return true;
    }
    return false;
  }, [scheduleRows, initialSchedule]);

  const handleSaveSchedule = async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setSavingSchedule(true);
    try {
      const slots = scheduleRows
        .filter((r) => r.enabled)
        .map((r) => ({
          weekday: r.weekday,
          start_time: r.start_time,
          end_time: r.end_time,
        }));
      const result = await apiPut<ScheduleSlotForm[]>(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/schedule`,
        { slots },
      );
      setInitialSchedule(result);
      notifications.show({
        title: "Uloženo",
        message: "Rozvrh byl uložen.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se uložit rozvrh",
        color: "red",
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- Coaches save ---
  const coachesDirty = useMemo(() => {
    if (selectedCoachIds.size !== initialCoachIds.size) return true;
    for (const id of selectedCoachIds) {
      if (!initialCoachIds.has(id)) return true;
    }
    return false;
  }, [selectedCoachIds, initialCoachIds]);

  const handleSaveCoaches = async () => {
    if (!selectedSeasonId || !selectedGroupId) return;
    setSavingCoaches(true);
    try {
      await apiPut(
        `${API_BASE_URL}/admin/seasons/${selectedSeasonId}/groups/${selectedGroupId}/coaches`,
        { user_ids: Array.from(selectedCoachIds) },
      );
      setInitialCoachIds(new Set(selectedCoachIds));
      notifications.show({
        title: "Uloženo",
        message: "Trenéři byli uloženi.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se uložit trenéry",
        color: "red",
      });
    } finally {
      setSavingCoaches(false);
    }
  };

  // Toggle helpers
  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCoach = (id: number) => {
    setSelectedCoachIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered swimmers for the members tab
  const filteredSwimmers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return allSwimmers;
    return allSwimmers.filter(
      (s) =>
        s.surname.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q),
    );
  }, [allSwimmers, memberSearch]);

  const seasonOptions = seasons.map((s) => ({ value: String(s.id), label: s.name }));
  const groupOptions = groups.map((g) => ({ value: String(g.id), label: g.display_name_cs }));

  if (loadingMeta) {
    return (
      <Stack gap="md">
        <Title order={4} c="dimmed" tt="uppercase" lts={1}>
          4. Nastavení docházky
        </Title>
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Loader size="sm" />
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={4} c="dimmed" tt="uppercase" lts={1}>
        4. Nastavení docházky
      </Title>

      <Card withBorder shadow="sm" radius="md" p="lg">
        <Stack gap="md">
          <Group align="flex-end" wrap="wrap" gap="md">
            <Select
              label="Sezóna"
              placeholder="Vyberte sezónu"
              data={seasonOptions}
              value={selectedSeasonId}
              onChange={setSelectedSeasonId}
              style={{ minWidth: 200 }}
            />
            <Select
              label="Skupina"
              placeholder="Vyberte skupinu"
              data={groupOptions}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              disabled={groups.length === 0}
              style={{ minWidth: 200 }}
            />
          </Group>

          {!selectedGroupId ? (
            <Text size="sm" c="dimmed">
              Vyberte sezónu a skupinu pro zobrazení nastavení.
            </Text>
          ) : (
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="members">Členové</Tabs.Tab>
                <Tabs.Tab value="schedule">Rozvrh</Tabs.Tab>
                <Tabs.Tab value="coaches">Trenéři</Tabs.Tab>
              </Tabs.List>

              {/* --- Members tab --- */}
              <Tabs.Panel value="members" pt="md">
                {loadingMembers ? (
                  <Loader size="sm" />
                ) : (
                  <Stack gap="md">
                    <TextInput
                      placeholder="Hledat podle jména…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.currentTarget.value)}
                    />
                    <Stack
                      gap="xs"
                      style={{ maxHeight: 400, overflowY: "auto" }}
                    >
                      {filteredSwimmers.map((swimmer) => (
                        <Checkbox
                          key={swimmer.id}
                          label={`${swimmer.surname}, ${swimmer.name} (${swimmer.birth_year})`}
                          checked={selectedMemberIds.has(swimmer.id)}
                          onChange={() => toggleMember(swimmer.id)}
                        />
                      ))}
                      {filteredSwimmers.length === 0 && (
                        <Text size="sm" c="dimmed">
                          Žádní plavci odpovídající hledání.
                        </Text>
                      )}
                    </Stack>
                    <Group justify="flex-end">
                      <Button
                        onClick={handleSaveMembers}
                        loading={savingMembers}
                        disabled={!membersDirty}
                      >
                        Uložit členy
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Tabs.Panel>

              {/* --- Schedule tab --- */}
              <Tabs.Panel value="schedule" pt="md">
                {loadingSchedule ? (
                  <Loader size="sm" />
                ) : (
                  <Stack gap="md">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={60}>Den</Table.Th>
                          <Table.Th w={80}>Aktivní</Table.Th>
                          <Table.Th>Od</Table.Th>
                          <Table.Th>Do</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {scheduleRows.map((row) => (
                          <Table.Tr key={row.weekday}>
                            <Table.Td fw={500}>{WEEKDAY_LABELS[row.weekday - 1]}</Table.Td>
                            <Table.Td>
                              <Switch
                                checked={row.enabled}
                                onChange={(e) => {
                                  const checked = e.currentTarget.checked;
                                  const wd = row.weekday;
                                  setScheduleRows((prev) =>
                                    prev.map((r) =>
                                      r.weekday === wd
                                        ? { ...r, enabled: checked }
                                        : r,
                                    ),
                                  );
                                }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <input
                                type="time"
                                value={row.start_time}
                                disabled={!row.enabled}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScheduleRows((prev) =>
                                    prev.map((r) =>
                                      r.weekday === row.weekday
                                        ? { ...r, start_time: val }
                                        : r,
                                    ),
                                  );
                                }}
                                style={{
                                  padding: "4px 8px",
                                  border: "1px solid var(--mantine-color-default-border)",
                                  borderRadius: "var(--mantine-radius-sm)",
                                  opacity: row.enabled ? 1 : 0.5,
                                }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <input
                                type="time"
                                value={row.end_time}
                                disabled={!row.enabled}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScheduleRows((prev) =>
                                    prev.map((r) =>
                                      r.weekday === row.weekday
                                        ? { ...r, end_time: val }
                                        : r,
                                    ),
                                  );
                                }}
                                style={{
                                  padding: "4px 8px",
                                  border: "1px solid var(--mantine-color-default-border)",
                                  borderRadius: "var(--mantine-radius-sm)",
                                  opacity: row.enabled ? 1 : 0.5,
                                }}
                              />
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                    <Group justify="flex-end">
                      <Button
                        onClick={handleSaveSchedule}
                        loading={savingSchedule}
                        disabled={!scheduleDirty}
                      >
                        Uložit rozvrh
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Tabs.Panel>

              {/* --- Coaches tab --- */}
              <Tabs.Panel value="coaches" pt="md">
                {loadingCoaches ? (
                  <Loader size="sm" />
                ) : (
                  <Stack gap="md">
                    {allCoaches.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        V systému nejsou žádní trenéři.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {allCoaches.map((coach) => (
                          <Checkbox
                            key={coach.id}
                            label={
                              <Group gap="xs">
                                <span>{coach.username}</span>
                                {!coach.is_active && (
                                  <Badge size="xs" color="yellow" variant="light">
                                    čeká na schválení
                                  </Badge>
                                )}
                              </Group>
                            }
                            checked={selectedCoachIds.has(coach.id)}
                            onChange={() => toggleCoach(coach.id)}
                          />
                        ))}
                      </Stack>
                    )}
                    <Group justify="flex-end">
                      <Button
                        onClick={handleSaveCoaches}
                        loading={savingCoaches}
                        disabled={!coachesDirty}
                      >
                        Uložit trenéry
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Tabs.Panel>
            </Tabs>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

export default AttendanceSetupSection;
