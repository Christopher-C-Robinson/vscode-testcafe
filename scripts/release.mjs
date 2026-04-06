#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--'))
            continue;

        const equalsIndex = arg.indexOf('=');
        if (equalsIndex !== -1) {
            const key = arg.slice(2, equalsIndex);
            const value = arg.slice(equalsIndex + 1);
            result[key] = value;
            continue;
        }

        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
            result[key] = next;
            i++;
            continue;
        }

        result[key] = true;
    }

    return result;
}

function runGit(args) {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`, 'utf8');
}

function bumpVersion(version, bump) {
    const parts = version.split('.').map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part)))
        throw new Error(`Expected a semantic version, got "${version}".`);

    switch (bump) {
        case 'major':
            return `${parts[0] + 1}.0.0`;
        case 'minor':
            return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
            return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
        default:
            throw new Error(`Unsupported bump type "${bump}". Use patch, minor, or major.`);
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildReleaseSection(version, releaseDate, subjects) {
    const notes = subjects.length > 0 ? subjects : ['No commit messages were available for this release.'];
    return [`## [${version}] - ${releaseDate}`, '', ...notes.map((subject) => `- ${subject}`), '', ''].join('\n');
}

function findSectionRange(lines, version) {
    const headingPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\](?:\\s+-\\s+.*)?$`);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            start = i;
            break;
        }
    }

    if (start === -1)
        return null;

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^## \[/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return { start, end };
}

function extractSection(text, version) {
    const lines = text.split(/\r?\n/);
    const range = findSectionRange(lines, version);
    if (range === null)
        return null;

    return `${lines.slice(range.start, range.end).join('\n')}\n`;
}

function upsertSection(text, version, sectionText) {
    const lines = text.split(/\r?\n/);
    const sectionLines = sectionText.split(/\r?\n/);
    const range = findSectionRange(lines, version);

    if (range !== null) {
        lines.splice(range.start, range.end - range.start, ...sectionLines);
    } else {
        const insertionIndex = lines.findIndex((line) => /^## \[/.test(line));
        const insertAt = insertionIndex === -1 ? lines.length : insertionIndex;
        lines.splice(insertAt, 0, ...sectionLines);
    }

    return `${lines.join('\n').replace(/\n+$/, '\n')}`;
}

function collectCommitSubjects(baseRef) {
    const output = runGit(['log', '--no-merges', '--reverse', '--pretty=format:%s', baseRef === null ? 'HEAD' : `${baseRef}..HEAD`]);
    if (!output)
        return [];

    return output
        .split(/\r?\n/)
        .map((subject) => subject.trim())
        .filter((subject) => subject.length > 0);
}

const args = parseArgs(process.argv.slice(2));
const bump = String(args.bump ?? process.env.RELEASE_BUMP ?? 'patch');
const notesFile = path.resolve(String(args['notes-file'] ?? process.env.RELEASE_NOTES_FILE ?? '.release-notes.md'));
const releaseDate = new Date().toISOString().slice(0, 10);

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

const packageJson = readJson(packageJsonPath);
const currentVersion = packageJson.version;
const headSubject = runGit(['log', '-1', '--pretty=%s']);
const releaseCommitMatch = headSubject.match(/^chore\(release\): v(\d+\.\d+\.\d+)$/);

let targetVersion;
let sectionText;

if (releaseCommitMatch !== null) {
    targetVersion = releaseCommitMatch[1];
    if (currentVersion !== targetVersion) {
        throw new Error(`package.json version ${currentVersion} does not match the release commit version ${targetVersion}.`);
    }

    const changelog = fs.readFileSync(changelogPath, 'utf8');
    sectionText = extractSection(changelog, targetVersion);
    if (sectionText === null) {
        throw new Error(`CHANGELOG.md does not contain a section for ${targetVersion}.`);
    }
} else {
    const latestTagOutput = (() => {
        try {
            return runGit(['tag', '--list', 'v*', '--sort=-version:refname']);
        } catch (error) {
            return '';
        }
    })();

    const latestTag = latestTagOutput
        .split(/\r?\n/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)[0] ?? null;

    const baseVersion = latestTag === null ? currentVersion : latestTag.slice(1);
    targetVersion = bumpVersion(baseVersion, bump);

    if (currentVersion !== targetVersion) {
        packageJson.version = targetVersion;
        writeJson(packageJsonPath, packageJson);

        const packageLock = readJson(packageLockPath);
        packageLock.version = targetVersion;
        if (packageLock.packages !== undefined && packageLock.packages[''] !== undefined) {
            packageLock.packages[''].version = targetVersion;
        }
        writeJson(packageLockPath, packageLock);
    }

    const baseRef = latestTag === null ? runGit(['rev-list', '--max-parents=0', 'HEAD']).split(/\r?\n/)[0] : latestTag;
    const subjects = collectCommitSubjects(baseRef);
    sectionText = buildReleaseSection(targetVersion, releaseDate, subjects);

    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const updatedChangelog = upsertSection(changelog, targetVersion, sectionText);
    fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
}

fs.mkdirSync(path.dirname(notesFile), { recursive: true });
fs.writeFileSync(notesFile, sectionText, 'utf8');

console.log(`Prepared release ${targetVersion}`);
