async function runLoadTest() {
  const BATCH_SIZE = 50;
  const BATCHES = 10;
  const url = "http://localhost:3001/api/v1/health";

  console.log(`Starting load test: ${BATCH_SIZE * BATCHES} requests across ${BATCHES} batches...`);

  let successCount = 0;
  let failureCount = 0;
  let totalTime = 0;

  for (let i = 0; i < BATCHES; i++) {
    const start = Date.now();
    const promises = Array.from({ length: BATCH_SIZE }).map(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch {
        failureCount++;
      }
    });

    await Promise.all(promises);
    const end = Date.now();
    totalTime += end - start;

    console.log(`Batch ${i + 1}/${BATCHES} completed in ${end - start}ms`);
  }

  console.log(`\n--- Load Test Results ---`);
  console.log(`Total Requests: ${BATCH_SIZE * BATCHES}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed/Timeouts: ${failureCount}`);
  console.log(`Average Time per Batch: ${totalTime / BATCHES}ms`);

  if (failureCount > 0) {
    console.error("\n[!] Load test failed. Server dropped requests or timed out.");
    process.exit(1);
  }
}

runLoadTest().catch(console.error);
