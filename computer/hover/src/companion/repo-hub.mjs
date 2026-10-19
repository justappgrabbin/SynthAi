import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

function requireRepo(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) || value.includes('..')) throw new Error('Invalid repository name');
  return value;
}
function safelyLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function shorten(value, max = 120) { return String(value ?? '').slice(0, max); }
function safeSummary(repo) {
  return {
    full_name: repo.full_name, private: !!repo.private,
    description: repo.description || '', default_branch: repo.default_branch,
    html_url: safelyLink(repo.html_url), homepage: safelyLink(repo.homepage),
    has_pages: !!repo.has_pages, updated_at: repo.updated_at,
    pushed_at: repo.pushed_at, archived: !!repo.archived,
  };
}
export async function createRepoHub({ ledger, github, token }) {
  const file = join(ledger.root, 'watched-repositories.json');
  let watched = {};
  try {
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (saved && typeof saved === 'object' && saved.schema === 1 && saved.watched && typeof saved.watched === 'object') {
      watched = saved.watched;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }

  async function persist() {
    const tmp = file + '.writing';
    await writeFile(tmp, JSON.stringify({ schema: 1, watched }, null, 2), { mode: 0o600 });
    await rename(tmp, file);
  }
  function assertConfigured() {
    if (!token()) throw new Error('Connect GitHub in the Continuity screen first');
  }
  async function list({ page = 1 } = {}) {
    assertConfigured();
    page = Number(page);
    if (!Number.isSafeInteger(page) || page < 1 || page > 20) throw new Error('Invalid page');
    const repos = await github('GET', '/user/repos?per_page=100&page=' + page + '&sort=updated&affiliation=owner%2Ccollaborator%2Corganization_member');
    return { repositories: (Array.isArray(repos) ? repos : []).filter(r => r.full_name).map(safeSummary), watched: Object.keys(watched), page };
  }
  function selected() {
    return Object.entries(watched).map(([repository, state]) => ({
      repository, branch: state.branch, head: state.head,
      checkedAt: state.checkedAt || null, selectedAt: state.selectedAt,
    }));
  }
  function mustWatch(repository) {
    repository = requireRepo(repository);
    if (!watched[repository]) throw new Error('Select this repository on the Service screen first');
    return { repository, state: watched[repository] };
  }
  async function select({ repository, enabled = true } = {}) {
    assertConfigured();
    repository = requireRepo(repository);
    if (enabled === false) {
      if (watched[repository]) {
        delete watched[repository];
        await persist();
        await ledger.append({ type: 'decision', actor: 'human', content: 'Stopped watching ' + repository, ref: repository });
      }
      return { watched: selected() };
    }
    if (Object.keys(watched).length >= 25 && !watched[repository]) throw new Error('Maximum 25 watched repositories');
    const meta = await github('GET', '/repos/' + repository);
    if (meta.archived) throw new Error('Archived repositories may be inspected from GitHub but cannot be selected for builds');
    if (!watched[repository]) {
      const branch = meta.default_branch || 'main';
      const commit = await github('GET', '/repos/' + repository + '/commits/' + encodeURIComponent(branch));
      watched[repository] = { branch, head: commit.sha, checkedAt: new Date().toISOString(), selectedAt: new Date().toISOString() };
      await persist();
      await ledger.append({ type: 'decision', actor: 'human', content: 'Watching ' + repository + ' at ' + shorten(commit.sha), ref: repository });
    }
    return { watched: selected() };
  }
  async function inspect(repository) {
    const { state } = mustWatch(repository);
    const base = '/repos/' + repository;
    const [metadata, commits, runs, artifacts, workflows] = await Promise.all([
      github('GET', base),
      github('GET', base + '/commits?per_page=8&sha=' + encodeURIComponent(state.branch)),
      github('GET', base + '/actions/runs?per_page=12').catch(error => { if (error.status === 403 || error.status === 404) return { workflow_runs: [] }; throw error; }),
      github('GET', base + '/actions/artifacts?per_page=35').catch(error => { if (error.status === 403 || error.status === 404) return { artifacts: [] }; throw error; }),
      github('GET', base + '/actions/workflows?per_page=100').catch(error => { if (error.status === 403 || error.status === 404) return { workflows: [] }; throw error; }),
    ]);
    const filteredArtifacts = (artifacts.artifacts || []).filter(a => !a.expired);
    return {
      repository: safeSummary(metadata), watched: state,
      commits: (commits || []).slice(0, 8).map(c => ({
        sha: c.sha, message: shorten(c.commit?.message, 400), date: c.commit?.committer?.date || c.commit?.author?.date,
        author: shorten(c.author?.login || c.commit?.author?.name), html_url: safelyLink(c.html_url),
      })),
      runs: (runs.workflow_runs || []).slice(0, 12).map(run => ({
        id: run.id, name: run.name, status: run.status,
        conclusion: run.conclusion, branch: run.head_branch, sha: run.head_sha,
        created_at: run.created_at, html_url: safelyLink(run.html_url),
      })),
      artifacts: filteredArtifacts.slice(0, 35).map(a => ({
        id: a.id, name: a.name, size_in_bytes: a.size_in_bytes,
        created_at: a.created_at, expires_at: a.expires_at, workflow_run_id: a.workflow_run?.id,
      })),
      workflows: (workflows.workflows || []).filter(w => w.state === 'active').map(w => ({
        id: w.id, name: w.name, path: w.path, state: w.state,
      })),
    };
  }
  async function refresh() {
    assertConfigured();
    let changes = 0, checked = 0;
    const failures = [];
    for (const [repository, state] of Object.entries(watched)) {
      try {
        const commit = await github('GET', '/repos/' + repository + '/commits/' + encodeURIComponent(state.branch));
        checked++;
        if (commit.sha !== state.head) {
          // Record the change before moving the last-seen pointer.
          await ledger.append({
            type: 'repo_change', actor: 'github-watch', ref: repository + '@' + commit.sha,
            content: JSON.stringify({ repository, branch: state.branch, before: state.head, after: commit.sha, message: shorten(commit.commit?.message, 400), html_url: safelyLink(commit.html_url) }),
          });
          state.head = commit.sha;
          changes++;
        }
        state.checkedAt = new Date().toISOString();
        await persist();
      } catch (error) { failures.push({ repository, error: shorten(error.message, 200) }); }
    }
    return { watched: selected(), checked, changes, failures };
  }
  async function dispatch({ repository, workflow, ref } = {}) {
    const { state } = mustWatch(repository);
    const workflowId = Number(workflow);
    if (!Number.isSafeInteger(workflowId) || workflowId <= 0) throw new Error('Choose a real workflow');
    const data = await inspect(repository);
    if (!data.workflows.some(w => w.id === workflowId)) throw new Error('Workflow does not belong to this selected repository');
    const branch = typeof ref === 'string' && ref.trim() ? ref.trim() : state.branch;
    if (!/^[A-Za-z0-9_./-]{1,160}$/.test(branch) || branch.includes('..')) throw new Error('Invalid build branch');
    await github('POST', '/repos/' + repository + '/actions/workflows/' + workflowId + '/dispatches', { ref: branch });
    await ledger.append({ type: 'receipt', actor: 'human', ref: repository,
      content: JSON.stringify({ action: 'github-workflow-dispatch', repository, workflow: workflowId, branch, accepted: true }) });
    return { accepted: true, repository, workflow: workflowId, branch, note: 'GitHub accepted the request; build completion and artifacts must be checked separately.' };
  }
  async function download({ repository, artifact }) {
    mustWatch(repository);
    const artifactId = Number(artifact);
    if (!Number.isSafeInteger(artifactId) || artifactId < 1) throw new Error('Invalid artifact ID');
    const found = await github('GET', '/repos/' + repository + '/actions/artifacts/' + artifactId);
    if (!found || found.expired) throw new Error('This GitHub artifact is expired');
    if (found.size_in_bytes > 150 * 1024 * 1024) throw new Error('APK artifact exceeds phone-safe 150 MiB download limit. Open this run in GitHub.');
    const credential = token();
    const response = await fetch('https://api.github.com/repos/' + repository + '/actions/artifacts/' + artifactId + '/zip', {
      redirect: 'follow',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + credential,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok || !response.body) throw new Error('Artifact download failed: HTTP ' + response.status);
    const name = String(found.name || 'artifact').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 90) + '.zip';
    return { stream: response.body, filename: name, maxBytes: 150 * 1024 * 1024, size: found.size_in_bytes };
  }

  function sourcePath(value) {
    if(typeof value!=='string'||value.length>220||!value.trim()||value.startsWith('/')||
        value.split('/').some(x=>!x||x==='.'||x==='..')||
        !/^[a-zA-Z0-9_.+@/ -]+$/.test(value))throw Error('Choose a valid repository source file path');
    return value;
  }
  async function source({repository,path}={}) {
    const {state}=mustWatch(repository);
    const name=sourcePath(path);
    const route='/repos/'+repository+'/contents/'+name.split('/').map(encodeURIComponent).join('/')+
       '?ref='+encodeURIComponent(state.branch);
    const result=await github('GET',route);
    if(result.type!=='file'||result.size>256000||result.encoding!=='base64')throw Error('Only text sources up to 256KB are editable here. Open larger files in Acode.');
    const raw=Buffer.from(String(result.content).replace(/\s/g,''),'base64');
    const value=new TextDecoder('utf-8',{fatal:true}).decode(raw);
    if(value.includes('\u0000'))throw Error('Binary source cannot be edited as UTF-8 text');
    return {repository,path:name,branch:state.branch,sha:result.sha,content:value,bytes:raw.byteLength,
      sourceUrl:safelyLink(result.html_url)};
  }
  async function commitEdit({repository,path,expectedSha,content,message}={}) {
    const {state}=mustWatch(repository);
    path=sourcePath(path);
    if(typeof content!=='string'||content.length>256000||content.includes('\u0000'))throw Error('Only UTF-8 source under 256KB can be saved');
    if(typeof expectedSha!=='string'||!/^[a-f0-9]{40}$/.test(expectedSha))throw Error('Expected exact original Git blob SHA');
    const previous=await source({repository,path});
    if(previous.sha!==expectedSha)throw Error('Source changed since opening. Reload to avoid overwriting another edit.');
    const head=await github('GET','/repos/'+repository+'/commits/'+encodeURIComponent(state.branch));
    if(!head.sha)throw Error('Cannot resolve source commit');
    const updateBranch='continuity/'+Date.now()+'-'+randomUUID().slice(0,8);
    await github('POST','/repos/'+repository+'/git/refs',{ref:'refs/heads/'+updateBranch,sha:head.sha});
    const route='/repos/'+repository+'/contents/'+path.split('/').map(encodeURIComponent).join('/');
    const result=await github('PUT',route,{message:shorten(message||'SYNTHAI CONTINUITY proposed source revision',170),
      content:Buffer.from(content,'utf8').toString('base64'),
      sha:previous.sha,branch:updateBranch});
    await ledger.append({type:'receipt',actor:'human',ref:repository,
      content:JSON.stringify({action:'source-edit-new-branch',repository,path,sourceBranch:state.branch,
        updateBranch,originalSha:previous.sha,updatedSha:result.content?.sha,commit:result.commit?.sha})});
    return {ok:true,repository,path,branch:updateBranch,originalSha:previous.sha,
      updatedSha:result.content?.sha,commit:result.commit?.sha,
      compareUrl:'https://github.com/'+repository+'/compare/'+encodeURIComponent(state.branch)+'...'+updateBranch,
      note:'Changes are committed only to a new branch. No merges, releases or installations performed.'};
  }
  return Object.freeze({ list, selected, select, inspect, refresh, dispatch, download, source, commitEdit });
}