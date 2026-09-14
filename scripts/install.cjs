#!/usr/bin/env node
/**
 * postinstall — copies security skills into agent skill directories.
 *
 * Targets:
 *   - ~/.claude/skills/<name>/        (Claude Code global)
 *   - ~/.omp/agent/skills/<name>/     (OMP agent global)
 *   - <project>/.claude/skills/<name>/ (project-level, local installs only)
 *
 * A manifest is written into each target so `npm uninstall` can remove
 * exactly what we installed without touching user-authored skills.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PKG_ROOT = path.resolve(__dirname, "..");
const SKILLS_SRC = path.join(PKG_ROOT, "skills");
const MANIFEST = ".security-skills-manifest.json";

function skillNames() {
  return fs
    .readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function targets() {
  const homeDirs = [
    path.join(os.homedir(), ".claude", "skills"),
    path.join(os.homedir(), ".codex", "skills"),
    path.join(os.homedir(), ".agent", "skills"),
    path.join(os.homedir(), ".omp", "agent", "skills"),
  ];
  const isGlobal = process.env.npm_config_global === "true";
  const initCwd = process.env.INIT_CWD;
  const extra =
    !isGlobal && initCwd && path.resolve(initCwd) !== PKG_ROOT
      ? [path.join(initCwd, ".claude", "skills")]
      : [];
  return { homeDirs, allDirs: [...homeDirs, ...extra], extra };
}

function install() {
  const names = skillNames();
  if (names.length === 0) {
    console.warn("[security-skills] no skills found in package — nothing to install");
    return;
  }
  const { homeDirs, allDirs, extra } = targets();
  for (const target of allDirs) {
    try {
      for (const name of names) {
        const src = path.join(SKILLS_SRC, name);
        const dst = path.join(target, name);
        fs.mkdirSync(dst, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          fs.copyFileSync(path.join(src, file), path.join(dst, file));
        }
        console.log(`[security-skills] copied ${name} -> ${dst}`);
      }
      // Home manifests record extra (project) targets so a later CLI
      // uninstall — which has no npm INIT_CWD — can still reach them.
      const manifest = { skills: names, installedAt: new Date().toISOString() };
      if (homeDirs.includes(target) && extra.length > 0) {
        manifest.extraTargets = extra;
      }
      fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
      console.log(`[security-skills] installed ${names.length} skill(s) -> ${target}`);
    } catch (err) {
      console.warn(`[security-skills] skipped ${target}: ${err.message}`);
    }
  }
}

install();
