// Tests for bin/read-document. Test documents are generated from Markdown by officeparser itself,
// so the repository does not need binary fixtures.
"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { convert } = require("officeparser");

const SCRIPT = path.join(__dirname, "..", "bin", "read-document");

const SPEC = `# Counter requirements

The counter cannot be increased above **MAX_VALUE**.

| Method | Path | Response |
|---|---|---|
| POST | /click | 200 |
`;

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "read-document-test-"));
}

async function makeDocx(dir, markdown) {
  const source = path.join(dir, "source.md");
  fs.writeFileSync(source, markdown);
  const docx = path.join(dir, "spec.docx");
  fs.writeFileSync(docx, Buffer.from((await convert(source, "docx")).value));
  return docx;
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("DOCX becomes Markdown with a heading and a table", async () => {
  const docx = await makeDocx(tempDir(), SPEC);
  const result = run([docx]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^# Counter requirements$/m);
  assert.match(result.stdout, /\*\*MAX_VALUE\*\*/);
  assert.match(result.stdout, /^\| POST \| \/click \| 200 \|$/m);
  assert.doesNotMatch(result.stdout, /\{#/, "heading anchors are removed");
  assert.equal(result.stderr, "");
});

test("a document without letters produces a scan warning", async () => {
  const docx = await makeDocx(tempDir(), "12345\n");
  const result = run([docx]);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /looks like a scan/);
});

test("errors: missing file, unsupported format, invalid invocation", () => {
  const dir = tempDir();
  assert.equal(run([path.join(dir, "nope.pdf")]).status, 1);

  const txt = path.join(dir, "note.txt");
  fs.writeFileSync(txt, "text");
  const unsupported = run([txt]);
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stderr, /note\.txt/);

  assert.equal(run([]).status, 2);
  assert.equal(run([txt, txt]).status, 2);
  assert.equal(run(["--bad"]).status, 2);
});
