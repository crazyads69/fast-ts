const port: number = 8080;
const host = "localhost";
let count = 0;

export default {
  fetch(request: Request): Response {
    return new Response("Hello from fast-ts!");
  }
};
