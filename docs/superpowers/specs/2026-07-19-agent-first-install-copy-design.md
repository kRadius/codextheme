# Agent-First Install Copy Design

## Outcome

CodexTheme will treat a local Code Agent as the default place users paste an install action. Visitors do not need to understand the distinction between a CLI and Codex. The primary copied payload tells the agent to execute the pinned `@codextheme/cli` command exactly, without substituting an installed theme skill or another package.

Terminal remains available as a secondary, explicit option for users who prefer a raw shell command.

## User Journey

For both ready-made and private skins:

1. The primary button says **Copy & apply with Codex**.
2. Clicking it copies a short execution instruction followed by the exact pinned command.
3. The confirmation tells the visitor to paste it into a local Codex task.
4. A secondary **Copy Terminal command** action copies only the raw command.
5. The page explains that a local Code Agent may request permission before running the command.

The agent payload is generated locally from the command returned by the existing API:

```text
Run the following command exactly in my local macOS shell.
Do not use any installed theme skill, substitute another package, or modify the command.
Ask for approval only if required. After it finishes, report whether Codex needs to be reopened.

<pinned @codextheme/cli command>
```

The command remains visible on the page for inspection. No API or CLI behavior changes.

## Copy Boundaries

- The primary payload must contain the exact API/catalog command without interpolation beyond appending it as the final line.
- It must name `@codextheme/cli` and explicitly forbid package substitution.
- It must not depend on any installed Codex skill.
- The raw Terminal action must remain one click and copy only the command.
- Clipboard failures must leave the command visible and provide a manual-copy message.
- Existing coarse copy analytics remain; no command, theme token, or prompt text is sent to GA4.

## Privacy Copy

Private skins remain unlisted and expire after 24 hours, but pasting the agent payload sends the temporary ID into that Agent's conversation. The Studio result and Security page will state this plainly. The copy must distinguish:

- private from the public CodexTheme gallery; and
- private from the Code Agent provider receiving the pasted conversation.

Users who do not want the temporary ID in an Agent conversation can use **Copy Terminal command** instead.

## Page Consistency

The Agent-first model appears consistently in:

- the private Studio result;
- ready-made theme detail pages;
- the home-page three-step explanation;
- install Help; and
- the Security page's private-upload explanation.

The page will not claim that every AI chat can apply a skin. Copy identifies a **local Codex task** and keeps Terminal as the reliable fallback.

## Testing

Tests will verify that rendered pages expose the Agent-first primary path, the Terminal fallback, and the privacy disclosure. A focused unit test will verify that the copied agent payload contains the exact command and the no-substitution guard while the Terminal payload remains unchanged.

Existing build, route, API, CLI, runtime, SEO, and analytics tests must remain green. Production smoke verification will confirm the updated copy on the home page, a theme page, Help, and Security after deployment.

## Out of Scope

- Installing or publishing a CodexTheme skill.
- Detecting which Code Agent receives the clipboard.
- Changing the CLI, API, package versions, theme format, or temporary-ID lifetime.
- Promising execution from web-only agents that cannot access the visitor's Mac.
