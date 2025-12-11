import { useEffect, useState } from "react";
import {
  SegmentedControl,
  Title,
  Modal,
  Text,
  Stack,
  Flex,
} from "@mantine/core";
import { DataTable } from "mantine-datatable";

import { API_BASE_URL } from "../../config";
import { POOLS, DISCIPLINES } from "../utils/constants";
import { parseTimeFromMillis, formatDate } from "../utils/timeUtils";

interface ClubRecord {
  discipline: string;
  ageCategory: string;
  swimmerId: number;
  name: string;
  surname: string;
  sex: string;
  time: number;
  ageAtResult: number;
  splitTime?: boolean;
  relayPart?: boolean;
  competitionLocation?: string;
  date: string;
}

interface ClubRecordsData {
  [discipline: string]: {
    [sex: string]: {
      [ageCategory: string]: ClubRecord;
    };
  };
}

function ClubRecords() {
  const [selectedCourse, setSelectedCourse] = useState<string>("25");
  const [clubRecords, setClubRecords] = useState<ClubRecordsData>({});
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [cache, setCache] = useState<Record<string, ClubRecordsData>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    time: string;
    name: string;
    surname: string;
    age: number;
    location?: string;
    isSplit?: boolean;
    isRelayPart?: boolean;
    date?: string;
    discipline: string;
    ageCategory: string;
  } | null>(null);

  useEffect(() => {
    const fetchClubRecords = async (course: string) => {
      setIsFetching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/results/club-records?course=${course}`,
          { method: "GET" },
        );
        if (!response.ok) throw new Error("Failed to fetch club records");
        const records = await response.json();

        // Transform the flat list of records into nested structure
        const data: ClubRecordsData = {};
        records.forEach((record: any) => {
          const disciplineCode = record.disciplineCode;
          const ageCategory = record.ageCategory;
          const sex = record.sex;

          if (!data[disciplineCode]) {
            data[disciplineCode] = {};
          }

          if (!data[disciplineCode][sex]) {
            data[disciplineCode][sex] = {};
          }

          data[disciplineCode][sex][ageCategory] = {
            discipline: disciplineCode,
            ageCategory: ageCategory,
            swimmerId: record.swimmerId,
            name: record.name,
            surname: record.surname,
            sex: record.sex,
            time: record.time,
            ageAtResult: record.ageAtResult,
            splitTime: record.splitTime,
            relayPart: record.relayPart,
            competitionLocation: record.competitionLocation,
            date: formatDate(record.date),
          };
        });

        const cacheKey = course;
        setCache((prevCache) => ({ ...prevCache, [cacheKey]: data }));
        setClubRecords(data);
      } catch (error) {
        console.error("Error fetching club records:", error);
      } finally {
        setIsFetching(false);
      }
    };

    const cacheKey = selectedCourse;
    if (cache[cacheKey]) {
      setClubRecords(cache[cacheKey]);
    } else {
      fetchClubRecords(selectedCourse);
    }
  }, [selectedCourse]);

  // Helper function to get discipline type (M=butterfly, Z=backstroke, P=breaststroke, VZ=freestyle, O=medley)
  const getDisciplineType = (discipline: string) => {
    if (discipline.includes(" M")) return "M";
    if (discipline.includes(" Z")) return "Z";
    if (discipline.includes(" P")) return "P";
    if (discipline.includes(" VZ")) return "VZ";
    if (discipline.includes(" O")) return "O";
    return "";
  };

  // Age categories that match the API response
  const ageCategories = ["9", "10", "11", "12", "13", "14", "junior", "open"];

  // Build table data
  const buildTableData = () => {
    const disciplinesList =
      selectedCourse === "50"
        ? DISCIPLINES.filter((d) => d !== "100 O")
        : DISCIPLINES;

    const rows: any[] = [];

    disciplinesList.forEach((discipline, disciplineIndex) => {
      // Create female row
      const femaleRow: any = {
        discipline: `${discipline} - ženy`,
        sex: "female",
      };
      ageCategories.forEach((category) => {
        const record = clubRecords[discipline]?.["female"]?.[category];
        femaleRow[category] = record || null;
      });

      // Check if this is the first row of a new discipline type
      const currentType = getDisciplineType(discipline);
      const prevType =
        disciplineIndex > 0
          ? getDisciplineType(disciplinesList[disciplineIndex - 1])
          : null;
      femaleRow.isFirstOfType = currentType !== prevType;

      rows.push(femaleRow);

      // Create male row
      const maleRow: any = { discipline: `${discipline} - muži`, sex: "male" };
      ageCategories.forEach((category) => {
        const record = clubRecords[discipline]?.["male"]?.[category];
        maleRow[category] = record || null;
      });

      // Male row is never first of type (female row is always first)
      maleRow.isFirstOfType = false;

      rows.push(maleRow);
    });

    return rows;
  };

  return (
    <Flex direction="column" h="100%" w="100%" py="md" pb="xl">
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify={{ sm: "space-between" }}
        align={{ base: "stretch", sm: "center" }}
        w="100%"
        mb="md"
        gap="md"
      >
        <Title order={2}>Klubové rekordy</Title>
        <SegmentedControl
          value={selectedCourse}
          onChange={setSelectedCourse}
          withItemsBorders={false}
          data={POOLS}
          defaultValue={POOLS[0]?.value}
          radius="xl"
          color="var(--color-primary)"
        />
      </Flex>

      <Flex direction="column" mah="80vh" style={{ overflowY: "auto" }}>
        <DataTable
          className="shadow-xl club-records-table"
          withTableBorder
          borderRadius="lg"
          horizontalSpacing="sm"
          withColumnBorders
          striped
          pinFirstColumn={true}
          highlightOnHover
          fetching={isFetching}
          rowClassName={(record) =>
            record.isFirstOfType ? "first-of-type" : ""
          }
          columns={[
            {
              accessor: "discipline",
              width: 140,
              title: "Disciplína",
            },
            ...ageCategories.map((category) => ({
              accessor: category,
              width: 350,
              title: (
                <Stack gap={4} align="center">
                  <Text fw={700} size="sm">
                    {category === "junior"
                      ? "Dorost"
                      : category === "open"
                        ? "Absolutní"
                        : `${category}letí`}
                  </Text>
                  <Flex
                    w="100%"
                    justify="flex-start"
                    gap={{ base: 4, sm: "xs" }}
                  >
                    <Text
                      size="xs"
                      style={{
                        flex: 3,
                        textAlign: "left",
                      }}
                    >
                      Jméno
                    </Text>
                    <Text
                      size="xs"
                      style={{
                        flex: 1.5,
                        textAlign: "left",
                      }}
                    >
                      Čas
                    </Text>
                    <Text size="xs" style={{ flex: 1.5, textAlign: "left" }}>
                      Datum
                    </Text>
                  </Flex>
                </Stack>
              ),
              render: (record: any) => {
                const data = record[category];
                if (!data) {
                  return (
                    <Text size="xs" c="dimmed" ta="center">
                      -
                    </Text>
                  );
                }
                return (
                  <Flex
                    w="100%"
                    justify="flex-start"
                    gap={{ base: 4, sm: "xs" }}
                    align="center"
                  >
                    <Text
                      size="xs"
                      style={{
                        flex: 3,
                        textAlign: "left",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                      onClick={() => {
                        setModalData({
                          time: parseTimeFromMillis(data.time),
                          name: data.name,
                          surname: data.surname,
                          age: data.ageAtResult,
                          location: data.competitionLocation,
                          isSplit: data.splitTime,
                          isRelayPart: data.relayPart,
                          date: data.date,
                          discipline: record.discipline,
                          ageCategory: category,
                        });
                        setModalOpen(true);
                      }}
                    >
                      {data.surname} {data.name}
                    </Text>
                    <Text
                      size="xs"
                      style={{
                        flex: 1.5,
                        textAlign: "left",
                      }}
                    >
                      {parseTimeFromMillis(data.time)}
                    </Text>
                    <Text
                      size="xs"
                      style={{ flex: 1.5, textAlign: "left" }}
                      truncate
                    >
                      {data.date || "-"}
                    </Text>
                  </Flex>
                );
              },
            })),
          ]}
          records={buildTableData()}
        />

        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            <Text size="lg" fw={700} c="var(--color-primary)">
              {modalData?.name} {modalData?.surname} - {modalData?.discipline}
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
              {modalData.date && <Text>Datum: {modalData.date}</Text>}
              {modalData.isSplit && (
                <Text style={{ color: "orange" }}>mezičas</Text>
              )}
              {modalData.isRelayPart && (
                <Text style={{ color: "purple" }}>štafeta</Text>
              )}
            </Stack>
          )}
        </Modal>
      </Flex>
    </Flex>
  );
}

export default ClubRecords;
