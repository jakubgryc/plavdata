import { Box, Chip, Flex, Modal, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { API_BASE_URL } from "../../config";
import TableSplitRelayLegend from "../components/shared/TableSplitRelayLegend";
import { useTheme } from "../hooks/useTheme";
import type { PBGroup } from "../schema/groups";
import type { SwimmerPersonalBest } from "../schema/types";
import { DISCIPLINES, POOLS } from "../utils/constants";
import type { DisciplineDescription, PersonalBestRow } from "../utils/tableUtils";
import { buildTableData } from "../utils/tableUtils";
import { formatDate } from "../utils/timeUtils";

function isDisciplineDescription(value: unknown): value is DisciplineDescription {
  return typeof value === "object" && value !== null && "time" in value;
}

function PersonalBests() {
  const { colorScheme } = useTheme();
  const [groups, setGroups] = useState<PBGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("25");
  const [personalBests, setPersonalBests] = useState<Array<SwimmerPersonalBest>>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [cache, setCache] = useState<Record<string, Array<SwimmerPersonalBest>>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    time: string;
    location?: string;
    isSplit?: boolean;
    isRelayPart?: boolean;
    date?: string;
    name: string;
    discipline: string;
  } | null>(null);

  // Load the groups that have at least one swimmer visible in personal bests
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/personal_bests/groups`, { method: "GET" });
        if (!response.ok) {
          console.error("Error fetching personal best groups", response.status);
          return;
        }
        const data = (await response.json()) as PBGroup[];
        setGroups(data);
        setSelectedGroupId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
      } catch (error) {
        console.error("Error fetching personal best groups:", error);
      }
    };

    void fetchGroups();
  }, []);

  useEffect(() => {
    const fetchPersonalBests = async (groupId: number, course: string) => {
      setIsFetching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/personal_bests/grouped?group_id=${groupId}&course=${course}`,
          { method: "GET" },
        );
        if (!response.ok) {
          console.error("Error fetching personal bests", response.status);
          return;
        }
        const data = (await response.json()) as SwimmerPersonalBest[];
        const cacheKey = `${groupId}-${course}`;
        setCache((prevCache) => ({ ...prevCache, [cacheKey]: data }));
        setPersonalBests(data);
      } catch (error) {
        console.error("Error fetching personal bests:", error);
      } finally {
        setIsFetching(false);
      }
    };

    if (selectedGroupId !== null) {
      const cacheKey = `${selectedGroupId}-${selectedCourse}`;
      if (cache[cacheKey]) {
        setPersonalBests(cache[cacheKey]);
      } else {
        void fetchPersonalBests(selectedGroupId, selectedCourse);
      }
    } else {
      setPersonalBests([]);
    }
  }, [selectedGroupId, selectedCourse, cache]);

  return (
    <Flex direction="column" h="80vh" w="100%" pb="xl">
      <Flex justify="space-between" align="center" w="100%">
        <Title order={2} mb="md">
          Osobní rekordy
        </Title>
        {/*This can be kept commented out. Will work on it in future.*/}
        {/*<Button*/}
        {/*  leftSection={<IconFileSpreadsheet size={20} stroke={1.5} />}*/}
        {/*  variant="outline"*/}
        {/*  color="rgba(60, 60, 60, 1)"*/}
        {/*  radius="md"*/}
        {/*  size="sm"*/}
        {/*  onClick={() => {*/}
        {/*    console.log(buildTableData(personalBests));*/}
        {/*  }}*/}
        {/*>*/}
        {/*  Stáhnout*/}
        {/*</Button>*/}
      </Flex>
      <Flex
        direction={{ base: "column", md: "row" }}
        justify={{ md: "space-between" }}
        align={{ base: "stretch", md: "center" }}
        gap="md"
        className="w-full mx-auto py-2"
      >
        <Flex gap="xs" wrap="wrap" justify="flex-start">
          {groups.map((group) => (
            <Chip
              key={group.id}
              checked={selectedGroupId === group.id}
              onClick={() => setSelectedGroupId(group.id)}
              size="sm"
              style={{ flex: "1 1 auto", minWidth: 0 }}
            >
              {group.display_name_cs}
            </Chip>
          ))}
        </Flex>
        <SegmentedControl
          value={selectedCourse}
          onChange={setSelectedCourse}
          withItemsBorders={false}
          data={POOLS}
          defaultValue={POOLS[0]?.value}
          radius="xl"
        />
      </Flex>
      <TableSplitRelayLegend />
      <Box mah="70vh" pt="sm" style={{ overflowY: "auto" }}>
        <DataTable<PersonalBestRow>
          className="shadow-xl responsive-generic-table"
          withTableBorder
          borderRadius="lg"
          horizontalSpacing="0"
          verticalSpacing="0"
          withColumnBorders
          striped
          pinFirstColumn={true}
          highlightOnHover
          fetching={isFetching}
          columns={[
            {
              accessor: "name",
              width: 145,
              noWrap: true,
              title: "",
              render: (record: PersonalBestRow) => (
                <Box>
                  <Text
                    component={Link}
                    to={`/swimmer/${record.swimmerId}`}
                    className="textHoverLink"
                    size="sm"
                  >
                    {record.name}
                  </Text>
                </Box>
              ),
            },
            ...DISCIPLINES.filter((discipline) => {
              return !(selectedCourse === "50" && discipline === "100 O");
            }).map((discipline) => ({
              accessor: discipline,
              title: discipline,
              render: (record: PersonalBestRow) => {
                const description = record[discipline];
                if (!isDisciplineDescription(description)) {
                  return null;
                }
                const bgColor = description.isSplit
                  ? colorScheme === "dark"
                    ? "#4A5D4A"
                    : "#D4EDDA" // dimmer green in dark
                  : description.isRelayPart
                    ? colorScheme === "dark"
                      ? "#5A4A7A"
                      : "#E2E3F1" // dimmer purple in dark
                    : "transparent";
                return description.time !== "" ? (
                  <Box
                    style={{
                      background: bgColor,
                      padding: "10px 10px",
                    }}
                  >
                    <Text
                      onClick={() => {
                        setModalData({ ...description, name: record.name, discipline });
                        setModalOpen(true);
                      }}
                      className="textHoverLink"
                      style={{ cursor: "pointer" }}
                    >
                      {description.time}
                    </Text>
                  </Box>
                ) : (
                  <Box style={{ padding: "10px 10px" }}>
                    <Text style={{ visibility: "hidden" }}>
                      .{/* Placeholder for correct row sizing when row is empty*/}
                    </Text>
                  </Box>
                );
              },
            })),
          ]}
          records={buildTableData(personalBests)}
        />
      </Box>
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Text size="lg" fw={700} c="var(--color-primary)">
            {modalData?.name} - {modalData?.discipline}
          </Text>
        }
        centered
      >
        {modalData && (
          <Stack>
            <Text>Čas: {modalData.time}</Text>
            {modalData.location && <Text>Místo zaplavání: {modalData.location}</Text>}
            {modalData.date && <Text>Datum: {formatDate(modalData.date)}</Text>}
            {modalData.isSplit && <Text style={{ color: "green" }}>mezičas</Text>}
            {modalData.isRelayPart && <Text style={{ color: "purple" }}>štafeta</Text>}
          </Stack>
        )}
      </Modal>
    </Flex>
  );
}
export default PersonalBests;
