import { useEffect, useState } from "react";
import { SegmentedControl } from "@mantine/core";
import { Button, Chip, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { GROUPS, POOLS, DISCIPLINES } from "../utils/constants";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import type { SwimmerPersonalBest } from "../schema/types";
import { API_BASE_URL } from "../../config";
import { buildTableData } from "../utils/tableUtils";

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
        console.log("fetchPersonalBests successful");
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

  useEffect(() => {
    console.log(selectedGroup);
  }, [selectedGroup]);

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
      <div className="flex justify-between w-full mx-auto bg-gray-300  border-black border-0 rounded py-2 text-black">
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
            })),
          ]}
          records={buildTableData(personalBests)}
        />
      </div>
    </div>
  );
}
export default PersonalBests;
