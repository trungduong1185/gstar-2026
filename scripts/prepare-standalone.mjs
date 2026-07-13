import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Next.js standalone server was not generated.");
}

fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
fs.mkdirSync(path.join(standalone, ".next"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
