import { useEffect, useState } from "react";
import { SegmentedControl } from "@mantine/core";
import { Button, Chip, Group, Modal, Text, Stack } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { IconFileSpreadsheet } from "@tabler/icons-react";

import { API_BASE_URL } from "../../config";
import { GROUPS, POOLS, DISCIPLINES } from "../utils/constants";
import { buildTableData } from "../utils/tableUtils";
import { formatDate } from "../utils/timeUtils";

import type { SwimmerPersonalBest } from "../schema/types";

function PersonalBests() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>("Z1");
  const [selectedCourse, setSelectedCourse] = useState<string>("25");
  const [personalBests, setPersonalBests] = useState<
    Array<SwimmerPersonalBest>
  >([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [cache, setCache] = useState<
    Record<string, Array<SwimmerPersonalBest>>
  >({});

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

  useEffect(() => {
    const fetchPersonalBests = async (group: string, course: string) => {
      setIsFetching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/personal_bests/grouped?group=${group}&course=${course}`,
          { method: "GET" },
        );
        if (!response.ok) throw new Error("Failed to fetch personal bests");
        const data = await response.json();
        const cacheKey = `${group}-${course}`;
        setCache((prevCache) => ({ ...prevCache, [cacheKey]: data }));
        setPersonalBests(data);
      } catch (error) {
        console.error("Error fetching personal bests:", error);
      } finally {
        setIsFetching(false);
      }
    };

    if (selectedGroup) {
      const cacheKey = `${selectedGroup}-${selectedCourse}`;
      if (cache[cacheKey]) {
        setPersonalBests(cache[cacheKey]);
      } else {
        fetchPersonalBests(selectedGroup, selectedCourse);
      }
    }
  }, [selectedGroup, selectedCourse, cache]);

  return (
    <div className="flex flex-col  h-full w-full py-5">
      <div className="flex w-full justify-between items-center">
        <h2 className="text-2xl font-semibold mb-4">Osobní rekordy</h2>
        <Button
          leftSection={<IconFileSpreadsheet size={20} stroke={1.5} />}
          variant="outline"
          color="rgba(60, 60, 60, 1)"
          radius="md"
          size="sm"
          onClick={() => {
            console.log(buildTableData(personalBests));
          }}
        >
          Stáhnout
        </Button>
      </div>
      <div className="flex justify-between w-full mx-auto bg-gray-300  py-2 ">
        <Chip.Group
          multiple={false}
          value={selectedGroup}
          onChange={setSelectedGroup}
        >
          <Group justify="center">
            {GROUPS.map((group) => (
              <Chip
                key={group.value}
                value={group.value}
                variant="filled"
                size="md"
                color="rgba(18, 160, 216, 1)"
              >
                {group.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <SegmentedControl
          value={selectedCourse}
          onChange={setSelectedCourse}
          withItemsBorders={false}
          data={POOLS}
          defaultValue={POOLS[0]?.value}
          radius="xl"
          color="rgba(18, 160, 216, 1)"
        />
      </div>
      <div className="max-h-10/12 pt-2">
        <DataTable
          className="shadow-xl"
          withTableBorder
          borderRadius="lg"
          horizontalSpacing="xs"
          withColumnBorders
          maxHeight={600}
          striped
          pinFirstColumn={true}
          highlightOnHover
          fetching={isFetching}
          columns={[
            { accessor: "name", width: 170, noWrap: true, title: "" },
            ...DISCIPLINES.filter((discipline) => {
              return !(selectedCourse === "50" && discipline === "100 O");
            }).map((discipline) => ({
              accessor: discipline,
              title: discipline,
              render: (record: any) => {
                const descriptionKey = `${discipline}_description`;
                const description = record[descriptionKey];
                return description ? (
                  <button
                    onClick={() => {
                      setModalData({
                        ...description,
                        name: record.name,
                        discipline,
                      });
                      setModalOpen(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {record[discipline]}
                  </button>
                ) : (
                  record[discipline]
                );
              },
            })),
          ]}
          records={buildTableData(personalBests)}
        />
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            <Text size="lg" fw={700} c="rgba(18, 160, 216, 1)">
              {modalData?.name} - {modalData?.discipline}
            </Text>
          }
          centered
        >
          {modalData && (
            <Stack>
              <Text>Čas: {modalData.time}</Text>
              {modalData.location && (
                <Text>Místo zaplavání: {modalData.location}</Text>
              )}
              {modalData.date && (
                <Text>Datum: {formatDate(modalData.date)}</Text>
              )}
              {modalData.isSplit && (
                <Text style={{ color: "green" }}>mezičas</Text>
              )}
              {modalData.isRelayPart && (
                <Text style={{ color: "purple" }}>štafeta</Text>
              )}
            </Stack>
          )}
        </Modal>
      </div>
    </div>
  );
}
export default PersonalBests;
