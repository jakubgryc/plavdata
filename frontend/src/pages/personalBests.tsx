import { useEffect, useState } from "react";
import { SegmentedControl, Tooltip, Loader } from "@mantine/core";
import type { SwimmerPersonalBest } from "../schema/types";
import { Dropdown } from "primereact/dropdown";
import Grid, { type Column } from "../components/Grid";
import "./home.css";
import { Modal } from "@mantine/core";

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

// Helper to format date as dd.mm.yyyy
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString; // fallback if invalid
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function setColumns(
  disciplines: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API data structure
  onTimeClick: (item: SwimmerPersonalBest, best: any) => void
): Column<SwimmerPersonalBest>[] {
  const columns = disciplines.map((discipline) => ({
    key: discipline,
    header: discipline,
    render: (item: SwimmerPersonalBest) => {
      const best = item.personal_bests.find(
        (pb) => pb.discipline.code === discipline
      );
      if (best) {
        return (
          <Tooltip label="Klikni pro detaily" withArrow>
            <span
              className="cursor-pointer  transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTimeClick(item, best);
              }}
            >
              {parseTimeFromMillis(best.time)}
            </span>
          </Tooltip>
        );
      }
      return "-";
    },
  }));

  columns.unshift({
    key: "swimmer",
    header: "Name",
    render: (item) => (
      <span>
        {item.swimmer.surname} {item.swimmer.name}
      </span>
    ),
  });
  return columns;
}

function PersonalBests() {
  const [containerHeight, setContainerHeight] = useState<string>("100vh");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("25");
  const [personalBests, setPersonalBests] = useState<
    Array<SwimmerPersonalBest>
  >([]);

  const [cache, setCache] = useState<
    Record<string, Array<SwimmerPersonalBest>>
  >({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    discipline: string;
    time: string;
    date: string;
    swimmer: string;
    location: string;
    points: number;
    relay_part?: boolean;
    split_time?: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API data structure
  const handleTimeClick = (item: SwimmerPersonalBest, best: any) => {
    setModalInfo({
      discipline: best.discipline.code,
      time: parseTimeFromMillis(best.time),
      date: formatDate(best.date ?? ""),
      location: best.competition_location ?? "",
      swimmer:
        (item.swimmer.surname ? item.swimmer.surname : "") +
        " " +
        (item.swimmer.name ? item.swimmer.name : ""),
      points: best.points,
      relay_part: best.relay_part,
      split_time: best.split_time,
    });
    setModalOpen(true);
  };

  const cols: Column<SwimmerPersonalBest>[] = setColumns(
    DISCIPLINES,
    handleTimeClick
  );

  useEffect(() => {
    const navbar = document.querySelector(".nav");
    const navbarHeight = navbar ? navbar.clientHeight : 0;
    setContainerHeight(`calc(100vh - ${navbarHeight}px)`);
  }, []);

  useEffect(() => {
    const fetchPersonalBests = async (group: string, course: string) => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/personal_bests/grouped?group=${group}&course=${course}`,
          { method: "GET" }
        );
        if (!response.ok) throw new Error("Failed to fetch personal bests");
        const data = await response.json();
        const cacheKey = `${group}-${course}`;
        setCache((prevCache) => ({ ...prevCache, [cacheKey]: data }));
        setPersonalBests(data);
      } catch (error) {
        console.error("Error fetching personal bests:", error);
      } finally {
        setLoading(false);
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
    <div
      className="home-container bg-blue-300 "
      style={{ height: containerHeight }}
    >
      <div className="flex flex-row justify-between  h-15 bg-amber-100 border-amber-500 border-4">
        {/* <div className="card flex  gap-20 h-15 bg-am5er-100 border-amber-500 border-4"> */}
        <div>
          <Dropdown
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.value)}
            options={groups}
            optionLabel="label"
            placeholder="Select a group"
            className="w-20rem md:w-14rem"
          />
        </div>
        <div>
          <SegmentedControl
            defaultValue="25"
            color="blue"
            size="lg"
            data={["25", "50"]}
            onChange={setSelectedCourse}
          />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Loader size="lg" color="blue" />
        </div>
      ) : personalBests.length === 0 ? (
        ""
      ) : (
        <div className="h-full overflow-auto ">
          <Grid<SwimmerPersonalBest>
            data={personalBests}
            columns={cols}
            caption={`Osobní rekordy - ${
              groups.find((g) => g.value === selectedGroup)?.label || ""
            } (${selectedCourse} m)`}
            keyExtractor={(item) => item.swimmer.id.toString()}
            className="w-full  overflow-auto"
            headerClassName="height-10"
          />
          <Modal
            opened={modalOpen}
            onClose={() => setModalOpen(false)}
            title={
              modalInfo ? (
                <div className="text-xl font-bold flex items-center">
                  {modalInfo.swimmer} – {modalInfo.discipline}
                </div>
              ) : null
            }
            centered
          >
            {modalInfo && (
              <div style={{ fontSize: "1.1rem" }}>
                {(modalInfo.relay_part || modalInfo.split_time) && (
                  <div className="text-amber-700 italic text-2xl">
                    {modalInfo.relay_part
                      ? "štafeta"
                      : modalInfo.split_time
                      ? "mezičas"
                      : ""}
                  </div>
                )}
                <b>Čas:</b> {modalInfo.time} <br />
                <b>Místo:</b> {modalInfo.location} <br />
                <b>Datum:</b> {modalInfo.date} <br />
                <b>Body:</b> {modalInfo.points} <br />
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}

export default PersonalBests;
