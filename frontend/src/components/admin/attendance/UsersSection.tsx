import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconKey, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import type { AdminUser, ResetPasswordResponse } from "../../../schema/attendanceAdmin";
import { apiDelete, apiGet, apiPost } from "../../../utils/apiHelpers";

function UsersSection() {
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [coaches, setCoaches] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [pending, all] = await Promise.all([
        apiGet<AdminUser[]>(`${API_BASE_URL}/admin/users?pending=true`),
        apiGet<AdminUser[]>(`${API_BASE_URL}/admin/users`),
      ]);
      setPendingUsers(pending);
      setCoaches(all.filter((u) => u.role === "coach"));
    } catch {
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se načíst uživatele",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId: number) => {
    try {
      await apiPost(`${API_BASE_URL}/admin/users/${userId}/approve`, {});
      notifications.show({
        title: "Schváleno",
        message: "Uživatel byl schválen.",
        color: "green",
      });
      fetchUsers();
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se schválit uživatele",
        color: "red",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`${API_BASE_URL}/admin/users/${deleteTarget.id}`);
      notifications.show({
        title: "Smazáno",
        message: `Uživatel „${deleteTarget.username}" byl smazán.`,
        color: "green",
      });
      setDeleteTarget(null);
      fetchUsers();
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se smazat uživatele",
        color: "red",
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    setNewPassword(null);
    try {
      const data = await apiPost<ResetPasswordResponse>(
        `${API_BASE_URL}/admin/users/${resetTarget.id}/reset-password`,
        {},
      );
      setNewPassword(data.password);
      fetchUsers();
    } catch (error) {
      notifications.show({
        title: "Chyba",
        message: error instanceof Error ? error.message : "Nepodařilo se resetovat heslo",
        color: "red",
      });
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  };

  return (
    <Stack gap="md">
      <Title order={4} c="dimmed" tt="uppercase" lts={1}>
        5. Uživatelé
      </Title>

      {loading ? (
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Loader size="sm" />
        </Card>
      ) : (
        <>
          {/* Pending users */}
          <Card withBorder shadow="sm" radius="md" p="lg">
            <Stack gap="md">
              <Title order={4}>Čekající na schválení</Title>
              {pendingUsers.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Žádní uživatelé nečekají na schválení.
                </Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Uživatelské jméno</Table.Th>
                      <Table.Th>E-mail</Table.Th>
                      <Table.Th>Registrován</Table.Th>
                      <Table.Th w={160}>Akce</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pendingUsers.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td fw={500}>{user.username}</Table.Td>
                        <Table.Td>{user.email}</Table.Td>
                        <Table.Td>{dayjs(user.created_at).format("DD.MM.YYYY HH:mm")}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              color="green"
                              variant="light"
                              onClick={() => handleApprove(user.id)}
                            >
                              Schválit
                            </Button>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => setDeleteTarget(user)}
                              title="Smazat"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Card>

          {/* Coaches table */}
          <Card withBorder shadow="sm" radius="md" p="lg">
            <Stack gap="md">
              <Title order={4}>Trenéři</Title>
              {coaches.length === 0 ? (
                <Text size="sm" c="dimmed">
                  V systému nejsou žádní trenéři.
                </Text>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Uživatelské jméno</Table.Th>
                      <Table.Th>E-mail</Table.Th>
                      <Table.Th>Stav</Table.Th>
                      <Table.Th w={200}>Akce</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {coaches.map((coach) => (
                      <Table.Tr key={coach.id}>
                        <Table.Td fw={500}>{coach.username}</Table.Td>
                        <Table.Td>{coach.email}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color={coach.is_active ? "green" : "gray"}
                          >
                            {coach.is_active ? "aktivní" : "neaktivní"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              variant="light"
                              color="orange"
                              leftSection={<IconKey size={14} />}
                              onClick={() => {
                                setResetTarget(coach);
                                setNewPassword(null);
                              }}
                            >
                              Resetovat heslo
                            </Button>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => setDeleteTarget(coach)}
                              title="Smazat"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Card>
        </>
      )}

      {/* Delete Confirm Modal */}
      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Smazat uživatele"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Opravdu smazat uživatele <strong>{deleteTarget?.username}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Zrušit
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Smazat
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        opened={resetTarget !== null}
        onClose={() => {
          setResetTarget(null);
          setNewPassword(null);
        }}
        title={`Resetovat heslo — ${resetTarget?.username ?? ""}`}
        centered
        size="sm"
      >
        <Stack>
          {newPassword ? (
            <>
              <Alert color="green" variant="light">
                <Text size="sm" fw={500} mb={4}>
                  Nové heslo:
                </Text>
                <Code block>{newPassword}</Code>
                <Text size="xs" c="dimmed" mt={4}>
                  Zobrazí se pouze jednou, pošli ho trenérovi.
                </Text>
              </Alert>
              <Button
                fullWidth
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  notifications.show({
                    title: "Zkopírováno",
                    message: "Heslo bylo zkopírováno do schránky.",
                    color: "green",
                  });
                }}
              >
                Kopírovat heslo
              </Button>
            </>
          ) : (
            <>
              <Text>Opravdu resetovat heslo pro tohoto uživatele?</Text>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setResetTarget(null)} disabled={resetting}>
                  Zrušit
                </Button>
                <Button color="orange" onClick={handleResetPassword} loading={resetting}>
                  Resetovat
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}

export default UsersSection;
