import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const imageDirectory = path.join(root, "public", "static", "img");
const output = path.join(imageDirectory, "gstar-social-share-2026.jpg");

const background = await sharp(path.join(imageDirectory, "hero-background-v2.jpg"))
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .modulate({ brightness: 0.55, saturation: 0.9 })
  .toBuffer();

const overlay = Buffer.from(`
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#09090b" stop-opacity="0.96"/>
      <stop offset="0.58" stop-color="#09090b" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#09090b" stop-opacity="0"/>
      <stop offset="1" stop-color="#09090b" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect width="1200" height="630" fill="url(#floor)"/>
  <rect x="64" y="118" width="52" height="4" rx="2" fill="#fc0024"/>
  <text x="64" y="162" fill="#f2b8be" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">NTI GLOBAL TALENT PROGRAM · 2026</text>
  <text x="60" y="286" fill="#ffffff" font-family="Arial, sans-serif" font-size="84" font-weight="900" letter-spacing="0">GStar Bootcamp</text>
  <text x="64" y="365" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="700">Build AI at the <tspan fill="#fc4059">frontier.</tspan></text>
  <text x="66" y="425" fill="#c5c2c8" font-family="Arial, sans-serif" font-size="25" font-weight="400">A selective 12-week online accelerator for AI engineers.</text>
  <rect x="64" y="504" width="442" height="58" rx="5" fill="#8b151b"/>
  <text x="92" y="541" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="700">100% SCHOLARSHIPS AVAILABLE</text>
  <text x="1136" y="548" fill="#ffffff" font-family="Arial, sans-serif" font-size="17" font-weight="700" text-anchor="end" letter-spacing="2">ONLINE · ENGLISH</text>
</svg>`);

const logo = await sharp(path.join(imageDirectory, "logo-nti-white.svg"))
  .resize({ width: 134 })
  .toBuffer();

await sharp(background)
  .composite([
    { input: overlay, top: 0, left: 0 },
    { input: logo, top: 48, left: 64 }
  ])
  .jpeg({ quality: 90, chromaSubsampling: "4:4:4", progressive: true })
  .toFile(output);

await fs.chmod(output, 0o644);
console.log(output);
