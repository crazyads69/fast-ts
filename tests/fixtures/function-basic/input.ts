function greet(name: string): string {
  return `Hello, ${name}!`;
}

export default {
  fetch(request: Request): Response {
    return new Response("Hello from fast-ts!");
  }
};
