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

var browserTools = require ('testcafe-browser-tools');
let controller: TestCafeTestController = null;

function registerRunTestsCommands (context:vscode.ExtensionContext){
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInIE', () => {
            controller.runTests("ie");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInFirefox', () => {
            controller.runTests("firefox");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChrome', () => {
            controller.runTests("chrome");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableFirefox', () => {
            controller.runTests("portableFirefox", true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableChrome', () => {
            controller.runTests("portableChrome", true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromeCanary', () => {
            controller.runTests("chrome-canary");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromium', () => {
            controller.runTests("chromium");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInOpera', () => {
            controller.runTests("opera");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInSafari', () => {
            controller.runTests("safari");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInEdge', () => {
            controller.runTests("edge");
        })
    );
}

function registerRunTestFileCommands (context:vscode.ExtensionContext){
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInIE', args => {
            controller.startTestRun({name: "ie"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInFirefox', args => {
            controller.startTestRun({name: "firefox"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChrome', args => {
            controller.startTestRun({name: "chrome"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableFirefox', args => {
            controller.startTestRun({name: "portableFirefox", isPortable: true}, args.fsPath, "file", undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableChrome', args => {
            controller.startTestRun({name: "portableChrome", isPortable: true}, args.fsPath, "file", undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromeCanary', args => {
            controller.startTestRun({name: "chrome-canary"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromium', args => {
            controller.startTestRun({name: "chromium"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInOpera', args => {
            controller.startTestRun({name: "opera"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInSafari', args => {
            controller.startTestRun({name: "safari"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInEdge', args => {
            controller.startTestRun({name: "edge"}, args.fsPath, "file");
        })
    );
}

function getBrowserList () {
    return browserTools.getInstallations()
            .then(installations => {
                return Object.keys(installations);
            });
}

function updateInstalledBrowserFlags (){
    return getBrowserList()
        .then(installations => {
            for(var aliase of BROWSER_ALIASES){
                if(installations.indexOf(aliase) !== -1 )
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + aliase + 'Installed', true);
            }
            for(var aliase of PORTABLE_BROWSERS) {
                if(getPortableBrowserPath(aliase))
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + aliase + 'Installed', true);
            }
        });
}

function getPortableBrowserPath(browser: string): string {
    switch(browser) {
        case "portableFirefox":
            return vscode.workspace.getConfiguration("testcafeTestRunner").get("portableFirefoxPath");
        case "portableChrome":
            return vscode.workspace.getConfiguration("testcafeTestRunner").get("portableChromePath");
        default:
            throw "Unknown portable browser";
    }
}

export function activate(context:vscode.ExtensionContext) {
    controller = new TestCafeTestController();

    vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', false);

    updateInstalledBrowserFlags()
        .then(() => {
            registerRunTestsCommands(context);
            registerRunTestFileCommands(context);

            context.subscriptions.push(
                vscode.commands.registerCommand('testcaferunner.updateBrowserList', () => {
                    updateInstalledBrowserFlags();
                })
            );

            context.subscriptions.push(
                vscode.commands.registerCommand('testcaferunner.repeatRun', () => {
                    controller.repeatLastRun();
                })
            );

            context.subscriptions.push(controller);

            vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', true);
        });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestCafeTestController {
    lastBrowser: IBrowser;
    lastFile:string;
    lastType:string;
    lastName:string;

    public runTests(browser:string, isPortable: boolean = false) {
        let editor = vscode.window.activeTextEditor;

        if (!editor)
            return;

        let doc = editor.document;

        if (doc.languageId !== "javascript" && doc.languageId !== "typescript")
            return;

        var document = editor.document;
        var selection = editor.selection;

        if(!selection || !selection.active)
            return;

        var cursorPosition = document.getText(new vscode.Range(0, 0, selection.active.line, selection.active.character)).length;
        var textBeforeSelection = document.getText(new vscode.Range(0, 0, selection.end.line + 1, 0));

        var [type, name] = this.findTestOrFixtureName(textBeforeSelection, cursorPosition);

        this.startTestRun({name: browser, isPortable: isPortable}, document.fileName, type, name);
    }

    public repeatLastRun() {
        if (!this.lastBrowser || !this.lastFile || (this.lastType !== "file" && !this.lastName)) {
            vscode.window.showErrorMessage(`Previous test is not found.`);
            return;
        }

        this.startTestRun(this.lastBrowser, this.lastFile, this.lastType, this.lastName);
    }

    private cropMatchString(matchString){
        matchString = matchString.trim().replace(/;|\/\/|\/\*/, '');
        
        return matchString.trim();
    }

    private isTest(matchString){    
        return this.cropMatchString(matchString).indexOf('test') === 0;
    }

    private findTestOrFixtureName(text, cursorPosition):string[] {
        var match = TEST_OR_FIXTURE_RE.exec(text);
        var matches = [];

        while (match !== null) {
                var test = this.isTest(match[0]);
                var name = test ? match[4] : match[2];
                var realIndex = match.index + match[0].length - this.cropMatchString(match[0]).length;

                matches.push({
                    type: test ? 'test' : 'fixture',
                    name: name.replace(CLEANUP_TEST_OR_FIXTURE_NAME_RE, ''),
                    index: realIndex
                });

            match = TEST_OR_FIXTURE_RE.exec(text);
        }

        var lastOne = null;

        if (matches.length){
            for(var i = matches.length - 1; i >= 0; i--){
                if(cursorPosition >=  matches[i].index){
                    lastOne = matches[i];
                    break;
                }
            }
        }

        if (lastOne)
            return [lastOne.type, lastOne.name];

        return ['', ''];
    }
    
    private getOverriddenWorkspacePath(): string {
        const alternateWorkspacePath = vscode.workspace.getConfiguration('testcafeTestRunner').get('workspaceRoot')
        if (typeof(alternateWorkspacePath) === 'string' && alternateWorkspacePath.length > 0 ){
            return alternateWorkspacePath
        }
        return ''
    }

    private isLiverRunner(): boolean {
        const useLiveRunner = vscode.workspace.getConfiguration('testcafeTestRunner').get('useLiveRunner')
        if (typeof(useLiveRunner) === 'boolean' && useLiveRunner){
            return useLiveRunner;
        }
    }

    private isHeadlessMode(): boolean {
        const useHeadlessMode = vscode.workspace.getConfiguration('testcafeTestRunner').get('useHeadlessMode')
        if (typeof(useHeadlessMode) === 'boolean' && useHeadlessMode){
            return useHeadlessMode;
        }
    }

    private tokenizeArguments(customArguments: string): string[] {
        const tokens: string[] = [];
        const argPattern = new RegExp(ARG_TOKENIZE_PATTERN);
        let match;
        do {
            match = argPattern.exec(customArguments);
            if (match !== null) { 
                tokens.push(match[1] ? match[1] : match[0]);
            }
        } while (match !== null);
        return tokens;
    }

    private hasHeadlessInCustomArgs(customArguments: string): boolean {
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

    public startTestRun(browser: IBrowser, filePath:string, type:string, name:string = "") {
        if (!type) {
            vscode.window.showErrorMessage(`No tests found. Position the cursor inside a test() function or fixture.`);
            return;
        }
        let browserArg = browser.name;
        this.lastBrowser = browser;
        this.lastFile = filePath;
        this.lastType = type;
        this.lastName = name;
        if(browser.isPortable) {
            const path = getPortableBrowserPath(browser.name);
            browserArg = `path:\`${path}\``;
        }

        // Parse custom arguments and separate browser-specific flags from TestCafe CLI flags
        var browserSpecificFlags: string[] = [];
        var testCafeFlags: string[] = [];
        
        
        var customArguments = vscode.workspace.getConfiguration("testcafeTestRunner").get("customArguments");
        
        // Check customArguments FIRST for :headless flag
        const hasCustomHeadless = this.hasHeadlessInCustomArgs(customArguments as string);
        
        // Apply headless from setting OR customArguments
        if(this.isHeadlessMode() || hasCustomHeadless)
            browserArg += HEADLESS_MODE_POSTFIX;
        
        if(typeof(customArguments) === "string") {
            // First, collect all tokens
            const tokens = this.tokenizeArguments(customArguments as string);
            
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
                        // Check if next token is a value (doesn't start with --)
                        if (i + 1 < tokens.length && tokens[i + 1].indexOf('--') !== 0) {
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
        
        var args = [browserArg, filePath];

        if (type !== "file") {
            args.push("--" + type);
            args.push(name);
        }

        // Add TestCafe CLI flags
        args = args.concat(testCafeFlags);

        const workspacePathOverride = this.getOverriddenWorkspacePath()
        if(this.isLiverRunner())
            args.push("--live");
        var testCafePath = path.resolve(vscode.workspace.rootPath, workspacePathOverride, TESTCAFE_PATH);
        if(!fs.existsSync(testCafePath)) {
            vscode.window.showErrorMessage(`TestCafe package is not found at path ${testCafePath}. Install the testcafe package in your working directory or set the "testcafeTestRunner.workspaceRoot" property.`);
            return;
        }
        
        var workingDirectory = path.resolve(vscode.workspace.rootPath, workspacePathOverride);
        var wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        vscode.debug.startDebugging(wsFolder, {
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

    dispose() {

    }
}


interface IBrowser {
    name: string;
    isPortable?: boolean;
}
