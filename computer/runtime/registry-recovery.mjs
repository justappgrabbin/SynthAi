/**
 * Recover Computer artifact and mount registries from the existing StateStore.
 * Recovery is a projection: it never deletes or overwrites source records.
 */
export async function restoreArtifactAndMountRegistries(runtime) {
  const { state, vfs, artifacts, apps, shells, shellManager, bus } = runtime;
  const summary = { artifacts: 0, legacyArtifacts: 0, mounts: 0, skipped: [] };
  const skip = (kind, id, reason) => {
    const detail = { kind, id, reason };
    summary.skipped.push(detail);
    bus?.emit('computer:registry-recovery-skipped', detail);
  };

  const saved = state.get('artifacts.items', {});
  for (const [id, record] of Object.entries(saved && typeof saved === 'object' ? saved : {})) {
    if (!record || record.id !== id || typeof record.path !== 'string' ||
        !record.path.startsWith(`/artifacts/${id}/`) || !vfs.read(record.path)) {
      skip('artifact', id, 'invalid record or missing preserved VFS bytes');
      continue;
    }
    if (!artifacts.has(id)) artifacts.register(id, { ...record });
    summary.artifacts++;
  }

  // Older versions stored VFS bytes but kept artifact metadata only in RAM.
  for (const record of vfs.list('/artifacts/')) {
    const match = /^\/artifacts\/(artifact-[^/]+)\/(.+)$/.exec(record.path ?? '');
    if (!match || artifacts.has(match[1])) continue;
    const [, id] = match;
    const meta = record.meta ?? {};
    if (!meta.originalName) {
      skip('legacy-artifact', id, 'no originalName provenance');
      continue;
    }
    const recovered = {
      id, name: meta.originalName, path: record.path,
      type: meta.type ?? 'text/plain', source: meta.source ?? 'unknown',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      status: 'ingested', createdAt: record.updatedAt ?? null,
      recoveredFrom: 'legacy-vfs'
    };
    artifacts.register(id, recovered);
    await state.set(`artifacts.items.${id}`, recovered, { source: 'registry-recovery' });
    summary.legacyArtifacts++;
  }

  const mounts = state.get('mounts', {});
  for (const [mountId, mount] of Object.entries(mounts && typeof mounts === 'object' ? mounts : {})) {
    if (!mount || mount.mountId !== mountId || typeof mount.appId !== 'string' || !mount.appId ||
        !artifacts.has(mount.artifactId) || !shells.has(mount.shell)) {
      skip('mount', mountId, 'invalid mount, artifact missing, or shell unavailable');
      continue;
    }
    if (!apps.has(mount.appId)) {
      apps.register(mount.appId, { kind: 'artifact-app', artifactId: mount.artifactId });
    }
    shellManager.mounted.set(mountId, structuredClone(mount));
    bus?.emit('app:restored', { ...mount });
    summary.mounts++;
  }
  bus?.emit('computer:registry-recovered', summary);
  return summary;
}
