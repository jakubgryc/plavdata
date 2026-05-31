import {
  Box,
  Button,
  Card,
  Collapse,
  Grid,
  Group,
  Skeleton,
  Stack,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useState } from "react";
import type { RelayResult } from "../schema/types";
import { FastestRelayCard } from "./FastestRelayCard.tsx";

interface FastestRelayResultsProps {
  results: RelayResult[];
  relayType: string;
  isLoading: boolean;
}

export function FastestRelayResults({ results, relayType, isLoading }: FastestRelayResultsProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [showAdditionalRelays, setShowAdditionalRelays] = useState(false);

  const SKELETON_KEYS = Array.from({ length: 4 }, (_, i) => `skeleton-${i}`);

  if (isLoading) {
    return (
      <Card
        withBorder
        shadow="sm"
        radius="lg"
        p={0}
        style={{
          overflow: "hidden",
          border: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        }}
      >
        <Box
          p="lg"
          style={{
            borderBottom: `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`,
            backgroundColor: colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0],
          }}
        >
          <Skeleton height={24} width="60%" mb="xs" />
          <Skeleton height={16} width="80%" />
        </Box>
        <Stack gap="xs" p="lg">
          {SKELETON_KEYS.map((key) => (
            <Group key={key} justify="space-between">
              <Skeleton height={16} width="40%" />
              <Skeleton height={16} width={60} />
            </Group>
          ))}
        </Stack>
      </Card>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <>
      {/* Best Relay */}
      <FastestRelayCard
        swimmers={results[0].swimmers}
        totalTime={results[0].totalTime}
        relayType={relayType}
        relayNumber={1}
        isBest={true}
      />

      {/* Additional relays toggle */}
      {results.length > 1 && (
        <Stack gap="md">
          <Button
            variant="subtle"
            onClick={() => setShowAdditionalRelays(!showAdditionalRelays)}
            rightSection={
              showAdditionalRelays ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
            }
            size="sm"
          >
            {showAdditionalRelays ? "Skrýt" : "Zobrazit"}{" "}
            {results.length - 1 < 5 ? (
              <>další {results.length - 1} varianty</>
            ) : (
              <>dalších {results.length - 1} variant</>
            )}
          </Button>

          <Collapse in={showAdditionalRelays}>
            <Grid>
              {results.slice(1).map((result, index) => (
                <Grid.Col key={result.totalTime} span={{ base: 12, md: 6 }}>
                  <FastestRelayCard
                    swimmers={result.swimmers}
                    totalTime={result.totalTime}
                    relayType={relayType}
                    relayNumber={index + 2}
                    isBest={false}
                  />
                </Grid.Col>
              ))}
            </Grid>
          </Collapse>
        </Stack>
      )}
    </>
  );
}
