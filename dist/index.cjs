"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  extractKeys: () => extractKeys,
  generateSample: () => generateSample,
  parseEnv: () => parseEnv,
  sync: () => sync,
  watch: () => watch
});
module.exports = __toCommonJS(src_exports);

// src/syncer.ts
var import_promises = require("fs/promises");

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
  const envContent = await (0, import_promises.readFile)(input, "utf8");
  const parsedLines = parseEnv(envContent);
  const newKeys = extractKeys(parsedLines);
  let oldKeys = [];
  try {
    const existingContent = await (0, import_promises.readFile)(output, "utf8");
    oldKeys = extractKeys(parseEnv(existingContent));
  } catch {
  }
  const newKeySet = new Set(newKeys);
  const oldKeySet = new Set(oldKeys);
  const keysAdded = newKeys.filter((k) => !oldKeySet.has(k));
  const keysRemoved = oldKeys.filter((k) => !newKeySet.has(k));
  const sampleContent = generateSample(parsedLines, placeholder);
  await (0, import_promises.writeFile)(output, sampleContent, "utf8");
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
var import_chokidar = __toESM(require("chokidar"), 1);
function watch(options) {
  const { input, silent } = options;
  sync(options).catch((err) => {
    console.error(`[env-sentry] Initial sync failed: ${err.message}`);
  });
  const watcher = import_chokidar.default.watch(input, {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractKeys,
  generateSample,
  parseEnv,
  sync,
  watch
});
//# sourceMappingURL=index.cjs.map