import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SAFE_KEY = /^[a-f0-9]{64}$/;

function cacheError() {
  return Object.assign(new Error("无法安全读写本地私有主题缓存。"), { code: "E_PRIVATE_CACHE" });
}

export function createPrivateCache({ home = os.homedir(), fsApi = fs } = {}) {
  const directory = path.join(home, "Library", "Application Support", "codextheme", "private");
  const filename = (key) => {
    if (typeof key !== "string" || !SAFE_KEY.test(key)) throw cacheError();
    return path.join(directory, `${key}.codextheme-theme`);
  };

  return {
    directory,
    filename,

    async write(serialized) {
      if (typeof serialized !== "string" || !serialized) throw cacheError();
      const key = createHash("sha256").update(serialized).digest("hex");
      const target = filename(key);
      await fsApi.mkdir(directory, { recursive: true, mode: 0o700 });
      await fsApi.chmod(directory, 0o700);
      try {
        const existing = await fsApi.readFile(target, "utf8");
        if (createHash("sha256").update(existing).digest("hex") !== key) throw cacheError();
        return key;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error?.code === "E_PRIVATE_CACHE" ? error : cacheError();
      }

      const temporary = path.join(directory, `.private.${process.pid}.${Date.now()}.tmp`);
      try {
        await fsApi.writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
        await fsApi.rename(temporary, target);
        await fsApi.chmod(target, 0o600);
        return key;
      } catch {
        await fsApi.rm(temporary, { force: true }).catch(() => {});
        throw cacheError();
      }
    },

    async read(key) {
      let serialized;
      try {
        serialized = await fsApi.readFile(filename(key), "utf8");
      } catch {
        throw cacheError();
      }
      if (createHash("sha256").update(serialized).digest("hex") !== key) throw cacheError();
      return serialized;
    },

    async remove(key) {
      try {
        await fsApi.rm(filename(key), { force: true });
      } catch {
        throw cacheError();
      }
    },
  };
}
