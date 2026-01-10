import { useState } from "react";
import {
  Card,
  Stack,
  Group,
  Box,
  Skeleton,
  Button,
  Collapse,
  Grid,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { FastestRelayCard } from "./FastestRelayCard.tsx";
import type { RelayResult } from "../schema/types";

interface FastestRelayResultsProps {
  results: RelayResult[];
  relayType: string;
  isLoading: boolean;
}

export function FastestRelayResults({
  results,
  relayType,
  isLoading,
}: FastestRelayResultsProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [showAdditionalRelays, setShowAdditionalRelays] = useState(false);

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
            backgroundColor:
              colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
          }}
        >
          <Skeleton height={24} width="60%" mb="xs" />
          <Skeleton height={16} width="80%" />
        </Box>
        <Stack gap="xs" p="lg">
          {[1, 2, 3, 4].map((_, idx) => (
            <Group key={idx} justify="space-between">
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
              showAdditionalRelays ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )
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
                <Grid.Col key={index} span={{ base: 12, md: 6 }}>
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
