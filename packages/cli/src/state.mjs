import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SAFE_CACHE_KEY = /^[a-f0-9]{64}$/;

function invalidState() {
  return Object.assign(new Error("Invalid CodexTheme state."), { code: "E_USAGE" });
}

function cleanState(value) {
  if (typeof value?.appliedAt !== "string" || !value.appliedAt) throw invalidState();

  if (value.schemaVersion === 1) {
    if (typeof value.themeSlug !== "string" || !value.themeSlug) throw invalidState();
    return {
      schemaVersion: 1,
      themeSlug: value.themeSlug,
      appliedAt: value.appliedAt,
    };
  }

  if (value.schemaVersion === 2 && value.source === "catalog") {
    if (typeof value.themeSlug !== "string" || !value.themeSlug) throw invalidState();
    return {
      schemaVersion: 2,
      source: "catalog",
      themeSlug: value.themeSlug,
      appliedAt: value.appliedAt,
    };
  }

  if (value.schemaVersion === 2 && value.source === "private") {
    if (typeof value.cacheKey !== "string" || !SAFE_CACHE_KEY.test(value.cacheKey)) throw invalidState();
    return {
      schemaVersion: 2,
      source: "private",
      cacheKey: value.cacheKey,
      appliedAt: value.appliedAt,
    };
  }

  throw invalidState();
}

export function createStateStore({ home = os.homedir(), fsApi = fs } = {}) {
  const directory = path.join(home, "Library", "Application Support", "codextheme");
  const filename = path.join(directory, "state.json");

  return {
    filename,
    async read() {
      try {
        return cleanState(JSON.parse(await fsApi.readFile(filename, "utf8")));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async write(value) {
      const state = cleanState(value);
      await fsApi.mkdir(directory, { recursive: true, mode: 0o700 });
      const temporary = path.join(directory, `.state.${process.pid}.${Date.now()}.tmp`);
      try {
        await fsApi.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
        await fsApi.rename(temporary, filename);
        await fsApi.chmod(filename, 0o600);
      } catch (error) {
        await fsApi.rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
    },
    async remove() {
      await fsApi.rm(filename, { force: true });
    },
  };
}
