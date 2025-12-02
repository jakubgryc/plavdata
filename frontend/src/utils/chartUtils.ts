import type { SwimmerResults, GroupedSwimmers } from "../schema/types";

export function findYoungestAndOldestYear(data: SwimmerResults[]) {
  if (data.length === 0) return { youngest: null, oldest: null };

  let youngest = -Infinity;
  let oldest = Infinity;

  data.forEach((swimmerData) => {
    const lastResultDate =
      swimmerData.results[swimmerData.results.length - 1].date;
    const firstResult = swimmerData.results[0].date;
    const lastResultYear = new Date(lastResultDate).getFullYear();
    const firstResultYear = new Date(firstResult).getFullYear();
    if (lastResultYear > youngest) youngest = lastResultYear;
    if (firstResultYear < oldest) oldest = firstResultYear;
  });
  return { youngest, oldest };
}

export function findOldestBirthYear(data: SwimmerResults[]): number {
  if (data.length === 0) return 0;

  return Math.min(...data.map((swimmerData) => swimmerData.swimmer.birth_year));
}

export function createRelativeDomainTicks(data: SwimmerResults[]): number[] {
  // Create relative domain ticks based on the youngest
  // and oldest swimmer's last and first result year
  // Ticks are created for each year Jan 1st between oldest and youngest
  if (data.length === 0) return [];

  const { youngest, oldest } = findYoungestAndOldestYear(data);

  const ticks: number[] = [];
  if (youngest !== null && oldest !== null) {
    for (let year = oldest + 1; year <= youngest; year++) {
      const date = new Date(year, 0, 1); // January 1st of the year
      ticks.push(date.getTime());
    }
  }
  return ticks;
}

export function createAbsoluteDomainTicks(data: SwimmerResults[]): number[] {
  // Create ticks for absolute time axis based on min and max dates in data
  // each tick should be 1 year apart, always Jan 1st
  if (data.length === 0) return [];

  const ticks: number[] = [];

  const [minDate, maxDate] = [
    new Date(
      Math.min(
        ...data.map((swimmerData) =>
          new Date(swimmerData.results[0].date).getTime(),
        ),
      ),
    ),
    new Date(
      Math.max(
        ...data.map((swimmerData) =>
          new Date(
            swimmerData.results[swimmerData.results.length - 1].date,
          ).getTime(),
        ),
      ),
    ),
  ];

  const minYear = minDate.getFullYear();
  const minMonth = minDate.getMonth();
  for (
    let year = minMonth > 5 ? minYear + 1 : minYear;
    year <= maxDate.getFullYear();
    year++
  ) {
    ticks.push(new Date(year, 0, 1).getTime());
  }

  return ticks;
}

export function createYAxisTicks(
  minTime: number,
  maxTime: number,
  disciplineLength: number,
): number[] {
  // for 50 and 100m disciplines, create ticks every 5 seconds
  // for 200m and above, create ticks every 10 seconds
  // also keep the minTime and maxTime in the ticks and end at this value
  // also, start from the nearest higher multiple of the interval (e.g. minTime=23s, start from 25s)

  const interval = disciplineLength <= 100 ? 5000 : 10000;
  const ticks: number[] = [];

  ticks.push(minTime);
  const startTick = Math.ceil(minTime / interval) * interval;
  for (let time = startTick; time <= maxTime; time += interval) {
    ticks.push(time);
  }
  ticks.push(maxTime);

  return ticks;
}

export function shiftResults(data: SwimmerResults[]): SwimmerResults[] {
  if (data.length === 0) return data;

  const oldestBirthYear = findOldestBirthYear(data);

  return data.map((swimmerData) => {
    const birthYearDiff = swimmerData.swimmer.birth_year - oldestBirthYear;
    const shiftedResults = swimmerData.results.map((result) => {
      const originalDate = new Date(result.date);
      const shiftedDate = new Date(
        originalDate.setFullYear(originalDate.getFullYear() - birthYearDiff),
      );
      return {
        ...result,
        date: shiftedDate.toISOString().slice(0, 19),
      };
    });
    return {
      ...swimmerData,
      results: shiftedResults,
    };
  });
}

export function findSwimmerIds(
  selectedSwimmers: string[],
  groupedSwimmers: GroupedSwimmers[],
): number[] {
  const swimmerIds: number[] = [];
  selectedSwimmers.forEach((selected) => {
    groupedSwimmers.forEach(({ swimmers }) => {
      swimmers.forEach((swimmer) => {
        const fullName = `${swimmer.surname} ${swimmer.name}`;
        if (fullName === selected) {
          swimmerIds.push(swimmer.id);
        }
      });
    });
  });
  return swimmerIds;
}

export function findMinMaxDates(data: SwimmerResults[]): [number, number] {
  let minDate = Infinity;
  let maxDate = -Infinity;

  data.forEach((swimmerData) => {
    swimmerData.results.forEach((result) => {
      const resultDate = new Date(result.date).getTime();
      if (resultDate < minDate) minDate = resultDate;
      if (resultDate > maxDate) maxDate = resultDate;
    });
  });

  return [minDate, maxDate];
}

export function parseCurrentDiscipline(data: SwimmerResults[]): string | null {
  if (data.length === 0) return null;

  // assume all swimmers have the same discipline in results
  const firstSwimmerResults = data[0].results;
  if (firstSwimmerResults.length === 0) return null;

  return firstSwimmerResults[0].discipline.code;
}

export function findMinMaxTimes(
  data: SwimmerResults[],
  onlyFinal: boolean,
  onlyImprovements: boolean,
): [number, number] {
  let minTime = Infinity;
  let maxTime = -Infinity;

  data.forEach((swimmerData) => {
    // loop only through results that are not DNF (6039990)
    // and based on improvements and split times
    swimmerData.results
      .filter(
        (result, index) =>
          result.time !== 6039990 &&
          (index === 0 || !onlyFinal || !result.split_time) &&
          (index === 0 || !onlyImprovements || result.improvement),
      )
      .forEach((result) => {
        const resultTime = result.time;
        if (resultTime < minTime) minTime = resultTime;
        if (resultTime > maxTime) maxTime = resultTime;
      });
  });

  return [minTime, maxTime];
}
