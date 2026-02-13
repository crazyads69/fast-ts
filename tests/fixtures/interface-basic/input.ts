interface User {
  name: string;
  age: number;
  active: boolean;
  tags?: string[];
}

export default {
  fetch(request: Request): Response {
    const user: User = {
      name: "Alice",
      age: 30,
      active: true,
      tags: ["admin", "user"]
    };
    return new Response(JSON.stringify(user));
  }
};
