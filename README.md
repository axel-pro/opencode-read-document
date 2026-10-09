# opencode-read-document

An [OpenCode](https://opencode.ai) plugin that adds the `read_document` tool: the agent reads PDF and office
documents as Markdown, with headings, lists and tables preserved.

The built-in `read` tool cannot do this: DOCX, XLSX and PPTX are binary files for it, and PDFs are passed to the
model as attachments that not every model accepts. Specs, regulations and spreadsheets usually arrive in exactly
these formats, so the plugin converts them to text the model can work with.

Conversion runs on [officeparser](https://github.com/harshankur/officeParser), a pure JavaScript library:
nothing besides Node.js is required (no Python, LibreOffice or Pandoc).

## Installation

The package is not published to npm; npm installs it straight from GitHub, pinned to a release tag.
Add it to the `package.json` of your project and run `npm install`:

```json
{
  "devDependencies": {
    "opencode-read-document": "github:axel-pro/opencode-read-document#v0.1.0"
  }
}
```

Then add the plugin to `opencode.json` by path (relative to `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-read-document"]
}
```

Requirements: OpenCode 1.18+ and Node.js 22.13+ in `PATH` (the tool runs the converter as a separate `node`
process).

To update, change the tag and run `npm install` again, then restart OpenCode. Versions are listed on the
[Tags](https://github.com/axel-pro/opencode-read-document/tags) page.

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

The same converter is available as the `read-document` command. After installation:

```sh
npx read-document spec.docx > spec.md
```

Without installing, straight from GitHub:

```sh
npx github:axel-pro/opencode-read-document#v0.1.0 spec.docx > spec.md
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

A release is a `vX.Y.Z` git tag: users pin it in their `package.json`.

```sh
npm version patch   # or minor / major: updates package.json and creates the vX.Y.Z tag
git push --follow-tags
```

GitHub Actions (`.github/workflows/ci.yml`) runs the tests on Node.js 22 and 24 on every push to `main`
and on pull requests. There is no release workflow: the tag itself is the release.

## License

[MIT](LICENSE)
