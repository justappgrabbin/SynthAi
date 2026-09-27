import { GraphRuntime } from "./GraphRuntime.js";
import { InMemoryPrecedentMesh } from "./AnticipatoryMeshMemory.js";
function assert(c, m) {
  if (!c) throw new Error(m);
}
(async () => {
  const now = 1e6;
  const p = { precedentId: "precedent_61_24_runtime", triggerAddresses: [{ gate: 61, line: 1, color: 2, tone: 3, base: 4 }, { gate: 24, line: 2, color: 2, tone: 3, base: 4 }], channelId: "24-61", circuit: "Knowing", capabilityPath: ["24-61"], outcome: "SUCCESS", responseClass: "EXISTING_PATH", confidence: 0.9, evidenceCount: 9 };
  const mesh = new InMemoryPrecedentMesh().seed(p);
  const runtime = new GraphRuntime().setPrecedentMesh(mesh);
  const preload = await runtime.prepareForwardHorizon({ startAt: now, endAt: now + 864e5, preparedAt: now, candidates: [{ candidateId: "reachable-61-24", activatesAt: now + 1e3, expiresAt: now + 864e5, activeAddresses: p.triggerAddresses, privateCoordinates: [{ degree: 12, minute: 34, second: 56, arc: 78, zodiac: "LOCAL_ONLY", house: 5 }] }] });
  assert(preload.cachedPrecedents === 1, "preload failed");
  const session = await runtime.ingest({ intentId: "offline-session", description: "local task", side: "FIVE_SIDE", seed: 42n });
  mesh.setReachable(false);
  const recalled = runtime.activatePreloadedPrecedents(session.sessionId, { triggerId: "private-fine-state-fired", occurredAt: now + 2e3, activeAddresses: p.triggerAddresses, privateCoordinates: [{ degree: 200, minute: 1, second: 1, arc: 2, zodiac: "STILL_LOCAL", house: 9 }] });
  assert(recalled.length === 1, "offline runtime recall failed");
  const step = await runtime.step(session.sessionId);
  assert(step.messagesProcessed >= 1, "precedent did not enter message flow");
  const artifact = await runtime.materialize(session.sessionId, "DOCUMENT");
  const f = artifact.files.find((x) => x.path === "synthia/anticipatory-memory.json");
  assert(f, "missing anticipatory artifact file");
  for (const v of ["LOCAL_ONLY", "STILL_LOCAL", "degree", "minute", "second", "arc", "zodiac", "house"]) assert(!f.content.includes(v), `artifact leaked ${v}`);
  assert(f.content.includes("precedent_61_24_runtime"), "cache not retained");
  console.log(JSON.stringify({ pass: true, preload: preload.cachedPrecedents, recallWithMeshDisconnected: recalled.length, runtimeMessagesProcessed: step.messagesProcessed, artifactCarriesSanitizedCache: true }));
})().catch((e) => {
  console.error(e);
  throw e;
});
