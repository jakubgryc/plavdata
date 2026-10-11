import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Button,
  Flex,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconGripVertical } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { Group } from "../../schema/groups";

interface ReorderGroupsModalProps {
  opened: boolean;
  onClose: () => void;
  groups: Group[];
  onReorder: (orderedIds: number[]) => Promise<void>;
}

function SortableGroupRow({ group }: { group: Group }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      radius="md"
      px="xs"
      py={6}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : undefined,
        position: "relative",
      }}
    >
      <Flex align="center" gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Přetáhnout skupinu ${group.display_name_cs}`}
          style={{ cursor: "grab", touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={18} stroke={1.5} />
        </ActionIcon>
        <Text fw={500} size="sm">
          {group.display_name_cs}
        </Text>
        <Text size="xs" c="dimmed">
          {group.name}
        </Text>
      </Flex>
    </Paper>
  );
}

export function ReorderGroupsModal({ opened, onClose, groups, onReorder }: ReorderGroupsModalProps) {
  const [order, setOrder] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset the working order every time the modal opens
  useEffect(() => {
    if (opened) {
      setOrder(groups);
    }
  }, [opened, groups]);

  const sensors = useSensors(
    // Small activation distance so plain clicks don't start a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.findIndex((group) => group.id === active.id);
        const newIndex = prev.findIndex((group) => group.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onReorder(order.map((group) => group.id));
      onClose();
    } catch (error) {
      console.error("Failed to save group order:", error);
      notifications.show({
        title: "Chyba",
        message: "Nepodařilo se uložit pořadí skupin.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Seřadit skupiny" centered>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Přetáhněte skupiny do požadovaného pořadí. V tomto pořadí se budou zobrazovat ve všech
          pohledech (osobní rekordy, štafety, porovnání plavců).
        </Text>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map((group) => group.id)} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
              {order.map((group) => (
                <SortableGroupRow key={group.id} group={group} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>

        <Flex justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onClose} disabled={saving}>
            Zrušit
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Uložit
          </Button>
        </Flex>
      </Stack>
    </Modal>
  );
}
