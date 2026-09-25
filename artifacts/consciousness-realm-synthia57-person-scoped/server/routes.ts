import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { synthiaResidents } from "./synthiaResident";

function requirePersonId(req: Request) {
  const bodyId = req.body?.personId;
  const headerId = req.header("x-synthia-person-id");
  const queryId = req.query.personId;
  const personId = String(bodyId ?? headerId ?? queryId ?? "").trim();
  if (!personId) {
    const error = new Error("personId is required so Synthia and the Realm remain isolated per person");
    (error as any).status = 400;
    throw error;
  }
  return personId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Existing storage remains available. Synthia is added as an external resident
  // through her own replaceable PracticeWorldPort boundary. Every person receives
  // an isolated FederatedSynthia runtime + persistence lane; no morph state is shared.

  app.get("/api/synthia/status", async (req, res, next) => {
    try {
      res.json(await synthiaResidents.forPerson(requirePersonId(req)).status());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/synthia/inhabit", async (req, res, next) => {
    try {
      const resident = synthiaResidents.forPerson(requirePersonId(req));
      res.json(await resident.inhabit(req.body?.snapshot ?? req.body ?? {}));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/synthia/morph", async (req, res, next) => {
    try {
      const resident = synthiaResidents.forPerson(requirePersonId(req));
      const message = String(req.body?.message ?? "Experience the current world state.");
      const snapshot = req.body?.snapshot ?? {};
      res.json(await resident.morph(message, snapshot));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/synthia/world/observe", async (req, res, next) => {
    try {
      const resident = synthiaResidents.forPerson(requirePersonId(req));
      res.json(await resident.observe(req.body?.event ?? req.body ?? {}, req.body?.snapshot));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/synthia/world/act", async (req, res, next) => {
    try {
      const resident = synthiaResidents.forPerson(requirePersonId(req));
      res.json(await resident.act(req.body?.action ?? req.body ?? {}));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/synthia/world/actions", async (req, res, next) => {
    try {
      const resident = synthiaResidents.forPerson(requirePersonId(req));
      const after = Number(req.query.after ?? 0);
      res.json(await resident.actions(Number.isFinite(after) ? after : 0));
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
