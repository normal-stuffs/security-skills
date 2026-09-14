#!/usr/bin/env node
/**
 * security-skills CLI — list, install, or uninstall the bundled skills.
 *
 *   security-skills list        Show skills and where they're installed
 *   security-skills install     Re-run the installer manually
 *   security-skills uninstall   Remove installed skills via manifests
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PKG_ROOT = path.resolve(__dirname, "..");
const SKILLS_SRC = path.join(PKG_ROOT, "skills");
const MANIFEST = ".security-skills-manifest.json";

const cmd = process.argv[2] || "list";

function skillNames() {
  return fs
    .readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function list() {
  const names = skillNames();
  console.log(`Bundled skills (${names.length}):`);
  for (const n of names) console.log(`  - ${n}`);
  console.log("\nInstall locations:");
  for (const dir of [
    path.join(os.homedir(), ".claude", "skills"),
    path.join(os.homedir(), ".omp", "agent", "skills"),
  ]) {
    let installed = [];
    try {
      installed = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), "utf-8")).skills;
    } catch { /* not installed */ }
    console.log(`  ${dir}: ${installed.length ? installed.join(", ") : "(not installed)"}`);
  }
}

if (cmd === "list") {
  list();
} else if (cmd === "install") {
  require("./install.js");
} else if (cmd === "uninstall") {
  require("./uninstall.js");
} else {
  console.error(`unknown command: ${cmd} (expected list|install|uninstall)`);
  process.exit(1);
}
