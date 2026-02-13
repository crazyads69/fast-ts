function classify(status: number): string {
  switch (status) {
    case 200:
      return "ok";
    case 404:
      return "not found";
    case 500:
      return "server error";
    default:
      return "unknown";
  }
}

function sumArray(nums: number[]): number {
  let total = 0;
  for (let i = 0; i < nums.length; i++) {
    total = total + nums[i];
  }
  return total;
}

function printItems(items: string[]): void {
  for (const item of items) {
    console.log(item);
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const status = 200;
    const label = classify(status);

    if (label === "ok") {
      return new Response("All good");
    } else {
      return new Response("Something went wrong");
    }
  },
};
