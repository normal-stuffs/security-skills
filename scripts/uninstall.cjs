#!/usr/bin/env node
/**
 * preuninstall — removes only the skills this package installed,
 * using the manifest written by postinstall. User-authored skills
 * are never touched.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PKG_ROOT = path.resolve(__dirname, "..");
const MANIFEST = ".security-skills-manifest.json";

function uninstall() {
  const dirs = [
    path.join(os.homedir(), ".claude", "skills"),
    path.join(os.homedir(), ".omp", "agent", "skills"),
  ];
  const isGlobal = process.env.npm_config_global === "true";
  const initCwd = process.env.INIT_CWD;
  if (!isGlobal && initCwd && path.resolve(initCwd) !== PKG_ROOT) {
    dirs.push(path.join(initCwd, ".claude", "skills"));
  }
  // Also clean project targets recorded in home manifests at install time.
  for (const homeDir of dirs.slice(0, 2)) {
    try {
      const { extraTargets } = JSON.parse(
        fs.readFileSync(path.join(homeDir, MANIFEST), "utf-8")
      );
      if (Array.isArray(extraTargets)) dirs.push(...extraTargets);
    } catch { /* no manifest in this home dir */ }
  }
  for (const target of new Set(dirs)) {
    const manifestPath = path.join(target, MANIFEST);
    try {
      const { skills } = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      for (const name of skills) {
        fs.rmSync(path.join(target, name), { recursive: true, force: true });
      }
      fs.rmSync(manifestPath, { force: true });
      console.log(`[security-skills] removed ${skills.length} skill(s) from ${target}`);
    } catch {
      // No manifest — package was never installed into this target.
    }
  }
}

uninstall();
