export const getGroupLabel = (group: string): string => {
  const groupMap: Record<string, string> = {
    veteran: "Bývalý plavec",
    runaway: "Bývalý plavec",
    president: "P",
  };
  return groupMap[group] || group;
};
