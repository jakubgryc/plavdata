import { Button, Grid, NumberInput, Stack, Text } from "@mantine/core";
import { IconCalculator } from "@tabler/icons-react";
import type { GroupedSwimmers } from "../schema/types";
import { SwimmerSelection } from "./SwimmerSelection";

interface EqualRelayFilterBarProps {
  groupedSwimmers: GroupedSwimmers[];
  selectedSwimmers: string[];
  onSwimmersChange: (swimmers: string[]) => void;
  numRelays: number;
  onNumRelaysChange: (num: number) => void;
  onCalculate: () => void;
  isLoading: boolean;
}

export function EqualRelayFilterBar({
  groupedSwimmers,
  selectedSwimmers,
  onSwimmersChange,
  numRelays,
  onNumRelaysChange,
  onCalculate,
  isLoading,
}: EqualRelayFilterBarProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <SwimmerSelection
          groupedSwimmers={groupedSwimmers}
          selectedSwimmers={selectedSwimmers}
          onSwimmersChange={onSwimmersChange}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <NumberInput
            label={
              <Text size="xs" tt="uppercase" fw={500} c="dimmed" style={{ letterSpacing: "0.5px" }}>
                Počet štafet
              </Text>
            }
            value={numRelays}
            onChange={(value) => onNumRelaysChange(Number(value) || 2)}
            min={2}
            max={10}
          />

          <Button
            onClick={onCalculate}
            loading={isLoading}
            leftSection={<IconCalculator size={18} />}
            fullWidth
            size="md"
          >
            Vypočítat vyrovnané štafety
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
