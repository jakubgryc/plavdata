import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Container,
  Title,
  Table,
  Text,
  TextInput,
  Group,
  Pagination,
  Switch,
  Loader,
  Center,
  Badge,
  Stack,
  Button,
  Paper,
  Combobox,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconSearch,
  IconCheck,
  IconX,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import { authApi } from "../utils/auth";
import { API_BASE_URL } from "../../config";

interface Swimmer {
  id: number;
  name: string;
  surname: string;
  birth_year: number;
  group: string | null;
  sex: string;
  membership_start: string | null;
  membership_end: string | null;
  is_active: boolean;
}

interface PaginatedResponse {
  swimmers: Swimmer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const GROUP_OPTIONS = ["A", "B", "C", "D", "veteran", "runaway"];

function AdminSwimmers() {
  const navigate = useNavigate();
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [activeOnly, setActiveOnly] = useState(false);
  const [updatingSwimmers, setUpdatingSwimmers] = useState<Set<number>>(
    new Set(),
  );
  const [editedGroups, setEditedGroups] = useState<Map<number, string>>(
    new Map(),
  );

  const fetchSwimmers = async () => {
    if (!authApi.isAuthenticated()) {
      navigate("/admin");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "50",
        sort_by: "surname",
        sort_order: "asc",
      });

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (activeOnly) {
        params.append("active_only", "true");
      }

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/admin/swimmers?${params.toString()}`,
      );

      if (!response.ok) {
        if (response.status === 401) {
          authApi.removeToken();
          navigate("/admin");
          return;
        }
        throw new Error("Failed to fetch swimmers");
      }

      const data: PaginatedResponse = await response.json();
      setSwimmers(data.swimmers);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching swimmers:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst plavce",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwimmers();
  }, [page, debouncedSearch, activeOnly]);

  const handleGroupChange = async (swimmerId: number, newGroup: string) => {
    setUpdatingSwimmers((prev) => new Set(prev).add(swimmerId));

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/admin/swimmers/${swimmerId}/group`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ group: newGroup || null }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update group");
      }

      const updatedSwimmer: Swimmer = await response.json();

      setSwimmers((prev) =>
        prev.map((s) => (s.id === swimmerId ? updatedSwimmer : s)),
      );

      // Remove from edited groups after successful save
      setEditedGroups((prev) => {
        const next = new Map(prev);
        next.delete(swimmerId);
        return next;
      });

      notifications.show({
        title: "Úspěch",
        message: "Skupina byla aktualizována",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error("Error updating group:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se aktualizovat skupinu",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setUpdatingSwimmers((prev) => {
        const next = new Set(prev);
        next.delete(swimmerId);
        return next;
      });
    }
  };

  const handleGroupEdit = (swimmerId: number, newValue: string) => {
    setEditedGroups((prev) => new Map(prev).set(swimmerId, newValue));
  };

  const handleSaveGroup = (swimmerId: number) => {
    const newGroup = editedGroups.get(swimmerId);
    if (newGroup !== undefined) {
      handleGroupChange(swimmerId, newGroup);
    }
  };

  const hasUnsavedChanges = (
    swimmerId: number,
    currentGroup: string | null,
  ) => {
    const editedValue = editedGroups.get(swimmerId);
    return editedValue !== undefined && editedValue !== (currentGroup || "");
  };

  if (!authApi.isAuthenticated()) {
    return null;
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Title order={1}>Správa plavců</Title>

        <Paper p="md" withBorder>
          <Group justify="space-between">
            <TextInput
              placeholder="Hledat plavce..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1, maxWidth: 400 }}
            />
            <Switch
              label="Pouze aktivní"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.currentTarget.checked)}
            />
          </Group>
        </Paper>

        <Text size="sm" c="dimmed">
          Celkem: {total} plavců
        </Text>

        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : (
          <>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Příjmení</Table.Th>
                    <Table.Th>Jméno</Table.Th>
                    <Table.Th>Ročník</Table.Th>
                    <Table.Th>Skupina</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ width: 100 }}>Akce</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {swimmers.map((swimmer) => {
                    const currentValue =
                      editedGroups.get(swimmer.id) ?? swimmer.group ?? "";
                    const isEdited = hasUnsavedChanges(
                      swimmer.id,
                      swimmer.group,
                    );
                    const isUpdating = updatingSwimmers.has(swimmer.id);

                    return (
                      <Table.Tr key={swimmer.id}>
                        <Table.Td fw={500}>{swimmer.surname}</Table.Td>
                        <Table.Td>{swimmer.name}</Table.Td>
                        <Table.Td>{swimmer.birth_year}</Table.Td>
                        <Table.Td>
                          <CreatableGroupSelect
                            value={currentValue}
                            onChange={(value) =>
                              handleGroupEdit(swimmer.id, value)
                            }
                            disabled={isUpdating}
                          />
                        </Table.Td>
                        <Table.Td>
                          {swimmer.is_active ? (
                            <Badge color="green" variant="light" size="md">
                              Aktivní
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light" size="md">
                              Neaktivní
                              {swimmer.membership_end && (
                                <>
                                  {" "}
                                  (
                                  {new Date(
                                    swimmer.membership_end,
                                  ).toLocaleDateString("cs-CZ")}
                                  )
                                </>
                              )}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {isEdited && (
                            <Button
                              size="xs"
                              leftSection={<IconDeviceFloppy size={14} />}
                              onClick={() => handleSaveGroup(swimmer.id)}
                              loading={isUpdating}
                              color="blue"
                            >
                              Uložit
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            {totalPages > 1 && (
              <Center mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                />
              </Center>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}

interface CreatableGroupSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function CreatableGroupSelect({
  value,
  onChange,
  disabled,
}: CreatableGroupSelectProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const options = GROUP_OPTIONS.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item === "veteran" ? "Veterán" : item === "runaway" ? "Odešel" : item}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        setInputValue(val);
        combobox.closeDropdown();
      }}
      withinPortal={false}
    >
      <Combobox.Target>
        <TextInput
          value={inputValue}
          onChange={(event) => {
            const val = event.currentTarget.value;
            setInputValue(val);
            onChange(val);
            combobox.openDropdown();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
          }}
          placeholder="Zadejte skupinu"
          disabled={disabled}
          size="sm"
          styles={{ input: { minWidth: 150 } }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <Combobox.Option value="">Žádná skupina</Combobox.Option>
          {options}
          {inputValue &&
            !GROUP_OPTIONS.includes(inputValue) &&
            inputValue !== "" && (
              <Combobox.Option value={inputValue}>
                <Text size="sm" c="dimmed">
                  Vytvořit: "{inputValue}"
                </Text>
              </Combobox.Option>
            )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default AdminSwimmers;
