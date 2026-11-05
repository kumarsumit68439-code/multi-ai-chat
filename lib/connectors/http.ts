/** fetch with a timeout that also works in the Edge runtime. */
export async function fetchT(
  url: string,
  init: RequestInit = {},
  ms = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
