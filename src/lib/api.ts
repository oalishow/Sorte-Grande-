export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let resource = input.toString();
  if (resource.startsWith('/api/')) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && !window.location.hostname.includes('run.app')) {
      resource = 'https://ais-pre-4jhjpezsbvi4kylf2bocxs-51066803168.us-east1.run.app' + resource;
    }
  }
  return fetch(resource, init);
}
