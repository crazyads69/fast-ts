export default {
  async fetch(request: Request): Promise<Response> {
    const url = request.url;
    const method = request.method;

    if (method === "GET") {
      return new Response("Hello from " + url);
    }

    if (method === "POST") {
      return new Response("Posted", { status: 201 });
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
