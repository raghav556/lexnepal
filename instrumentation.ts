export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnvironment } = await import("@/server/env");
    getServerEnvironment();
  }
}
