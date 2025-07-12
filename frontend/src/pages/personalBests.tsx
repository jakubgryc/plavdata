import { useEffect, useState } from "react";
import type { SwimmerPersonalBest } from "../schema/types";
import { Dropdown } from "primereact/dropdown";
import Grid, { type Column } from "../components/Grid";
import "./home.css";

const handleRowClick = (item: SwimmerPersonalBest) => {
  console.log(`Row clicked: ${item.swimmer.name} ${item.swimmer.surname}`);
};

const groups = [
  { label: "Z1", value: "Z1" },
  { label: "Z2", value: "Z2" },
  { label: "P1", value: "P1" },
  { label: "bývalí", value: "veteran" },
];

const DISCIPLINES = [
  "50 Z",
  "100 Z",
  "200 Z",
  "50 P",
  "100 P",
  "200 P",
  "50 M",
  "100 M",
  "200 M",
  "50 VZ",
  "100 VZ",
  "200 VZ",
  "400 VZ",
  "800 VZ",
  "1500 VZ",
  "100 O",
  "200 O",
  "400 O",
];

const parseTimeFromMillis = (ms: number): string => {
  const minutes = Math.floor(ms / 60000); // 1 min = 60000 ms
  const seconds = Math.floor((ms % 60000) / 1000); // get remaining seconds
  const milliseconds = Math.floor((ms % 1000) / 10); // first 2 digits of ms

  const paddedSeconds = seconds.toString().padStart(2, "0");
  const paddedMillis = milliseconds.toString().padStart(2, "0");

  return `${minutes}:${paddedSeconds}.${paddedMillis}`;
};

function setColumns(disciplines: string[]): Column<SwimmerPersonalBest>[] {
  const columns = disciplines.map((discipline) => ({
    key: discipline,
    header: discipline,
    render: (item: SwimmerPersonalBest) => {
      const best = item.personal_bests.find(
        (pb) => pb.discipline.code === discipline
      );
      return best ? parseTimeFromMillis(best.time) : "-";
    },
  }));

  columns.unshift({
    key: "swimmer",
    header: "Name",
    render: (item) => `${item.swimmer.surname} ${item.swimmer.name}`,
  });
  return columns;
}

function PersonalBests() {
  const [containerHeight, setContainerHeight] = useState<string>("100vh");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [personalBests, setPersonalBests] = useState<
    Array<SwimmerPersonalBest>
  >([]);

  const [cache, setCache] = useState<
    Record<string, Array<SwimmerPersonalBest>>
  >({});

  const cols: Column<SwimmerPersonalBest>[] = setColumns(DISCIPLINES);

  useEffect(() => {
    const navbar = document.querySelector(".nav");
    const navbarHeight = navbar ? navbar.clientHeight : 0;

    setContainerHeight(`calc(100vh - ${navbarHeight}px)`);
  }, []);

  useEffect(() => {
    const fetchPersonalBests = async (group: string) => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/personal_bests/grouped?group=${selectedGroup}`,
          {
            method: "GET",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch personal bests");
        }

        const data = await response.json();
        setCache((prevCache) => ({ ...prevCache, [group]: data }));
        setPersonalBests(data);
      } catch (error) {
        console.error("Error fetching personal bests:", error);
      }
    };

    if (selectedGroup) {
      if (cache[selectedGroup]) {
        setPersonalBests(cache[selectedGroup]);
      } else {
        fetchPersonalBests(selectedGroup);
      }
    }
  }, [selectedGroup, cache]);

  return (
    <div
      className="home-container bg-blue-300 "
      style={{ height: containerHeight }}
    >
      <div className="flex flex-row gap-20 h-15 bg-amber-100 border-amber-500 border-4">
        {/* <div className="card flex  gap-20 h-15 bg-amber-100 border-amber-500 border-4"> */}
        <Dropdown
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.value)}
          options={groups}
          optionLabel="label"
          placeholder="Select a group"
          className="w-20rem md:w-14rem"
        />
      </div>
      {personalBests.length === 0 ? (
        ""
      ) : (
        <div className="h-full overflow-auto ">
          <Grid<SwimmerPersonalBest>
            data={personalBests}
            columns={cols}
            onRowClick={handleRowClick}
            caption={`Osobní rekordy - ${
              groups.find((g) => g.value === selectedGroup)?.label || ""
            }`}
            keyExtractor={(item) => item.swimmer.id.toString()}
            className="w-full h-11/12 overflow-auto"
          />
        </div>
      )}
    </div>
  );
}

export default PersonalBests;
