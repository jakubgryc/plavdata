import { Badge } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconMinus } from "@tabler/icons-react";

export function getImprovementBadge(result: { improvement: boolean; performance: number }) {
  const pct = (result.performance * 100).toFixed(2);
  if (result.improvement) {
    return (
      <Badge color="green" variant="light" size="sm" leftSection={<IconArrowUp size={10} />}>
        +{pct}%
      </Badge>
    );
  }
  if (result.performance > 0) {
    return (
      <Badge color="red" variant="light" size="sm" leftSection={<IconArrowDown size={10} />}>
        -{pct}%
      </Badge>
    );
  }
  return (
    <Badge color="gray" variant="light" size="sm" leftSection={<IconMinus size={10} />}>
      -
    </Badge>
  );
}
