'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OR_FIXTURE_RE = /(^|;|\s+|\/\/|\/\*)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+|\/\/|\/\*)test\s*(?:\.[a-zA-Z]+\([^\)]*\))*\s*\(\s*(.+?)\s*('|"|`)\s*,/gm;
const CLEANUP_TEST_OR_FIXTURE_NAME_RE = /(^\(?\s*(\'|"|`))|((\'|"|`)\s*\)?$)/g;
const BROWSER_ALIASES = ['ie', 'firefox', 'chrome', 'chrome-canary', 'chromium', 'opera', 'safari', 'edge'];
const PORTABLE_BROWSERS = ["portableFirefox", "portableChrome"];
const TESTCAFE_PATH = "./node_modules/testcafe/lib/cli/index.js";
const HEADLESS_MODE_POSTFIX = ":headless";
const ARG_TOKENIZE_PATTERN = /[^\s"]+|"([^"]*)"/g;

const browserTools = require('testcafe-browser-tools');
let controller: TestCafeTestController | null = null;

function getController(): TestCafeTestController {
    if (!controller) {
        throw new Error('Browser Tools for TestCafe is not initialized.');
    }

    return controller;
}

function registerRunTestsCommands(context: vscode.ExtensionContext): void {
    const activeController = getController();

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInIE', () => {
            activeController.runTests('ie');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInFirefox', () => {
            activeController.runTests('firefox');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChrome', () => {
            activeController.runTests('chrome');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableFirefox', () => {
            activeController.runTests('portableFirefox', true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableChrome', () => {
            activeController.runTests('portableChrome', true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromeCanary', () => {
            activeController.runTests('chrome-canary');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromium', () => {
            activeController.runTests('chromium');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInOpera', () => {
            activeController.runTests('opera');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInSafari', () => {
            activeController.runTests('safari');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInEdge', () => {
            activeController.runTests('edge');
        })
    );
}

function registerRunTestFileCommands(context: vscode.ExtensionContext): void {
    const activeController = getController();

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInIE', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'ie' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInFirefox', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'firefox' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChrome', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'chrome' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableFirefox', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'portableFirefox', isPortable: true }, args.fsPath, 'file', undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableChrome', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'portableChrome', isPortable: true }, args.fsPath, 'file', undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromeCanary', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'chrome-canary' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromium', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'chromium' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInOpera', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'opera' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInSafari', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'safari' }, args.fsPath, 'file');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInEdge', (args: vscode.Uri) => {
            activeController.startTestRun({ name: 'edge' }, args.fsPath, 'file');
        })
    );
}

function getBrowserList(): Promise<string[]> {
    return browserTools.getInstallations()
        .then((installations: { [browser: string]: any }) => {
            return Object.keys(installations);
        });
}

function updateInstalledBrowserFlags(): Promise<void> {
    for (const alias of BROWSER_ALIASES) {
        vscode.commands.executeCommand('setContext', 'testcaferunner.' + alias + 'Installed', false);
    }
    for (const alias of PORTABLE_BROWSERS) {
        vscode.commands.executeCommand('setContext', 'testcaferunner.' + alias + 'Installed', false);
    }

    return getBrowserList()
        .then((installations: string[]) => {
            for (const alias of BROWSER_ALIASES) {
                if (installations.indexOf(alias) !== -1) {
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + alias + 'Installed', true);
                }
            }
            for (const alias of PORTABLE_BROWSERS) {
                if (getPortableBrowserPath(alias)) {
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + alias + 'Installed', true);
                }
            }
        });
}

function setReadyForUX(): Promise<void> {
    return Promise.resolve(vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', true))
        .then(() => undefined);
}

function refreshBrowserList(): Promise<void> {
    return updateInstalledBrowserFlags()
        .then(() => setReadyForUX(), (error: Error) => {
            vscode.window.showErrorMessage('Failed to update TestCafe browser list: ' + error.message);
            return setReadyForUX();
        });
}

function getPortableBrowserPath(browser: string): string {
    const configuration = vscode.workspace.getConfiguration('testcafeTestRunner');

    switch(browser) {
        case 'portableFirefox':
            return configuration.get<string>('portableFirefoxPath', '');
        case 'portableChrome':
            return configuration.get<string>('portableChromePath', '');
        default:
            throw new Error('Unknown portable browser');
    }
}

export function activate(context: vscode.ExtensionContext): void {
    controller = new TestCafeTestController();

    vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', false);
    vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', false);

    registerRunTestsCommands(context);
    registerRunTestFileCommands(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.updateBrowserList', () => {
            refreshBrowserList();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.repeatRun', () => {
            getController().repeatLastRun();
        })
    );

    context.subscriptions.push(getController());

    refreshBrowserList();
}

// this method is called when your extension is deactivated
export function deactivate(): void {
}

class TestCafeTestController {
    private lastBrowser: IBrowser | null = null;
    private lastFile: string = '';
    private lastType: string = '';
    private lastName: string = '';

    public runTests(browser: string, isPortable: boolean = false): void {
        const editor = vscode.window.activeTextEditor;

        if (!editor)
            return;

        const doc = editor.document;

        if (doc.languageId !== "javascript" && doc.languageId !== "typescript")
            return;

        const document = editor.document;
        const selection = editor.selection;

        if(!selection || !selection.active)
            return;

        const cursorPosition = document.getText(new vscode.Range(0, 0, selection.active.line, selection.active.character)).length;
        const textBeforeSelection = document.getText(new vscode.Range(0, 0, selection.end.line + 1, 0));

        const [type, name] = this.findTestOrFixtureName(textBeforeSelection, cursorPosition);

        this.startTestRun({ name: browser, isPortable: isPortable }, document.fileName, type, name);
    }

    public repeatLastRun(): void {
        if (!this.lastBrowser || !this.lastFile || !this.lastType || (this.lastType !== 'file' && !this.lastName)) {
            vscode.window.showErrorMessage(`Previous test is not found.`);
            return;
        }

        this.startTestRun(this.lastBrowser, this.lastFile, this.lastType, this.lastName);
    }

    private cropMatchString(matchString: string): string {
        matchString = matchString.trim().replace(/;|\/\/|\/\*/, '');
        
        return matchString.trim();
    }

    private isTest(matchString: string): boolean {
        return this.cropMatchString(matchString).indexOf('test') === 0;
    }

    private findTestOrFixtureName(text: string, cursorPosition: number): [string, string] {
        const testOrFixtureRe = new RegExp(TEST_OR_FIXTURE_RE);
        const matches: ITestOrFixtureMatch[] = [];
        let match: RegExpExecArray | null = testOrFixtureRe.exec(text);

        while (match !== null) {
            const test = this.isTest(match[0]);
            const rawName = test ? match[4] : match[2];
            const name = (rawName || '').replace(CLEANUP_TEST_OR_FIXTURE_NAME_RE, '');
            const realIndex = match.index + match[0].length - this.cropMatchString(match[0]).length;

            matches.push({
                type: test ? 'test' : 'fixture',
                name: name,
                index: realIndex
            });

            match = testOrFixtureRe.exec(text);
        }

        let lastOne: ITestOrFixtureMatch | null = null;

        if (matches.length){
            for (let i = matches.length - 1; i >= 0; i--){
                if(cursorPosition >= matches[i].index){
                    lastOne = matches[i];
                    break;
                }
            }
        }

        if (lastOne) {
            return [lastOne.type, lastOne.name];
        }

        return ['', ''];
    }
    
    private getOverriddenWorkspacePath(): string {
        const alternateWorkspacePath = vscode.workspace.getConfiguration('testcafeTestRunner').get<string | null>('workspaceRoot', './');
        return typeof alternateWorkspacePath === 'string' && alternateWorkspacePath.length > 0 ? alternateWorkspacePath : '';
    }

    private isLiveRunner(): boolean {
        return vscode.workspace.getConfiguration('testcafeTestRunner').get<boolean | null>('useLiveRunner', false) === true;
    }

    private isHeadlessMode(): boolean {
        return vscode.workspace.getConfiguration('testcafeTestRunner').get<boolean | null>('useHeadlessMode', false) === true;
    }

    private tokenizeArguments(customArguments: string): string[] {
        const tokens: string[] = [];
        const argPattern = new RegExp(ARG_TOKENIZE_PATTERN);
        let match: RegExpExecArray | null;
        do {
            match = argPattern.exec(customArguments);
            if (match !== null) { 
                tokens.push(match[1] ? match[1] : match[0]);
            }
        } while (match !== null);
        return tokens;
    }

    private normalizeCustomArguments(customArguments: string | string[] | null | undefined): string | null {
        if (Array.isArray(customArguments)) {
            return customArguments.join(' ');
        }

        return typeof customArguments === 'string' ? customArguments : null;
    }

    private hasHeadlessInCustomArgs(customArguments: string | null): boolean {
        if (typeof customArguments !== 'string') return false;
        const tokens = this.tokenizeArguments(customArguments);
        return tokens.some(token => token === ':headless');
    }

    private isBrowserSpecificFlag(arg: string): boolean {
        // List of common browser-specific flags that should be passed to the browser
        // These flags are not TestCafe CLI flags, but browser flags
        const browserFlags = [
            '--ignore-certificate-errors',
            '--allow-insecure-localhost',
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-features',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--force-color-profile',
            '--metrics-recording-only',
            '--mute-audio',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy',
            '--window-size',
            '--window-position',
            '--user-agent',
            '--lang',
            '--proxy-server',
            '--proxy-bypass-list'
        ];
        
        // Check if the argument starts with any of the browser-specific flags
        for (const flag of browserFlags) {
            if (arg.startsWith(flag)) {
                return true;
            }
        }
        
        return false;
    }

    public startTestRun(browser: IBrowser, filePath: string, type: string, name: string = ''): void {
        if (!type) {
            vscode.window.showErrorMessage(`No tests found. Position the cursor inside a test() function or fixture.`);
            return;
        }
        let browserArg = browser.name;
        this.lastBrowser = browser;
        this.lastFile = filePath;
        this.lastType = type;
        this.lastName = name;
        if (browser.isPortable) {
            const portableBrowserPath = getPortableBrowserPath(browser.name);
            browserArg = `path:\`${portableBrowserPath}\``;
        }

        // Parse custom arguments and separate browser-specific flags from TestCafe CLI flags
        const browserSpecificFlags: string[] = [];
        const testCafeFlags: string[] = [];

        const rawCustomArguments = vscode.workspace.getConfiguration("testcafeTestRunner").get<string | string[] | null>("customArguments", null);
        const customArguments = this.normalizeCustomArguments(rawCustomArguments);
        
        // Check customArguments FIRST for :headless flag
        const hasCustomHeadless = this.hasHeadlessInCustomArgs(customArguments);
        
        // Apply headless from setting OR customArguments
        if(this.isHeadlessMode() || hasCustomHeadless)
            browserArg += HEADLESS_MODE_POSTFIX;
        
        if(typeof(customArguments) === "string") {
            // First, collect all tokens
            const tokens = this.tokenizeArguments(customArguments);
            
            // Now process tokens, handling flags with values
            let i = 0;
            while (i < tokens.length) {
                const token = tokens[i];
                
                // Skip :headless token as it's already been applied to browserArg
                if (token === ':headless') {
                    i++;
                    continue;
                }
                
                // Check if this token is a browser-specific flag
                if (this.isBrowserSpecificFlag(token)) {
                    // Check if flag already has value (e.g., --flag=value)
                    if (token.indexOf('=') !== -1) {
                        browserSpecificFlags.push(token);
                        i++;
                    } else {
                        // Check if next token is a value (doesn't start with -- and is not :headless)
                        if (i + 1 < tokens.length && tokens[i + 1].indexOf('--') !== 0 && tokens[i + 1] !== ':headless') {
                            // Consume both flag and its value
                            browserSpecificFlags.push(token);
                            browserSpecificFlags.push(tokens[i + 1]);
                            i += 2;
                        } else {
                            // Flag without value
                            browserSpecificFlags.push(token);
                            i++;
                        }
                    }
                } else {
                    testCafeFlags.push(token);
                    i++;
                }
            }
        }

        // Build args array: browser (with flags), file, then TestCafe CLI flags
        // Combine browser name with browser-specific flags as a single quoted argument
        if (browserSpecificFlags.length > 0) {
            // Re-add quotes around values containing spaces to preserve them
            const quotedFlags = browserSpecificFlags.map(flag => {
                if (flag.indexOf(' ') !== -1 && flag.indexOf('--') !== 0) {
                    return `"${flag}"`;
                }
                return flag;
            });
            browserArg = `${browserArg} ${quotedFlags.join(' ')}`;
        }
        
        let args = [browserArg, filePath];

        if (type !== 'file') {
            args.push("--" + type);
            args.push(name);
        }

        // Add TestCafe CLI flags
        args = args.concat(testCafeFlags);

        const workspacePathOverride = this.getOverriddenWorkspacePath();
        if(this.isLiveRunner()) {
            args.push('--live');
        }

        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : (vscode.workspace.rootPath || '');
        const testCafePath = path.resolve(workspaceRoot, workspacePathOverride, TESTCAFE_PATH);
        if(!fs.existsSync(testCafePath)) {
            vscode.window.showErrorMessage(`TestCafe package is not found at path ${testCafePath}. Install the testcafe package in your working directory or set the "testcafeTestRunner.workspaceRoot" property.`);
            return;
        }
        
        const workingDirectory = path.resolve(workspaceRoot, workspacePathOverride);
        vscode.debug.startDebugging(workspaceFolder, {
            name: "Launch current test(s) with TestCafe",
            request: "launch",
            type: "node",
            cwd: workingDirectory,
            program: testCafePath,
            args: args,
            console: "integratedTerminal",
            internalConsoleOptions: "neverOpen",
            runtimeArgs: [
                "--no-deprecation"
            ]
        });
        vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', true);
    }

    public dispose(): void {

    }
}


interface IBrowser {
    name: string;
    isPortable?: boolean;
}

interface ITestOrFixtureMatch {
    type: string;
    name: string;
    index: number;
}
