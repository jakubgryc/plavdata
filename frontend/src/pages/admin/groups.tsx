import {
  Box,
  Button,
  Flex,
  LoadingOverlay,
  Group as MantineGroup,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsSort } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CreateGroupModal } from "../../components/admin/CreateGroupModal";
import { GroupCard } from "../../components/admin/GroupCard";
import { GroupDetailModal } from "../../components/admin/GroupDetailModal";
import { ReorderGroupsModal } from "../../components/admin/ReorderGroupsModal";
import type { Group, GroupDetail, UpdateGroupRequest } from "../../schema/groups";
import { authApi } from "../../utils/auth";
import { groupsApi } from "../../utils/groupsApi";

export function AdminGroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [reorderOpened, { open: openReorder, close: closeReorder }] = useDisclosure(false);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      navigate("/admin");
    }
    void loadGroups();
  }, [navigate, loadGroups]);

  const handleGroupClick = async (group: Group) => {
    try {
      const detail = await groupsApi.getDetail(group.id);
      setSelectedGroup(detail);
      openDetail();
    } catch (error) {
      console.error("Failed to load group detail:", error);
    }
  };

  const handleCreate = async (data: { name: string; display_name_cs: string }) => {
    await groupsApi.create(data);
    await loadGroups();
  };

  const handleUpdate = async (groupId: number, data: UpdateGroupRequest) => {
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

  const handleReorder = async (orderedIds: number[]) => {
    await groupsApi.reorder(orderedIds);
    await loadGroups();
  };

  return (
    <Flex direction="column" h="100%" w="100%" py="md" pb="xl">
      <Box pos="relative">
        <LoadingOverlay visible={loading} />

        <MantineGroup justify="space-between" mb="xl">
          <Title order={2}>Správa skupin</Title>
          <MantineGroup gap="sm">
            <Button
              variant="default"
              leftSection={<IconArrowsSort size={16} stroke={1.5} />}
              onClick={openReorder}
              disabled={groups.length < 2}
            >
              Seřadit
            </Button>
            <Button onClick={openCreate}>Přidat skupinu</Button>
          </MantineGroup>
        </MantineGroup>

        {groups.length === 0 && !loading ? (
          <Text c="dimmed" ta="center" mt="xl">
            Zatím nejsou žádné skupiny. Vytvořte první skupinu pomocí tlačítka výše.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} onClick={() => handleGroupClick(group)} />
            ))}
          </SimpleGrid>
        )}

        <CreateGroupModal opened={createOpened} onClose={closeCreate} onCreate={handleCreate} />

        <ReorderGroupsModal
          opened={reorderOpened}
          onClose={closeReorder}
          groups={groups}
          onReorder={handleReorder}
        />

        <GroupDetailModal
          group={selectedGroup}
          opened={detailOpened}
          onClose={closeDetail}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Box>
    </Flex>
  );
}
