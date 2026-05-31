import type { ComboboxParsedItem, ComboboxParsedItemGroup, OptionsFilter } from "@mantine/core";
import { removeDiacritics } from "./constants";

type OptionLike = ComboboxParsedItem;

const isGroup = (option: ComboboxParsedItem): option is ComboboxParsedItemGroup => {
  return typeof option === "object" && option !== null && "items" in option;
};

const getLabel = (item: ComboboxParsedItem): string => {
  if (typeof item === "object" && item !== null && "label" in item) {
    return item.label === "string" ? item.label : "";
  }
  return "";
};

// Custom filter that ignores Czech diacritics for swimmer selection, heavily inspired by Claude
export const swimmersFilter: OptionsFilter = ({ options, search }) => {
  // If no search query, return all options
  if (!search || search.trim() === "") {
    return options;
  }

  const normalizedSearch = removeDiacritics(search.toLowerCase().trim());

  // Filter grouped options - keep groups but filter items within them
  return options
    .map((option) => {
      const typedOption = option as ComboboxParsedItem;
      // If it's a group with items, filter the items
      if (isGroup(typedOption) && Array.isArray(typedOption.items)) {
        const filteredItems = typedOption.items.filter((item) => {
          const label = getLabel(item);
          const normalizedLabel = removeDiacritics(label.toLowerCase().trim());
          return normalizedLabel.includes(normalizedSearch);
        });

        // Only return the group if it has matching items
        if (filteredItems.length > 0) {
          return { ...typedOption, items: filteredItems };
        }
        return null;
      }

      // For non-grouped items, filter by label
      const label = getLabel(typedOption);
      const normalizedLabel = removeDiacritics(label.toLowerCase().trim());
      return normalizedLabel.includes(normalizedSearch) ? typedOption : null;
    })
    .filter((option): option is OptionLike => option !== null);
};
