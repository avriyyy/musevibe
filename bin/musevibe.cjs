#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const packageJson = require(path.join(__dirname, '..', 'package.json'));
const VERSION = packageJson.version || '0.0.0';
const REPOSITORY = 'https://github.com/avriyyy/musevibe';

function usage() {
  console.log(`MuseVibe CLI ${VERSION}

Usage:
  musevibe doctor
  musevibe context validate <workspace.json>
  musevibe --version
  musevibe --help

Commands:
  doctor                         Check that the CLI can run in this terminal.
  context validate <file>        Validate a downloaded MuseVibe workspace snapshot.

Run on demand with:
  npx --yes --package=github:avriyyy/musevibe#musevibe-hackathon-polish musevibe doctor

${REPOSITORY}`);
}

function fail(message) {
  console.error(`MuseVibe CLI: ${message}`);
  process.exitCode = 1;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSnapshot(snapshot) {
  if (!isObject(snapshot)) return 'root must be a JSON object';
  if (snapshot.version !== 1) return 'version must be 1';
  if (!isObject(snapshot.project)) return 'project must be an object';
  if (typeof snapshot.project.id !== 'string' || !snapshot.project.id.trim()) {
    return 'project.id must be a non-empty string';
  }
  if (typeof snapshot.project.name !== 'string' || !snapshot.project.name.trim()) {
    return 'project.name must be a non-empty string';
  }
  if (typeof snapshot.prd !== 'string') return 'prd must be a string';
  for (const key of ['tasks', 'screens', 'files', 'docs']) {
    if (!Array.isArray(snapshot[key])) return `${key} must be an array`;
  }
  return null;
}

function validateWorkspace(fileName) {
  if (!fileName) {
    fail('provide a workspace JSON file path. Example: musevibe context validate ./musevibe-workspace.json');
    return;
  }

  const filePath = path.resolve(process.cwd(), fileName);
  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    const detail = error && error.code === 'ENOENT'
      ? 'file not found'
      : error instanceof SyntaxError
        ? 'file is not valid JSON'
        : 'file could not be read';
    fail(`${detail}: ${filePath}`);
    return;
  }

  const issue = validateSnapshot(snapshot);
  if (issue) {
    fail(`invalid workspace snapshot (${issue}): ${filePath}`);
    return;
  }

  console.log('MuseVibe workspace snapshot: valid');
  console.log(`Project: ${snapshot.project.name} (${snapshot.project.id})`);
  console.log(`Included: 1 project, ${snapshot.tasks.length} tasks, ${snapshot.screens.length} screens, ${snapshot.files.length} files, ${snapshot.docs.length} documents`);
  console.log(`PRD: ${snapshot.prd.trim() ? 'included' : 'empty'}`);
  console.log('The CLI only read this local file; it did not upload or modify it.');
}

function main(args) {
  const [command, subcommand, ...rest] = args;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    usage();
    return;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(`musevibe ${VERSION}`);
    return;
  }
  if (command === 'doctor') {
    const major = Number(process.versions.node.split('.')[0]);
    if (!Number.isFinite(major) || major < 18) {
      fail(`Node.js 18 or newer is required; found ${process.versions.node}.`);
      return;
    }
    console.log(`MuseVibe CLI ${VERSION} is ready.`);
    console.log(`Node.js ${process.versions.node}`);
    console.log('This command runs locally and does not connect to MuseVibe or upload workspace data.');
    return;
  }
  if (command === 'context' && subcommand === 'validate') {
    validateWorkspace(rest[0]);
    return;
  }
  usage();
  fail(`unknown command: ${args.join(' ')}`);
}

main(process.argv.slice(2));
