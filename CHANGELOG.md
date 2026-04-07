# Change Log
All notable changes to the "Browser Tools for TestCafe" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

This is a maintained fork of Roman Resh's original `vscode-testcafe` project. The upstream project is no longer actively maintained, so this fork continues development and publishing under a new Marketplace id.

## Fork Notes
- New Marketplace package: `ChristopherCRobinson.browser-tools-for-testcafe`
- Rebranded from the upstream listing to `Browser Tools for TestCafe`
- README now uses a distinct branded banner instead of upstream screenshots
- GitHub Actions now generates new release entries, updates the version, and publishes Marketplace releases automatically.

## [3.0.0] - 2026-04-07

- chore: Marketplace compliance — new icon, config title, gallery banner, v2.1.3 (#15)


## [2.1.3] - 2026-04-07

- chore: replace icon with a completely new design for Marketplace compliance
- chore: rename configuration section title from "TestCafe Test Runner configuration" to "Browser Tools for TestCafe configuration"
- chore: update internal error message to use the new extension name
- chore: add Marketplace gallery banner with distinct branding colors

## [2.1.2] - 2026-04-07

- feat: add security and quality baseline (Dependabot, CodeQL, audit, SECURITY.md, templates) (#11)
- feat: Support array type for testcafeTestRunner.customArguments (#13)


## [2.1.1] - 2026-04-06

- first working version
- Repeat Test Run (#5), refactoring, Fix error while extension is not activated but menu items are visible.
- update changelog
- add the capability to run a test file
- update description
- update descriptions
- fix run on 'test/fixture' click
- set rep link
- fix tests debuggin in ^0.12.0-alpha1+
- check installed browsers
- docs
- docs fixed
- stable release
- upd version
- update readme
- upd version
- Implements #3
- fix headers
- Add support typescript
- Add error message if testcafe is not found in wd
- update to 1.1.0
- fix for #15
- Use TestCafe parser
- use terminal
- Revert "Use TestCafe parser"
- revert testcafe parser
- Add support for an alternate workspaceRoot.
- Undo Version # change
- workspaceRoot: use relative paths, small fixes
- use new vscode api
- fix #20
- Update 'testcafe-browser-utils' to support Google Chrome Canary
- Support Chrome Canary in context menus and command palette
- new-version
- v1.4.3 meta settings
- Feature: Optional Use of TestCafe Live
- Update Readme
- upd lock
- 1.4.4
- letter mistake
- Add MIT License
- new livemode, headless mode
- fixes comma in tests
- bug: allow tests to be found when ` used
- portable versions
- Support quoted args in customArguments setting
- Fixed some links
- Refactor customArguments parsing in TestCafeTestController
- Fix browser-specific flag positioning in TestCafe commands (#3)
- Support headless mode via customArguments (not just global setting) (#5)
- Adds AI agent instructions
- Improves readability of Copilot instructions
- Upgrades VS Code tasks to version 2.0.0
- Fix headless flag duplication when placed after browser-specific flags in customArguments (#7)
- Support browser-specific flags in customArguments via automatic flag separation (#9)
- Add release automation and rebrand extension
- Ignore environment variable files in version control
- Add automated release workflow


## [2.1.0]
- Support portable versions of browsers
- Fix apostrophe symbol in test names [#37](https://github.com/romanresh/vscode-testcafe/pull/37). Thanks to [@markfknight](https://github.com/markfknight).

## [1.5.0]
- Added the TestCafe headless mode [#32](https://github.com/romanresh/vscode-testcafe/issues/32).
- Use the built-in TestCafe live mode instead of the testcafe-live package.
- Fix tests contained the comma symbol [#25](https://github.com/romanresh/vscode-testcafe/issues/32)

## [1.4.5]
- Minor fixes.

## [1.4.4]
- Added testcafe-live support [#27](https://github.com/romanresh/vscode-testcafe/issues/27). Thanks to [@djbreen7](https://github.com/djbreen7).

## [1.4.3]
- Supported the custom meta settings (https://github.com/DevExpress/testcafe/issues/2242)

## [1.4.2]
- Added the Chrome Canary support

## [1.4.1]
- Fix the "Cannot read property 'uri' of undefined" error

## [1.4.0]
- Use the new VS Code debug API.

## [1.3.0]
- Added the 'testcafeTestRunner.workspaceRoot' setting.

## [1.2.0]
 - Use the 'inspector' protocol instead of 'legacy'
 - Use the Terminal tab instead of the Output (because of https://github.com/Microsoft/vscode/issues/19750 and https://github.com/romanresh/vscode-testcafe/issues/10)

## [1.1.0]
 - Added TypeScript files support
 - Fixed the error message if testcafe is not found in the working directory

## [1.0.2]
 - Added the 'testcafeTestRunner.customArguments' configuration key. See the whole list of available arguments in the [TestCafe documentation](https://devexpress.github.io/testcafe/documentation/using-testcafe/command-line-interface.html#options).

## [1.0]
 - Updated documentation
 - Stable release

## [0.0.5]
 - Automatic detection of installed browsers
 - Run all tests in a folder

## [0.0.4]
- Fix breakpoints missing in testcafe `^0.12.0-alpha1+`

## [0.0.3]
- Run all tests in a file (via file context menu)
- Run all tests in a fixture
- Fix run test via right click on the 'test' function.

## [0.0.2]
- New command: TestCafe: Repeat Previous Test Run
- Fixed error which occurs when extensions is not activated, but menus're already available

## [0.0.1]
- Initial release
- Base commands: Run in Chrome, IE, Firefox
