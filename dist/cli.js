#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";

// src/syncer.ts
import { readFile, writeFile } from "fs/promises";

// src/parser.ts
var ASSIGNMENT_RE = /^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;
function detectQuote(value) {
  if (value.startsWith('"')) return '"';
  if (value.startsWith("'")) return "'";
  return "";
}
function parseEnv(content) {
  const rawLines = content.split("\n");
  const lines = [];
  let inContinuation = false;
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trimEnd();
    if (i === rawLines.length - 1 && raw === "") continue;
    if (inContinuation) {
      const continues = raw.endsWith("\\");
      lines.push({ type: "continuation", raw });
      inContinuation = continues;
      continue;
    }
    if (raw.trim() === "") {
      lines.push({ type: "blank", raw });
      continue;
    }
    if (raw.trimStart().startsWith("#")) {
      lines.push({ type: "comment", raw });
      continue;
    }
    const match = ASSIGNMENT_RE.exec(raw);
    if (match) {
      const hasExport = Boolean(match[1]);
      const key = match[2];
      const value = match[3];
      const continues = value.endsWith("\\");
      const quote = detectQuote(value);
      const line = {
        type: "assignment",
        raw,
        export: hasExport,
        key,
        value,
        quote,
        continues
      };
      lines.push(line);
      inContinuation = continues;
      continue;
    }
    lines.push({ type: "comment", raw });
  }
  return lines;
}
function extractKeys(lines) {
  return lines.filter((l) => l.type === "assignment").map((l) => l.key);
}

// src/generator.ts
function emptyValue(line, placeholder) {
  if (placeholder !== "") return placeholder;
  if (line.quote === '"') return '""';
  if (line.quote === "'") return "''";
  return "";
}
function generateSample(lines, placeholder = "") {
  const outputLines = [];
  for (const line of lines) {
    switch (line.type) {
      case "blank":
      case "comment":
        outputLines.push(line.raw);
        break;
      case "assignment": {
        const prefix = line.export ? "export " : "";
        const val = emptyValue(line, placeholder);
        outputLines.push(`${prefix}${line.key}=${val}`);
        break;
      }
      case "continuation":
        break;
    }
  }
  return outputLines.join("\n") + "\n";
}

// src/syncer.ts
async function sync(options) {
  const { input, output, placeholder, silent } = options;
  const envContent = await readFile(input, "utf8");
  const parsedLines = parseEnv(envContent);
  const newKeys = extractKeys(parsedLines);
  let oldKeys = [];
  try {
    const existingContent = await readFile(output, "utf8");
    oldKeys = extractKeys(parseEnv(existingContent));
  } catch {
  }
  const newKeySet = new Set(newKeys);
  const oldKeySet = new Set(oldKeys);
  const keysAdded = newKeys.filter((k) => !oldKeySet.has(k));
  const keysRemoved = oldKeys.filter((k) => !newKeySet.has(k));
  const sampleContent = generateSample(parsedLines, placeholder);
  await writeFile(output, sampleContent, "utf8");
  const result = {
    keysAdded,
    keysRemoved,
    timestamp: /* @__PURE__ */ new Date(),
    outputPath: output
  };
  if (!silent) {
    logResult(result, input);
  }
  return result;
}
function logResult(result, input) {
  const ts = result.timestamp.toISOString();
  console.log(`[env-sentry] ${ts} synced ${input} \u2192 ${result.outputPath}`);
  if (result.keysAdded.length > 0) {
    console.log(`  + added:   ${result.keysAdded.join(", ")}`);
  }
  if (result.keysRemoved.length > 0) {
    console.log(`  - removed: ${result.keysRemoved.join(", ")}`);
  }
}

// src/watcher.ts
import chokidar from "chokidar";
function watch(options) {
  const { input, silent } = options;
  sync(options).catch((err) => {
    console.error(`[env-sentry] Initial sync failed: ${err.message}`);
  });
  const watcher = chokidar.watch(input, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  watcher.on("change", () => {
    sync(options).catch((err) => {
      console.error(`[env-sentry] Sync error: ${err.message}`);
    });
  });
  watcher.on("unlink", () => {
    if (!silent) {
      console.warn(`[env-sentry] Warning: ${input} was deleted. Watching for recreation...`);
    }
  });
  watcher.on("add", (path) => {
    if (path === input || path.endsWith(input)) {
      sync(options).catch((err) => {
        console.error(`[env-sentry] Sync error after re-add: ${err.message}`);
      });
    }
  });
  watcher.on("error", (err) => {
    console.error(`[env-sentry] Watcher error: ${err.message}`);
  });
  return () => {
    watcher.close().catch(() => {
    });
  };
}

// src/cli.ts
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
var __dirname = dirname(fileURLToPath(import.meta.url));
var pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf8")
);
var program = new Command();
program.name("env-sentry").description("Keep .env.sample in sync with .env automatically").version(pkg.version).option("-i, --input <path>", "Source .env file", ".env").option("-o, --output <path>", "Output .env.sample file", ".env.sample").option("-p, --placeholder <str>", "Value placeholder (replaces all values)", "").option("-w, --watch", "Watch mode \u2014 stay alive and re-sync on changes").option("-s, --silent", "Suppress output").action(async (opts) => {
  const options = {
    input: opts.input,
    output: opts.output,
    placeholder: opts.placeholder,
    watch: opts.watch ?? false,
    silent: opts.silent ?? false
  };
  if (options.watch) {
    const stop = watch(options);
    const shutdown = () => {
      if (!options.silent) console.log("\n[env-sentry] Shutting down...");
      stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    try {
      await sync(options);
    } catch (err) {
      console.error(`[env-sentry] Error: ${err.message}`);
      process.exit(1);
    }
  }
});
program.parse(process.argv);
