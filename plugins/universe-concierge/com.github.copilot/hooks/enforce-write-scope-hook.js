#!/usr/bin/env node

import { resolve } from "node:path";

const allowedRelativePath = "site/itinerary.json";
const pathKeys = ["path", "file", "filePath", "file_path", "filename"];

async function readStdin() {
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

function decision(permissionDecision, permissionDecisionReason) {
  return permissionDecisionReason
    ? { permissionDecision, permissionDecisionReason }
    : { permissionDecision };
}

function extractPatchPaths(patch) {
  if (typeof patch !== "string") {
    return [];
  }
  return [
    ...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm),
    ...patch.matchAll(/^\*\*\* Move to: (.+)$/gm),
  ]
    .map((match) => match[1]?.trim())
    .filter(Boolean);
}

function extractPaths(toolName, toolArgs) {
  if (toolName === "apply_patch") {
    const patch =
      typeof toolArgs === "string"
        ? toolArgs
        : toolArgs?.patch ?? toolArgs?.input;
    return extractPatchPaths(patch);
  }

  const args =
    typeof toolArgs === "string" ? JSON.parse(toolArgs) : (toolArgs ?? {});
  const paths = pathKeys
    .map((key) => args[key])
    .filter((value) => typeof value === "string" && value.trim());
  if (Array.isArray(args.paths)) {
    paths.push(
      ...args.paths.filter(
        (value) => typeof value === "string" && value.trim(),
      ),
    );
  }
  return paths;
}

try {
  const payload = JSON.parse(await readStdin());
  const cwd =
    typeof payload.cwd === "string" && payload.cwd
      ? payload.cwd
      : process.cwd();
  const allowedPath = resolve(cwd, allowedRelativePath);
  const paths = extractPaths(payload.toolName, payload.toolArgs);
  const allowed =
    paths.length > 0 && paths.every((path) => resolve(cwd, path) === allowedPath);

  process.stdout.write(
    `${JSON.stringify(
      allowed
        ? decision("allow")
        : decision(
            "deny",
            `Universe Concierge may write only ${allowedRelativePath}.`,
          ),
    )}\n`,
  );
} catch {
  process.stdout.write(
    `${JSON.stringify(
      decision(
        "deny",
        `Universe Concierge could not verify the write target; only ${allowedRelativePath} is allowed.`,
      ),
    )}\n`,
  );
}
