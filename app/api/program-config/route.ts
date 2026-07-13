import { readProgramSettings } from "@/lib/program-settings";
export async function GET() { const config = await readProgramSettings(); return new Response(`window.GSTAR_CONFIG = Object.freeze(${JSON.stringify(config)});`, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" } }); }
