import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const tempDir = path.join(publicDir, ".asset-build");

mkdirSync(publicDir, { recursive: true });
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const iconSvg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="120" fill="#0B1220"/>
  <text x="256" y="310" text-anchor="middle" fill="#22C55E"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="156" font-weight="800" letter-spacing="-8">5:00</text>
</svg>`;

const ogSvg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="bgGradient" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#07111E"/>
      <stop offset="55%" stop-color="#0B1220"/>
      <stop offset="100%" stop-color="#102235"/>
    </linearGradient>
    <radialGradient id="glowGreen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#22C55E" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#22C55E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bgGradient)"/>
  <circle cx="210" cy="250" r="300" fill="url(#glowBlue)"/>
  <circle cx="980" cy="930" r="330" fill="url(#glowGreen)"/>
  <text x="600" y="425" text-anchor="middle" fill="#F8FAFC"
    font-family="-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    font-size="57" font-weight="800" letter-spacing="-1.4">러닝 페이스 계산기</text>
  <text x="350" y="655" text-anchor="middle" fill="#22C55E"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    font-size="86" font-weight="800" letter-spacing="-2.2">5:00/km</text>
  <text x="600" y="655" text-anchor="middle" fill="#38BDF8"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    font-size="86" font-weight="800">→</text>
  <text x="850" y="655" text-anchor="middle" fill="#22C55E"
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    font-size="86" font-weight="800" letter-spacing="-2.2">12.0 km/h</text>
  <text x="600" y="835" text-anchor="middle" fill="#CBD5E1"
    font-family="-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    font-size="38" font-weight="650" letter-spacing="-0.8">속도 ↔ 페이스 변환</text>
</svg>`;

writeFileSync(path.join(tempDir, "favicon-32.svg"), iconSvg);
writeFileSync(path.join(tempDir, "apple-touch.svg"), iconSvg);
writeFileSync(path.join(tempDir, "og-image.svg"), ogSvg);

execFileSync("qlmanage", ["-t", "-s", "32", "-o", tempDir, path.join(tempDir, "favicon-32.svg")], {
  cwd: rootDir,
  stdio: "inherit",
});
execFileSync("qlmanage", ["-t", "-s", "180", "-o", tempDir, path.join(tempDir, "apple-touch.svg")], {
  cwd: rootDir,
  stdio: "inherit",
});
execFileSync("qlmanage", ["-t", "-s", "1200", "-o", tempDir, path.join(tempDir, "og-image.svg")], {
  cwd: rootDir,
  stdio: "inherit",
});

execFileSync("sips", ["-s", "format", "png", path.join(tempDir, "favicon-32.svg.png"), "--out", path.join(publicDir, "favicon-32x32.png")], {
  cwd: rootDir,
  stdio: "inherit",
});
execFileSync("sips", ["-s", "format", "png", path.join(tempDir, "apple-touch.svg.png"), "--out", path.join(publicDir, "apple-touch-icon.png")], {
  cwd: rootDir,
  stdio: "inherit",
});
execFileSync("sips", ["-c", "630", "1200", path.join(tempDir, "og-image.svg.png"), "--out", path.join(publicDir, "og-image.png")], {
  cwd: rootDir,
  stdio: "inherit",
});

const pngBuffer = readFileSync(path.join(publicDir, "favicon-32x32.png"));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(pngBuffer.length, 8);
entry.writeUInt32LE(22, 12);

writeFileSync(path.join(publicDir, "favicon.ico"), Buffer.concat([header, entry, pngBuffer]));
rmSync(tempDir, { recursive: true, force: true });
