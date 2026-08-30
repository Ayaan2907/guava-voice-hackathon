export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureStore } = await import("./lib/store");
    await ensureStore();
  }
}
