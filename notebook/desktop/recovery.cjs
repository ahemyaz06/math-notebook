const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

async function retrySharingViolation(operation) {
  // Windows can briefly refuse a replacement while another process is reading the file.
  for (let wait = 10; ; wait *= 2) {
    try { return await operation(); }
    catch (error) {
      if (wait > 320 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      await delay(wait + Math.floor(Math.random() * 10));
    }
  }
}

// Write and flush a sibling first. A failed write or replacement leaves the old file readable.
async function writeAtomic(file, content) {
  const temp = path.join(path.dirname(file), `.mathnb-${process.pid}-${randomUUID()}.tmp`);
  const handle = await fs.promises.open(temp, 'wx', 0o600);
  try {
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retrySharingViolation(() => fs.promises.rename(temp, file));
  } finally {
    await fs.promises.rm(temp, { force: true });
  }
}

const draftId = /^(\d+)-[a-f0-9-]{36}$/;
const caretClass = /^recovery-caret-[a-f0-9-]{36}$/;
const tempName = /^\.mathnb-(\d+)-[a-f0-9-]{36}\.tmp$/;
function ownerIsRunning(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== 'ESRCH'; }
}

function createRecoveryStore(folder) {
  const id = `${process.pid}-${randomUUID()}`;
  const filename = (key) => path.join(folder, `${key}.json`);
  const current = filename(id);
  let pending = Promise.resolve();
  function ordered(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }

  function available(key) {
    const match = typeof key === 'string' && draftId.exec(key);
    return match && (key === id || !ownerIsRunning(Number(match[1])));
  }

  function read(key) {
    const file = filename(key);
    // Only regular files in the recovery directory are candidates.
    if (!fs.lstatSync(file).isFile()) throw new Error('This recovery draft is not a regular file.');
    const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
    const notebook = JSON.parse(draft.content);
    if (notebook.format !== 'math-notebook' || typeof notebook.html !== 'string' ||
        (notebook.graphs != null && (typeof notebook.graphs !== 'object' || Array.isArray(notebook.graphs))) ||
        typeof draft.name !== 'string' || !Number.isFinite(draft.updated) ||
        (draft.caret != null && !caretClass.test(draft.caret))) {
      throw new Error('This recovery draft could not be read.');
    }
    return draft;
  }

  return {
    write: ({ name, content, caret }) => ordered(async () => {
      await fs.promises.mkdir(folder, { recursive: true });
      await writeAtomic(current, JSON.stringify({ name, content, caret, updated: Date.now() }));
    }),
    clear: () => ordered(() => retrySharingViolation(() => fs.promises.rm(current, { force: true }))),
    list: () => ordered(() => {
      let entries;
      try { entries = fs.readdirSync(folder, { withFileTypes: true }); }
      catch (error) {
        if (error.code === 'ENOENT') return { drafts: [], unreadable: 0 };
        throw error;
      }
      const drafts = [];
      let unreadable = 0;
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const abandoned = tempName.exec(entry.name);
        if (abandoned && !ownerIsRunning(Number(abandoned[1]))) {
          try { fs.rmSync(path.join(folder, entry.name), { force: true }); }
          catch { /* retry on a later launch */ }
        }
        if (!entry.name.endsWith('.json')) continue;
        const key = entry.name.slice(0, -5);
        if (!available(key)) continue;
        try {
          const { name, updated } = read(key);
          drafts.push({ id: key, name, updated });
        } catch (error) {
          if (error.code !== 'ENOENT') unreadable += 1;
        }
      }
      return { drafts: drafts.sort((a, b) => b.updated - a.updated), unreadable };
    }),
    take: (key) => ordered(async () => {
      if (!available(key)) throw new Error('This draft is in use or is no longer available.');
      const draft = read(key);
      if (key !== id) {
        if (fs.existsSync(current)) throw new Error('Save or discard your current draft before recovering another one.');
        // Claim the draft in one operation. If this app stops before it opens the document,
        // the same draft is available again on the next launch.
        await retrySharingViolation(() => fs.promises.rename(filename(key), current));
      }
      return { content: draft.content, caret: draft.caret };
    }),
    discard: (key) => ordered(() => {
      if (!available(key)) throw new Error('This draft is in use or is no longer available.');
      return retrySharingViolation(() => fs.promises.rm(filename(key), { force: true }));
    }),
  };
}

module.exports = { createRecoveryStore, writeAtomic };
