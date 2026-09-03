const fs = require('node:fs');
const path = require('node:path');

const FILE_NAME = 'tasksheet-db.json';
const TMP_SUFFIX = '.tmp';
const BACKUP_SUFFIX = '.bak';

function paths(userDataDir) {
  const file = path.join(userDataDir, FILE_NAME);
  return { file, tmp: file + TMP_SUFFIX, backup: file + BACKUP_SUFFIX };
}

/**
 * Reads the persisted database file, falling back to the last known-good
 * backup copy if the primary file is missing or fails to parse (e.g. a
 * crash during a prior write left a partial file). Returns null only when
 * neither the primary file nor the backup exist — i.e. nothing has ever
 * been saved on this machine yet.
 */
function load(userDataDir) {
  const { file, backup } = paths(userDataDir);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`TaskSheet: primary database file failed to parse (${e.message}); falling back to backup copy.`);
    }
  }
  if (fs.existsSync(backup)) {
    try {
      return JSON.parse(fs.readFileSync(backup, 'utf8'));
    } catch (e) {
      console.error(`TaskSheet: backup database file also failed to parse (${e.message}).`);
    }
  }
  return null;
}

/**
 * Writes state atomically: serialize to a temp file, then rename over the
 * real file. A rename is atomic on both NTFS and the platforms Electron
 * targets, so a crash mid-write can never leave a half-written primary
 * file. The previous primary file (if any) is kept as a rolling backup
 * copy before being replaced.
 */
function save(userDataDir, state) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const { file, tmp, backup } = paths(userDataDir);
  const json = JSON.stringify(state);

  fs.writeFileSync(tmp, json, 'utf8');
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, backup);
  }
  fs.renameSync(tmp, file);
}

module.exports = { load, save };
