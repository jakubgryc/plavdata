import { Box, Button, Card, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

interface TaskCardProps {
  title: string;
  description: string;
  buttonText: string;
  icon: ReactNode;
  color: string;
  onExecute: () => Promise<string>;
}

function TaskCard({ title, description, buttonText, icon, color, onExecute }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState("");

  const handleExecute = async () => {
    setLoading(true);
    setStatus("idle");
    setResultMessage("");

    try {
      const message = await onExecute();
      setStatus("success");
      setResultMessage(message);
    } catch (error) {
      setStatus("error");
      setResultMessage(error instanceof Error ? error.message : "Došlo k neznámé chybě.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder shadow="sm" radius="md" p="md">
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="md" style={{ flex: 1, minWidth: "250px" }}>
          <ThemeIcon size="lg" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <Box>
            <Text fw={600}>{title}</Text>
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          </Box>
        </Group>
        <Button onClick={handleExecute} loading={loading} variant="light" color={color} size="sm">
          {buttonText}
        </Button>
      </Group>

      {status !== "idle" && (
        <Paper
          mt="md"
          p="sm"
          radius="sm"
          bg={
            status === "success"
              ? "var(--mantine-color-green-light)"
              : "var(--mantine-color-red-light)"
          }
          style={{
            border: `1px solid var(--mantine-color-${status === "success" ? "green" : "red"}-outline)`,
          }}
        >
          <Group gap="xs" wrap="nowrap">
            {status === "success" ? (
              <IconCheck size={18} color="var(--mantine-color-green-filled)" />
            ) : (
              <IconX size={18} color="var(--mantine-color-red-filled)" />
            )}
            <Text size="sm" c={status === "success" ? "green.9" : "red.9"} fw={500}>
              {resultMessage}
            </Text>
          </Group>
        </Paper>
      )}
    </Card>
  );
}

export default TaskCard;
