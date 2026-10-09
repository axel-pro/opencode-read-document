// The read_document tool: reads PDF and office documents as Markdown with headings, lists and tables.
// The built-in read tool cannot do this: DOCX, XLSX and PPTX are binary files for it, and PDFs are passed
// to the model as attachments that not every model accepts. The tool itself only runs bin/read-document —
// see that file for what is not carried over from a document and why.
import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT = fileURLToPath(new URL("../bin/read-document", import.meta.url))

function inside(dir, file) {
  const rel = path.relative(dir, file)
  return !rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel)
}

export const ReadDocument = async ({ worktree }) => {
  function run(file, signal: AbortSignal) {
    return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const child = spawn("node", [SCRIPT, file], { cwd: worktree, stdio: ["ignore", "pipe", "pipe"] })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => (stdout += chunk))
      child.stderr.on("data", (chunk) => (stderr += chunk))
      const onAbort = () => child.kill("SIGTERM")
      signal.addEventListener("abort", onAbort, { once: true })
      child.on("error", (error) => (stderr += `${error.message}\n`))
      child.on("close", (code) => {
        signal.removeEventListener("abort", onAbort)
        resolve({ code: code ?? 1, stdout, stderr })
      })
    })
  }

  return {
    tool: {
      read_document: tool({
        description: [
          "Read a document as Markdown: headings, lists and tables are preserved.",
          "Formats: pdf, docx, xlsx, pptx, odt, ods, odp, rtf, epub, html, csv. Use this tool for them instead of read.",
          "Legacy .doc, .xls, .ppt are not supported — ask the user to re-save the file in a newer format.",
          "Images are not carried over; scans without a text layer cannot be read, a warning says so.",
        ].join("\n"),
        args: {
          path: tool.schema.string().describe("Path to the document: absolute or relative to the project directory"),
        },
        async execute(args, context) {
          const file = path.resolve(context.directory, args.path)
          // Same permissions as the built-in read: files outside the project need the user's consent, plus read rules.
          if (!inside(context.directory, file) && !inside(context.worktree, file)) {
            const pattern = path.join(path.dirname(file), "*")
            await context.ask({
              permission: "external_directory",
              patterns: [pattern],
              always: [pattern],
              metadata: { filepath: file, parentDir: path.dirname(file) },
            })
          }
          await context.ask({ permission: "read", patterns: [path.relative(context.worktree, file)], always: ["*"], metadata: {} })
          context.metadata({ title: path.relative(context.worktree, file) })

          const result = await run(file, context.abort)
          const warnings = result.stderr.replace(/^read-document: /gm, "").trim()
          if (result.code !== 0) throw new Error(warnings || `read-document exited with code ${result.code}`)
          return warnings ? `${result.stdout.trimEnd()}\n\nWarnings:\n${warnings}` : result.stdout
        },
      }),
    },
  }
}
