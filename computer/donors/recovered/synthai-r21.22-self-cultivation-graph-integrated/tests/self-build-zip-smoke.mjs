import assert from "node:assert/strict";
import { ZipProjectIngestor } from "../UPGRADES/vendor/morph-mir-system/lib/ZipProjectIngestor.js";
import { SelfBuildEngine } from "../UPGRADES/vendor/morph-mir-system/lib/SelfBuildEngine.js";

const zipBytes = Uint8Array.from(Buffer.from("UEsDBBQAAAAIAFtPFF3gk+BSJQAAACgAAAANAAAAbWF0aF91dGlscy5weUtJTVNIyS9NyknVKEvMKU3VtOJSAIKi1JLSojwFsJCCloIRFwBQSwMEFAAAAAgAW08UXYC3uq1ZAAAAhgAAAAoAAABzZXJ2aWNlLnB5TYtBDoAgDATvfUWPeuNs9C0GoUSSIgZa368RTNzbZGZDyQmTlX1ViVwxpjMXQZ91YwLwFNBZdspWaLgsK40T4LNCVVlw6Wl3r4rhszOaVreHaDnQwA9aBzdQSwECFAMUAAAACABbTxRd4JPgUiUAAAAoAAAADQAAAAAAAAAAAAAAgAEAAAAAbWF0aF91dGlscy5weVBLAQIUAxQAAAAIAFtPFF2At7qtWQAAAIYAAAAKAAAAAAAAAAAAAACAAVAAAABzZXJ2aWNlLnB5UEsFBgAAAAACAAIAcwAAANEAAAAAAA==", "base64"));
const ingestor = new ZipProjectIngestor();
const ingested = await ingestor.ingest(zipBytes, {
  archiveName: "self-test.zip",
  extensions: [".py"]
});

assert.equal(ingested.files.length, 2);
assert.equal(ingested.skipped.length, 0);
assert(ingested.files.some((file) => file.originalName === "service.py"));

const selfBuilder = new SelfBuildEngine({ zipIngestor: ingestor });
const build = await selfBuilder.rebuildArchives(
  [{ name: "self-test.zip", bytes: zipBytes }],
  { extensions: [".py"], samples: 24, temperature: 0.9 }
);

assert.equal(build.manifest.sourceOccurrences, 2);
assert.equal(build.manifest.uniqueSourceBodies, 2);
assert.equal(build.failures.length, 0);
assert.equal(build.rebuilt.length, 2);
assert.equal(build.manifest.runtime.pythonRequired, false);

const service = build.rebuilt.find((entry) =>
  entry.canonicalSource.archivePath.endsWith("service.py")
);
assert(service);
assert.equal(service.result.regenerationResult.modeUsed, "semantic_js");
assert.equal(service.result.regenerationResult.monteCarlo.reused, true);
assert(service.result.regenerationResult.code.includes("calculate"));
assert(service.result.regenerationResult.code.includes("double"));
assert(!/\bdef\s+calculate\b/.test(service.result.regenerationResult.code));

console.log("self-build zip smoke: ok");
