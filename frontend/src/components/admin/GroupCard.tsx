import { Badge, Card, Group as MantineGroup, Text } from "@mantine/core";
import type { Group } from "../../schema/groups";

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <MantineGroup justify="space-between" mb="xs">
        <Text fw={500}>{group.display_name_cs}</Text>
        <Badge color="blue" variant="light">
          {group.swimmer_count} plavců
        </Badge>
      </MantineGroup>
      <Text size="sm" c="dimmed">
        Klíč: {group.name}
      </Text>
    </Card>
  );
}
