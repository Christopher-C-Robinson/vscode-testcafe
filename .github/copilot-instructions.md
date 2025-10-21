# VS Code TestCafe Test Runner - AI Agent Instructions

## Project Overview

This is a **VS Code extension** that wraps TestCafe CLI to provide IDE integration for running end-to-end browser tests. The extension activates on JavaScript/TypeScript files and provides context menu commands to run tests in various browsers.

**Core Architecture:**

-   Single-file extension (`src/extension.ts`, ~490 lines)
-   No tests, minimal dependencies (only `testcafe-browser-tools`)
-   Uses VS Code's `debugger` launch API to spawn TestCafe CLI as a Node process
-   Dynamic command registration based on detected browsers

## Critical Developer Workflows

### Extension Development & Testing

```bash
# First-time setup (fixed legacy vscode package issues)
npm install

# Build & watch (required before F5)
npm run compile

# Launch Extension Development Host
# Press F5 → Opens new VS Code window with extension loaded
# The extension expects TestCafe at ./node_modules/testcafe in the opened project
```

**Launch config quirks:**

-   `.vscode/launch.json` passes `${workspaceFolder}` as a positional arg so Dev Host opens with the workspace loaded
-   `env: { "NODE_NO_WARNINGS": "1" }` suppresses Node experimental/deprecation warnings in Dev Host
-   The extension looks for TestCafe at `./node_modules/testcafe/lib/cli/index.js` relative to the opened workspace (or `testcafeTestRunner.workspaceRoot` if set)

### Testing the Extension

1. Open a project in the Dev Host that has TestCafe installed (`npm i -D testcafe`)
2. Open a `.js` or `.ts` file containing `fixture()` or `test()` functions
3. Right-click inside a test body → "TestCafe: Run Test(s) in Chrome"
4. Output appears in the integrated terminal via `vscode.debug.startDebugging()`

## Code Architecture & Key Patterns

### Command Registration Pattern

The extension registers **22 commands** (11 for cursor-based runs, 11 for file/folder runs) dynamically based on browser detection:

-   **Cursor-based commands:** `testcaferunner.runTestsIn<Browser>` → calls `controller.runTests(browser)`
-   **File/folder commands:** `testcaferunner.runTestFileIn<Browser>` → calls `controller.startTestRun({name: browser}, args.fsPath, "file")`

**Browser detection flow:**

1. On activation, `updateInstalledBrowserFlags()` calls `browserTools.getInstallations()` (from `testcafe-browser-tools`)
2. For each installed browser, sets VS Code context: `vscode.commands.executeCommand('setContext', 'testcaferunner.firefoxInstalled', true)`
3. Context menu items use `when: testcaferunner.firefoxInstalled && testcaferunner.readyForUX` to show/hide

### Test/Fixture Detection (Regex-Based)

`findTestOrFixtureName()` parses the text before the cursor using:

```typescript
const TEST_OR_FIXTURE_RE = /(^|;|\s+|\/\/|\/\*)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+|\/\/|\/\*)test\s*(?:\.[a-zA-Z]+\([^\)]*\))*\s*\(\s*(.+?)\s*('|"|`)\s*,/gm;
```

-   Finds all `fixture()` and `test()` declarations up to cursor
-   Returns the **closest** match before cursor position
-   Handles TestCafe meta methods like `test.page().skip()` via `(?:\.[a-zA-Z]+\([^\)]*\))*`

### Custom Arguments Parsing (Critical for Browser Flags)

`startTestRun()` separates browser-specific flags from TestCafe CLI flags:

**Browser flags** (30+ recognized, see `isBrowserSpecificFlag()`):

-   Examples: `--ignore-certificate-errors`, `--window-size=1920,1080`, `--user-agent=...`
-   These get appended **to the browser string**: `chrome --ignore-certificate-errors --window-size=1920,1080`
-   The final browser string is quoted if it contains spaces

**TestCafe CLI flags** (everything else):

-   Examples: `--speed 0.1`, `--screenshots ./shots`, `--reporter spec`
-   Passed as separate args after the file path

**Tokenization:**

```typescript
const ARG_TOKENIZE_PATTERN = /[^\s"]+|"([^"]*)"/g;
```

-   Splits on whitespace, but preserves double-quoted strings as single tokens
-   **Use double quotes for paths with spaces:** `"--screenshots \"C:\\My Shots\""`

### Headless Mode Handling

**Two ways to enable headless:**

1. Global setting: `testcafeTestRunner.useHeadlessMode: true` → applies `:headless` suffix to all runs
2. Per-run via customArguments: Include `:headless` in the custom args string (not yet implemented, see `ISSUE_HEADLESS_CUSTOMARGS.md`)

**Current implementation:**

```typescript
if (this.isHeadlessMode()) browserArg += HEADLESS_MODE_POSTFIX; // ":headless"
```

This happens **before** customArguments parsing, so `:headless` in customArguments is currently passed as a literal arg (doesn't work).

### Portable Browser Support

If `testcafeTestRunner.portableChromePath` or `portableFirefoxPath` is set:

-   Commands `runTestsInPortableFirefox/Chrome` become available
-   Browser arg becomes: `path:\`C:\path\to\browser.exe\`:headless` (note backticks around path)

### Debug Integration

The extension uses `vscode.debug.startDebugging()` with a synthetic debug config:

```typescript
{
    name: "Launch current test(s) with TestCafe",
    type: "node",
    program: testCafePath,  // ./node_modules/testcafe/lib/cli/index.js
    args: [browserArg, filePath, ...testCafeFlags],
    console: "integratedTerminal",
    runtimeArgs: ["--no-deprecation"]
}
```

This spawns TestCafe CLI as a Node process in the integrated terminal. Users can place `debugger` statements in test code to pause execution.

## Project-Specific Conventions

### Context Flags for UX

-   `testcaferunner.readyForUX` → set to `true` after browser detection completes (enables all commands)
-   `testcaferunner.canRerun` → set to `true` after first test run (enables "Repeat Previous Test Run")
-   `testcaferunner.<browser>Installed` → per-browser flags to show/hide context menu items

### Settings Schema

All settings use prefix `testcafeTestRunner.` (note camelCase):

-   `customArguments` (string) - parsed with custom logic
-   `workspaceRoot` (string) - relative path to folder containing `node_modules/testcafe`
-   `useLiveRunner` (boolean) - uses `--live` flag (TestCafe Live mode)
-   `useHeadlessMode` (boolean) - appends `:headless` to browser string
-   `portableFirefoxPath` / `portableChromePath` (string) - absolute paths to portable browser executables

### TypeScript Config

-   **Target:** ES6, CommonJS modules
-   **Output:** `out/` directory (not `dist/`)
-   **Entry point:** `./out/src/extension` (specified in `package.json` main field)
-   **Old TypeScript version:** 2.0.3 (for compatibility with VS Code 1.15.0 engine)

### No Testing Infrastructure

-   The `test` script in `package.json` is a placeholder: `echo "No tests configured"`
-   Originally used deprecated `vscode` package's test harness (removed during modernization)

## Common Pitfalls & Debugging

### "TestCafe package is not found at path..."

-   The extension looks for `./node_modules/testcafe/lib/cli/index.js` relative to `vscode.workspace.rootPath`
-   If tests live in a nested folder, set `testcafeTestRunner.workspaceRoot: "./acceptance"` (or similar)
-   Ensure the **Dev Host** opens the project with TestCafe installed, not the extension's own folder

### Context Menu Items Not Showing

-   Check if `testcaferunner.readyForUX` is set: run "TestCafe: Refresh Browser List" (Ctrl+Alt+U)
-   For portable browsers, ensure the path setting is configured before refreshing browser list

### Custom Arguments Not Working

-   Use **double quotes** for values with spaces: `"--screenshots \"C:\\My Shots\""`
-   To pass browser flags, they must be in the recognized list in `isBrowserSpecificFlag()`
-   `:headless` in customArguments doesn't work yet (see known issue below)

### Regex Doesn't Detect Test

-   The regex looks for `test(` or `fixture(` with specific syntax
-   Tagged templates work: `` fixture`My fixture` ``
-   Test meta methods work: `test.page('http://...').skip('reason')`
-   But custom wrappers won't match (e.g., `describe()`, `it()` from other frameworks)

## Known Issues & Feature Requests

### Active Issue: Headless via customArguments

See `ISSUE_HEADLESS_CUSTOMARGS.md` for a detailed proposal to support `:headless` in customArguments for per-run control.

**Current workaround:** Toggle `testcafeTestRunner.useHeadlessMode` setting before running tests.

## When Editing This Extension

### Adding a New Browser

1. Add alias to `BROWSER_ALIASES` constant
2. Register command in `registerRunTestsCommands()` and `registerRunTestFileCommands()`
3. Add command to `package.json` `contributes.commands`
4. Add context menu items in `package.json` `contributes.menus` with `when: testcaferunner.<browser>Installed`

### Adding a New Browser Flag

Add to the `browserFlags` array in `isBrowserSpecificFlag()` method (around line 295).

### Changing Argument Parsing Logic

The tokenization happens in `startTestRun()` starting around line 360. Be careful:

-   Maintain the separation between browser flags and TestCafe CLI flags
-   Preserve the quoting logic for browser strings with spaces
-   Test with both `=` syntax (`--flag=value`) and space syntax (`--flag value`)

### Modernizing Dependencies

-   The extension is pinned to old VS Code API (1.15.0) and TypeScript 2.0.3
-   To modernize: update `engines.vscode`, bump `@types/vscode`, update TypeScript, test API compatibility
-   The legacy `vscode` package has been removed; `@types/vscode` is now used for type definitions

## Key Files Reference

-   `src/extension.ts` - entire extension logic (489 lines)
-   `package.json` - commands, menus, configuration schema, dependencies
-   `.vscode/launch.json` - Extension Development Host config (F5 debugging)
-   `README.md` - user-facing documentation (keep in sync with code changes)
