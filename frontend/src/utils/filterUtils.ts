import type { OptionsFilter } from "@mantine/core";
import { removeDiacritics } from "./constants";

// Custom filter that ignores Czech diacritics for swimmer selection, heavily inspired by Claude
export const swimmersFilter: OptionsFilter = ({ options, search }) => {
  // If no search query, return all options
  if (!search || search.trim() === "") {
    return options;
  }

  const normalizedSearch = removeDiacritics(search.toLowerCase().trim());

  // Filter grouped options - keep groups but filter items within them
  return options
    .map((option: any) => {
      // If it's a group with items, filter the items
      if (option.items && Array.isArray(option.items)) {
        const filteredItems = option.items.filter((item: any) => {
          const label = item.label || item;
          const normalizedLabel = removeDiacritics(label.toLowerCase().trim());
          return normalizedLabel.includes(normalizedSearch);
        });

        // Only return the group if it has matching items
        if (filteredItems.length > 0) {
          return { ...option, items: filteredItems };
        }
        return null;
      }

      // For non-grouped items, filter by label
      if (option.label) {
        const normalizedLabel = removeDiacritics(option.label.toLowerCase().trim());
        return normalizedLabel.includes(normalizedSearch) ? option : null;
      }

      return option;
    })
    .filter((option: any) => option !== null);
};
