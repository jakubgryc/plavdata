export const parseTimeFromMillis = (ms: number): string => {
  const minutes = Math.floor(ms / 60000); // 1 min = 60000 ms
  const seconds = Math.floor((ms % 60000) / 1000); // get remaining seconds
  const milliseconds = Math.floor((ms % 1000) / 10); // first 2 digits of ms

  const paddedSeconds = seconds.toString().padStart(2, "0");
  const paddedMillis = milliseconds.toString().padStart(2, "0");

  return `${minutes}:${paddedSeconds}.${paddedMillis}`;
};

// Helper to format date as dd.mm.yyyy
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString; // fallback if invalid
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateFromString(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
