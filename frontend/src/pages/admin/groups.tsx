import { useState, useEffect } from "react";
import {
  Container,
  Title,
  SimpleGrid,
  Button,
  Group as MantineGroup,
  LoadingOverlay,
  Text,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { GroupCard } from "../../components/admin/GroupCard";
import { CreateGroupModal } from "../../components/admin/CreateGroupModal";
import { GroupDetailModal } from "../../components/admin/GroupDetailModal";
import { groupsApi } from "../../utils/groupsApi";
import type { Group, GroupDetail } from "../../schema/groups";

export function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpened, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [detailOpened, { open: openDetail, close: closeDetail }] =
    useDisclosure(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleGroupClick = async (group: Group) => {
    try {
      const detail = await groupsApi.getDetail(group.id);
      setSelectedGroup(detail);
      openDetail();
    } catch (error) {
      console.error("Failed to load group detail:", error);
    }
  };

  const handleCreate = async (data: {
    name: string;
    display_name_cs: string;
  }) => {
    await groupsApi.create(data);
    await loadGroups();
  };

  const handleUpdate = async (
    groupId: number,
    data: { name?: string; display_name_cs?: string },
  ) => {
    await groupsApi.update(groupId, data);
    await loadGroups();
    // Reload the detail
    const detail = await groupsApi.getDetail(groupId);
    setSelectedGroup(detail);
  };

  const handleDelete = async (groupId: number) => {
    await groupsApi.delete(groupId);
    await loadGroups();
    closeDetail();
  };

  return (
    <Container size="xl" py="xl">
      <Box pos="relative">
        <LoadingOverlay visible={loading} />

        <MantineGroup justify="space-between" mb="xl">
          <Title order={1}>Správa skupin</Title>
          <Button onClick={openCreate}>Přidat skupinu</Button>
        </MantineGroup>

        {groups.length === 0 && !loading ? (
          <Text c="dimmed" ta="center" mt="xl">
            Zatím nejsou žádné skupiny. Vytvořte první skupinu pomocí tlačítka
            výše.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => handleGroupClick(group)}
              />
            ))}
          </SimpleGrid>
        )}

        <CreateGroupModal
          opened={createOpened}
          onClose={closeCreate}
          onCreate={handleCreate}
        />

        <GroupDetailModal
          group={selectedGroup}
          opened={detailOpened}
          onClose={closeDetail}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Box>
    </Container>
  );
}
