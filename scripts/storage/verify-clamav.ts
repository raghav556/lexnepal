import { getServerEnvironment } from "../../src/server/env";
import { ClamAvScanner } from "../../src/server/storage/document-scanner";

const environment = getServerEnvironment();
const scanner = new ClamAvScanner(environment.CLAMAV_HOST, environment.CLAMAV_PORT);
const clean = new TextEncoder().encode("LexNepal clean antivirus verification file");
const eicar = new TextEncoder().encode(
  ["X5O!P%@AP[4\\PZX54(P^)", "7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join(""),
);

const cleanResult = await scanner.scan(clean);
const infectedResult = await scanner.scan(eicar);
if (cleanResult.verdict !== "clean") throw new Error("ClamAV rejected the clean fixture");
if (infectedResult.verdict !== "infected") {
  throw new Error("ClamAV failed to detect the EICAR fixture");
}

process.stdout.write(
  `${JSON.stringify({ clean: cleanResult.verdict, eicar: infectedResult.verdict, provider: cleanResult.provider })}\n`,
);
