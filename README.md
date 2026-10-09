# opencode-read-document

An [OpenCode](https://opencode.ai) plugin that adds the `read_document` tool: the agent reads PDF and office
documents as Markdown, with headings, lists and tables preserved.

The built-in `read` tool cannot do this: DOCX, XLSX and PPTX are binary files for it, and PDFs are passed to the
model as attachments that not every model accepts. Specs, regulations and spreadsheets usually arrive in exactly
these formats, so the plugin converts them to text the model can work with.

Conversion runs on [officeparser](https://github.com/harshankur/officeParser), a pure JavaScript library:
nothing besides Node.js is required (no Python, LibreOffice or Pandoc).

## Installation

Add the plugin to `opencode.json` (in the project or in `~/.config/opencode/`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-read-document"]
}
```

OpenCode installs it on the next start. Requirements: OpenCode 1.18+ and Node.js 22.13+ in `PATH`
(the tool runs the converter as a separate `node` process).

## The `read_document` tool

| Argument | Description |
|---|---|
| `path` | Path to the document: absolute or relative to the project directory |

Permissions match the built-in `read`: files outside the project require the `external_directory` permission,
and the `read` rules from your config apply. Warnings (for example, about a scan) are appended to the result
after the document text.

Supported formats: `pdf`, `docx`, `xlsx`, `pptx`, `odt`, `ods`, `odp`, `rtf`, `epub`, `html`, `csv`.

What is deliberately not carried over:

- **images** — in PDFs with screenshots they would turn into megabytes of base64 and push the text out of context;
- **text of scans** — OCR is disabled: it is slow and downloads language models from the network. If a document
  has almost no text, the tool warns that it looks like a scan;
- **legacy `.doc`, `.xls`, `.ppt`** — not supported; re-save them in a newer format.

## Command line

The same converter is available as the `read-document` command:

```sh
npx opencode-read-document spec.docx > spec.md
```

```
read-document <file>            print the document as Markdown
read-document <file> > <path>   save it to a file
```

Exit codes: `0` — done; `1` — the document could not be read; `2` — invalid invocation.
Errors and warnings go to stderr.

Example: a DOCX with a heading, bold text and a table becomes

```markdown
# Counter requirements

The counter cannot be increased above **MAX_VALUE**.

| Method | Path | Response |
|---|---|---|
| POST | /click | 200 |
```

## Development

```sh
npm install
npm test
```

Tests generate DOCX files from Markdown with officeparser itself, so the repository has no binary fixtures.

To try a local checkout in OpenCode, point the plugin at the directory:

```json
{ "plugin": ["../opencode-read-document"] }
```

## Releasing

Publishing is done by the `Publish to npm` GitHub Actions workflow when a `v*` tag is pushed.
The tag must match the version in `package.json`.

```sh
npm version patch        # bumps package.json, commits and creates the v* tag
git push --follow-tags
```

One-time setup: create an npm access token (Automation or Granular with publish rights) and add it to the
repository secrets as `NPM_TOKEN`.

## License

[MIT](LICENSE)
