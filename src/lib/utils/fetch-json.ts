export async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Couldn’t load this report. Please try again.");
  return data as T;
}
