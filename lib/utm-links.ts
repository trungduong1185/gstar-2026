import { prisma } from "@/lib/prisma";

export type UtmLink = {
  id: string;
  label: string;
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  fullUrl: string;
  shortCode: string | null;
  clicks: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function toPublic(row: {
  id: string; label: string; baseUrl: string; source: string; medium: string;
  campaign: string; content: string; term: string; fullUrl: string;
  shortCode: string | null; clicks: number; active: boolean;
  createdAt: Date; updatedAt: Date;
}): UtmLink {
  return {
    id: row.id, label: row.label, baseUrl: row.baseUrl, source: row.source,
    medium: row.medium, campaign: row.campaign, content: row.content, term: row.term,
    fullUrl: row.fullUrl, shortCode: row.shortCode, clicks: row.clicks, active: row.active,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
  };
}

export function generateFullUrl(data: { baseUrl: string; source: string; medium: string; campaign: string; content?: string; term?: string }): string {
  const params = new URLSearchParams();
  params.set("utm_source", data.source);
  params.set("utm_medium", data.medium);
  params.set("utm_campaign", data.campaign);
  if (data.content) params.set("utm_content", data.content);
  if (data.term) params.set("utm_term", data.term);
  const sep = data.baseUrl.includes("?") ? "&" : "?";
  return `${data.baseUrl}${sep}${params.toString()}`;
}

export async function listUtmLinks() {
  const rows = await prisma.utmLink.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toPublic);
}

export async function createUtmLink(data: {
  label: string; baseUrl: string; source: string; medium: string;
  campaign: string; content?: string; term?: string; shortCode?: string;
}) {
  const fullUrl = generateFullUrl(data);
  const row = await prisma.utmLink.create({
    data: {
      label: data.label,
      baseUrl: data.baseUrl,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      content: data.content || "",
      term: data.term || "",
      fullUrl,
      shortCode: data.shortCode || null
    }
  });
  return toPublic(row);
}

export async function updateUtmLink(id: string, data: {
  label?: string; source?: string; medium?: string; campaign?: string;
  content?: string; term?: string; active?: boolean;
}) {
  const update: Record<string, unknown> = {};
  if (data.label !== undefined) update.label = data.label;
  if (data.source !== undefined) update.source = data.source;
  if (data.medium !== undefined) update.medium = data.medium;
  if (data.campaign !== undefined) update.campaign = data.campaign;
  if (data.content !== undefined) update.content = data.content;
  if (data.term !== undefined) update.term = data.term;
  if (data.active !== undefined) update.active = data.active;
  const current = await prisma.utmLink.findUnique({ where: { id } });
  if (current && (data.source || data.medium || data.campaign || data.content || data.term)) {
    update.fullUrl = generateFullUrl({
      baseUrl: current.baseUrl,
      source: data.source || current.source,
      medium: data.medium || current.medium,
      campaign: data.campaign || current.campaign,
      content: data.content !== undefined ? data.content : current.content,
      term: data.term !== undefined ? data.term : current.term
    });
  }
  const row = await prisma.utmLink.update({ where: { id }, data: update });
  return toPublic(row);
}

export async function deleteUtmLink(id: string) {
  await prisma.utmLink.delete({ where: { id } });
}

export async function findByShortCode(code: string) {
  return prisma.utmLink.findUnique({ where: { shortCode: code } });
}

export async function incrementClicks(id: string) {
  await prisma.utmLink.update({ where: { id }, data: { clicks: { increment: 1 } } });
}
