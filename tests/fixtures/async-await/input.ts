async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = request.url;
    const data = await fetchData(url);
    return new Response(data);
  },
};
