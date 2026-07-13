export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
export function withBasePath(path: string) { return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`; }
