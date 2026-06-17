import { Badge, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconMinus, IconX } from "@tabler/icons-react";

const BADGE_MIN_WIDTH = 40;

export function getImprovementBadge(
  result: { improvement: boolean; performance: number },
  options?: { isDnf?: boolean; isFirstTime?: boolean },
) {
  if (options?.isFirstTime) {
    return <Text c="dimmed">-</Text>;
  }
  if (options?.isDnf) {
    return (
      <Badge
        color="gray"
        variant="light"
        size="sm"
        leftSection={<IconX size={10} />}
        style={{ minWidth: BADGE_MIN_WIDTH, justifyContent: "center" }}
      >
        DNF
      </Badge>
    );
  }

  const pct = (result.performance * 100).toFixed(2);
  if (result.improvement) {
    return (
      <Badge
        color="green"
        variant="light"
        size="sm"
        leftSection={<IconArrowUp size={10} />}
        style={{ minWidth: BADGE_MIN_WIDTH, justifyContent: "center" }}
      >
        +{pct}%
      </Badge>
    );
  }
  if (result.performance > 0) {
    return (
      <Badge
        color="red"
        variant="light"
        size="sm"
        leftSection={<IconArrowDown size={10} />}
        style={{ minWidth: BADGE_MIN_WIDTH, justifyContent: "center" }}
      >
        -{pct}%
      </Badge>
    );
  }
  return (
    <Badge
      color="gray"
      variant="light"
      size="sm"
      leftSection={<IconMinus size={10} />}
      style={{ minWidth: BADGE_MIN_WIDTH, justifyContent: "center" }}
    >
      -
    </Badge>
  );
}
