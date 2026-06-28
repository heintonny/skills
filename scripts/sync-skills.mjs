#!/usr/bin/env node
// sync-skills.mjs — insource skills from public upstream repos into this plugin.
//
// Reads sources/sources.json, clones each upstream repo at its ref, copies the
// declared skills into the plugin's flat skills/ directory, and regenerates the
// attribution NOTICE, the per-source LICENSE files, and vendor.lock.json.
//
// Vendored skills are READ-ONLY mirrors: never edit them in place — they are
// overwritten on every sync. To customize one, fork it into your own skills
// area under a different name so the sync leaves it alone.
//
// Skills that vanish upstream are NOT deleted; they are marked `orphaned` in the
// lock and kept (this is how caveman / write-a-skill / zoom-out survive).
//
// Usage:
//   node scripts/sync-skills.mjs            # sync everything
//   node scripts/sync-skills.mjs --check    # report what would change, write nothing
//
// Runs with zero npm dependencies on Node 18+ (uses git on PATH).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONFIG_PATH = path.join(ROOT, "sources", "sources.json");
const LOCK_PATH = path.join(ROOT, "vendor.lock.json");
const CHECK = process.argv.includes("--check");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

// Stable content hash of a directory: sorted relpath + bytes of every file.
// `ignoreTop` drops top-level entries so the hash matches the copied result.
function hashDir(dir, ignoreTop = []) {
  const ignore = new Set(ignoreTop);
  const h = createHash("sha256");
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!rel && ignore.has(e.name)) continue; // top-level only
      const abs = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(abs, r);
      else {
        h.update(r + "\0");
        h.update(fs.readFileSync(abs));
      }
    }
  };
  walk(dir, "");
  return "sha256:" + h.digest("hex");
}

function copyDir(src, dest, ignoreTop = []) {
  const ignore = new Set(ignoreTop);
  rmrf(dest);
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (from) => {
      const rel = path.relative(src, from);
      if (rel === "") return true;
      const top = rel.split(path.sep)[0];
      return !ignore.has(top);
    },
  });
}

// Does a skill's path within skillsRoot match an exclude entry?
// "deprecated" matches "deprecated/foo"; "engineering/ask-matt" matches exactly.
function isExcluded(relWithinRoot, exclude = []) {
  return exclude.some((e) => relWithinRoot === e || relWithinRoot.startsWith(e + "/"));
}

// Enumerate the skills a source contributes: [{ name, absDir, upstreamPath, copyIgnore }]
function enumerate(src, repoDir) {
  if (src.layout === "single") {
    const sub = src.path ? path.join(repoDir, src.path) : repoDir;
    if (!fs.existsSync(path.join(sub, "SKILL.md"))) {
      throw new Error(`[${src.id}] single-layout source has no SKILL.md at ${src.path || "repo root"}`);
    }
    return [{
      name: src.skillName,
      absDir: sub,
      upstreamPath: src.path || ".",
      copyIgnore: src.copyIgnore || [".git"],
    }];
  }
  if (src.layout === "multi") {
    const rootAbs = path.join(repoDir, src.skillsRoot);
    const out = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const abs = path.join(d, e.name);
        if (fs.existsSync(path.join(abs, "SKILL.md"))) {
          const relWithinRoot = path.relative(rootAbs, abs);
          if (isExcluded(relWithinRoot, src.exclude)) continue;
          out.push({
            name: e.name,
            absDir: abs,
            upstreamPath: path.relative(repoDir, abs),
            copyIgnore: [".git"],
          });
        } else {
          walk(abs); // descend into category dirs
        }
      }
    };
    walk(rootAbs);
    return out;
  }
  throw new Error(`[${src.id}] unknown layout: ${src.layout}`);
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const destRoot = path.join(ROOT, config.destination);
  const licensesDir = path.join(ROOT, config.licensesDir);
  fs.mkdirSync(destRoot, { recursive: true });
  fs.mkdirSync(licensesDir, { recursive: true });

  const oldLock = fs.existsSync(LOCK_PATH)
    ? JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"))
    : { sources: {}, skills: {} };

  const newLock = { sources: {}, skills: {} };
  const report = { new: [], updated: [], unchanged: [], orphaned: [], collisions: [] };
  const claimedBy = {}; // skillName -> sourceId, for collision detection

  for (const src of config.sources) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `insource-${src.id}-`));
    let commit;
    try {
      git(["clone", "--depth", "1", "--branch", src.ref, src.repo, tmp]);
      commit = git(["rev-parse", "HEAD"], tmp);
      newLock.sources[src.id] = {
        name: src.name,
        repo: src.repo,
        ref: src.ref,
        commit,
        homepage: src.homepage,
        license: src.license,
      };

      // Per-source LICENSE file copied verbatim into licenses/.
      const licSrc = path.join(tmp, src.license.file);
      const licDest = path.join(licensesDir, `${src.id}-LICENSE.txt`);
      if (fs.existsSync(licSrc) && !CHECK) fs.copyFileSync(licSrc, licDest);

      for (const skill of enumerate(src, tmp)) {
        if (claimedBy[skill.name]) {
          report.collisions.push(`${skill.name} (from ${claimedBy[skill.name]} and ${src.id})`);
          continue;
        }
        claimedBy[skill.name] = src.id;

        const dest = path.join(destRoot, skill.name);
        if (!CHECK) copyDir(skill.absDir, dest, skill.copyIgnore);

        // Hash the source with the same ignore filter so it matches the copy,
        // and works in --check mode where the destination isn't written.
        const hash = hashDir(skill.absDir, skill.copyIgnore);
        newLock.skills[skill.name] = {
          source: src.id,
          upstreamPath: skill.upstreamPath,
          commit,
          hash,
          orphaned: false,
        };

        const prev = oldLock.skills[skill.name];
        if (!prev) report.new.push(skill.name);
        else if (prev.hash !== hash) report.updated.push(skill.name);
        else report.unchanged.push(skill.name);
      }

      // Declared orphans: removed upstream but deliberately kept locally.
      for (const name of src.orphans || []) {
        if (newLock.skills[name]) continue;
        claimedBy[name] = src.id;
        newLock.skills[name] = { source: src.id, upstreamPath: null, commit: null, hash: null, orphaned: true };
      }
    } finally {
      rmrf(tmp);
    }
  }

  // Previously-synced skills that disappeared upstream this run → keep, mark orphaned.
  for (const [name, prev] of Object.entries(oldLock.skills)) {
    if (newLock.skills[name]) continue;
    const stillManaged = config.sources.some((s) => s.id === prev.source);
    if (!stillManaged) continue; // source removed from config: leave the lock entry behind
    newLock.skills[name] = { ...prev, orphaned: true, upstreamPath: prev.upstreamPath, commit: prev.commit };
    report.orphaned.push(name);
  }

  if (!CHECK) {
    fs.writeFileSync(LOCK_PATH, JSON.stringify(sortLock(newLock), null, 2) + "\n");
    fs.writeFileSync(path.join(licensesDir, "NOTICE.md"), renderNotice(config, newLock));
  }

  printAndEmit(report);
}

function sortLock(lock) {
  const skills = {};
  for (const k of Object.keys(lock.skills).sort()) skills[k] = lock.skills[k];
  return { sources: lock.sources, skills };
}

function renderNotice(config, lock) {
  const lines = [];
  lines.push("# Third-party attribution");
  lines.push("");
  lines.push("This file is generated by `scripts/sync-skills.mjs` — do not edit by hand.");
  lines.push("It lists every skill insourced from a public upstream repository.");
  lines.push("");
  for (const src of config.sources) {
    const s = lock.sources[src.id];
    if (!s) continue;
    const owned = Object.entries(lock.skills)
      .filter(([, v]) => v.source === src.id && !v.orphaned)
      .map(([k]) => k)
      .sort();
    const orphans = Object.entries(lock.skills)
      .filter(([, v]) => v.source === src.id && v.orphaned)
      .map(([k]) => k)
      .sort();
    lines.push(`## ${s.name}`);
    lines.push("");
    lines.push(`- **Source:** ${s.repo}`);
    lines.push(`- **Pinned commit:** \`${s.commit || "n/a"}\` (ref \`${s.ref}\`)`);
    lines.push(`- **License:** ${s.license.spdx} — Copyright (c) ${s.license.holder}`);
    lines.push(`- **License text:** [\`${src.id}-LICENSE.txt\`](./${src.id}-LICENSE.txt)`);
    lines.push("");
    if (owned.length) {
      lines.push("Vendored skills (overwritten on every sync — do not edit in place):");
      lines.push("");
      lines.push(owned.map((n) => `\`${n}\``).join(", ") + ".");
      lines.push("");
    }
    if (orphans.length) {
      lines.push("Kept locally but removed/renamed upstream (no longer updated):");
      lines.push("");
      lines.push(orphans.map((n) => `\`${n}\``).join(", ") + ".");
      lines.push("");
    }
  }
  lines.push("The MIT license requires the copyright and permission notice to accompany");
  lines.push("redistribution; the referenced license files satisfy that. Skills, agents and");
  lines.push("commands authored in this repository are not covered by this notice.");
  lines.push("");
  return lines.join("\n");
}

function printAndEmit(report) {
  const line = (label, arr) => console.log(`  ${label}: ${arr.length}${arr.length ? " — " + arr.join(", ") : ""}`);
  console.log(CHECK ? "Sync check (no files written):" : "Sync complete:");
  line("new", report.new);
  line("updated", report.updated);
  line("unchanged", report.unchanged);
  line("orphaned", report.orphaned);
  if (report.collisions.length) line("COLLISIONS", report.collisions);

  if (process.env.GITHUB_OUTPUT) {
    const out = [
      `has_new=${report.new.length > 0}`,
      `new_skills=${report.new.join(",")}`,
      `has_collisions=${report.collisions.length > 0}`,
    ].join("\n");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, out + "\n");
  }
  const md = [
    "### Skill sync report",
    "",
    `- **New (need review):** ${report.new.join(", ") || "none"}`,
    `- **Updated:** ${report.updated.join(", ") || "none"}`,
    `- **Orphaned (kept, gone upstream):** ${report.orphaned.join(", ") || "none"}`,
    report.collisions.length ? `- **⚠️ Collisions:** ${report.collisions.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  if (process.env.SYNC_REPORT_FILE) fs.writeFileSync(process.env.SYNC_REPORT_FILE, md + "\n");

  if (report.collisions.length) {
    console.error("\nName collisions detected — resolve in sources/sources.json before merging.");
    process.exit(1);
  }
}

main();
