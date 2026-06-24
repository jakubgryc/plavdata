import { Box, Flex, Text, useMantineColorScheme } from "@mantine/core";

function TableSplitRelayLegend() {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Flex gap="lg" align="center" py="xs">
      <Flex gap={6} align="center">
        <Box
          w={14}
          h={14}
          style={{
            borderRadius: 4,
            background: colorScheme === "dark" ? "#4A5D4A" : "#D4EDDA",
          }}
        />
        <Text size="sm">Mezičas</Text>
      </Flex>
      <Flex gap={6} align="center">
        <Box
          w={14}
          h={14}
          style={{
            borderRadius: 4,
            background: colorScheme === "dark" ? "#5A4A7A" : "#E2E3F1",
          }}
        />
        <Text size="sm">Štafetový úsek</Text>
      </Flex>
    </Flex>
  );
}

export default TableSplitRelayLegend;
