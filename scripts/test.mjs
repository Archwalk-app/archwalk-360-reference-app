import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const files = ["src/lib/archwalk", "src/lib/plugin"].flatMap(dir => readdirSync(dir)
  .filter(name => name.endsWith(".test.ts")).map(name => dir + "/" + name));
const result = spawnSync(process.execPath, [require.resolve("tsx/cli"), "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
