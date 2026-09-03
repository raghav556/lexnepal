import { getServerEnvironment } from "../../src/server/env";
import { ClamAvScanner } from "../../src/server/storage/document-scanner";
import { EICAR_TEST_FILE_BYTES } from "../../tests/fixtures/eicar";

const environment = getServerEnvironment();
if (!environment.CLAMAV_HOST) {
  throw new Error("CLAMAV_HOST is not configured; skipping ClamAV verification is expected.");
}
const scanner = new ClamAvScanner(environment.CLAMAV_HOST, environment.CLAMAV_PORT);
const clean = new TextEncoder().encode("LexNepal clean antivirus verification file");
const eicar = EICAR_TEST_FILE_BYTES;

const cleanResult = await scanner.scan(clean);
const infectedResult = await scanner.scan(eicar);
if (cleanResult.verdict !== "clean") throw new Error("ClamAV rejected the clean fixture");
if (infectedResult.verdict !== "infected") {
  throw new Error("ClamAV failed to detect the EICAR fixture");
}

process.stdout.write(
  `${JSON.stringify({ clean: cleanResult.verdict, eicar: infectedResult.verdict, provider: cleanResult.provider })}\n`,
);
