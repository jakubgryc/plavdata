import { Button, Grid, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconCalculator, IconSwimming, IconWaveSine } from "@tabler/icons-react";
import type { GroupedSwimmers } from "../schema/types";
import { SwimmerSelection } from "./SwimmerSelection";

interface FastestRelayFilterBarProps {
  groupedSwimmers: GroupedSwimmers[];
  selectedSwimmers: string[];
  onSwimmersChange: (swimmers: string[]) => void;
  relayType: string;
  onRelayTypeChange: (type: string) => void;
  onCalculate: () => void;
  isLoading: boolean;
  lastFetchedRelayHash: string;
}

export function FastestRelayFilterBar({
  groupedSwimmers,
  selectedSwimmers,
  onSwimmersChange,
  relayType,
  onRelayTypeChange,
  onCalculate,
  isLoading,
  lastFetchedRelayHash,
}: FastestRelayFilterBarProps) {
  // Create hash from current selection
  const currentHash = `${selectedSwimmers.sort().join(",")}|${relayType}`;
  const isOutdated = lastFetchedRelayHash !== "" && lastFetchedRelayHash !== currentHash;
  const hasData = lastFetchedRelayHash !== "";

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
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={500} c="dimmed" style={{ letterSpacing: "0.5px" }}>
              Typ štafety
            </Text>
            <SegmentedControl
              value={relayType}
              onChange={onRelayTypeChange}
              data={[
                {
                  value: "freestyle",
                  label: (
                    <Group gap="xs" justify="center">
                      <IconSwimming size={16} />
                      <Text size="sm">Volný způsob</Text>
                    </Group>
                  ),
                },
                {
                  value: "medley",
                  label: (
                    <Group gap="xs" justify="center">
                      <IconWaveSine size={16} />
                      <Text size="sm">Polohový závod</Text>
                    </Group>
                  ),
                },
              ]}
              fullWidth
            />
          </Stack>

          <Button
            onClick={onCalculate}
            loading={isLoading}
            disabled={!isOutdated && hasData}
            variant={isOutdated ? "filled" : "light"}
            color={isOutdated ? "orange" : "blue"}
            leftSection={<IconCalculator size={18} />}
            fullWidth
            size="md"
          >
            Vypočítat štafety
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
