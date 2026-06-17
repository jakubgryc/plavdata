import { DNF_TRESHOLD } from "./constants";

export const parseTimeFromMillis = (ms: number): string => {
  if (ms >= DNF_TRESHOLD) return "DNF";

  const minutes = Math.floor(ms / 60000); // 1 min = 60000 ms
  const seconds = Math.floor((ms % 60000) / 1000); // get remaining seconds
  const milliseconds = Math.floor((ms % 1000) / 10); // first 2 digits of ms

  const paddedSeconds = seconds.toString().padStart(2, "0");
  const paddedMillis = milliseconds.toString().padStart(2, "0");

  return `${minutes}:${paddedSeconds}.${paddedMillis}`;
};

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateFromMs(timestampMs: number): string {
  const date = new Date(timestampMs);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
