import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const EXPERT = process.env.EXPERT_URL ?? "http://127.0.0.1:18766";

function parseCode(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { code?: string };
    if (data.code?.startsWith("grtc-")) return data.code;
  } catch {
    // ignore
  }
  return null;
}

export async function mintWebrtcCode(): Promise<string | null> {
  try {
    const res = await fetch(`${EXPERT}/mint`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const code = parseCode(await res.text());
      if (code) return code;
    }
  } catch {
    // Expert optional — fall through to a one-shot Python mint.
  }

  try {
    const venvPy = path.join(process.cwd(), ".venv", "bin", "python");
    const py = existsSync(venvPy) ? venvPy : "python3";
    const script = path.join(process.cwd(), "expert", "mint_code.py");
    const { stdout } = await execFileAsync(py, [script], {
      timeout: 25000,
      env: process.env,
      cwd: path.join(process.cwd(), "expert"),
    });
    return parseCode(stdout.trim());
  } catch {
    return null;
  }
}
