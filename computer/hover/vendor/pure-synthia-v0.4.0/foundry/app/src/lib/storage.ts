import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Fragment, App, AssemblyJob } from '../types';

interface FoundryDB extends DBSchema {
  fragments: {
    key: string;
    value: Fragment;
    indexes: { 'by-status': string };
  };
  apps: {
    key: string;
    value: App;
  };
  jobs: {
    key: string;
    value: AssemblyJob;
  };
}

let db: IDBPDatabase<FoundryDB> | null = null;

async function getDB() {
  if (db) return db;
  
  db = await openDB<FoundryDB>('foundry', 1, {
    upgrade(db) {
      // Fragments store
      const fragmentStore = db.createObjectStore('fragments', {
        keyPath: 'id',
      });
      fragmentStore.createIndex('by-status', 'status');

      // Apps store
      db.createObjectStore('apps', {
        keyPath: 'id',
      });

      // Assembly jobs store
      db.createObjectStore('jobs', {
        keyPath: 'id',
      });
    },
  });

  return db;
}

// Fragment operations
export async function saveFragment(fragment: Fragment): Promise<void> {
  const db = await getDB();
  await db.put('fragments', fragment);
}

export async function getFragment(id: string): Promise<Fragment | undefined> {
  const db = await getDB();
  return await db.get('fragments', id);
}

export async function getAllFragments(): Promise<Fragment[]> {
  const db = await getDB();
  return await db.getAll('fragments');
}

export async function getFragmentsByStatus(status: Fragment['status']): Promise<Fragment[]> {
  const db = await getDB();
  return await db.getAllFromIndex('fragments', 'by-status', status);
}

export async function deleteFragment(id: string): Promise<void> {
  const db = await getDB();
  const fragment = await db.get('fragments', id);
  if (!fragment) return;
  fragment.status = 'archived';
  fragment.metadata = { ...fragment.metadata, quality: 'archived' };
  await db.put('fragments', fragment);
}

// App operations
export async function saveApp(app: App): Promise<void> {
  const db = await getDB();
  await db.put('apps', app);
}

export async function getApp(id: string): Promise<App | undefined> {
  const db = await getDB();
  return await db.get('apps', id);
}

export async function getAllApps(): Promise<App[]> {
  const db = await getDB();
  return await db.getAll('apps');
}

export async function deleteApp(id: string): Promise<void> {
  const db = await getDB();
  const app = await db.get('apps', id);
  if (!app) return;
  app.archived = true;
  app.archivedAt = new Date().toISOString();
  await db.put('apps', app);
}

// Job operations
export async function saveJob(job: AssemblyJob): Promise<void> {
  const db = await getDB();
  await db.put('jobs', job);
}

export async function getJob(id: string): Promise<AssemblyJob | undefined> {
  const db = await getDB();
  return await db.get('jobs', id);
}

export async function getAllJobs(): Promise<AssemblyJob[]> {
  const db = await getDB();
  return await db.getAll('jobs');
}
