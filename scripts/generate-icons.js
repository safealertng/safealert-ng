import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [
  { size: 48, folder: 'mipmap-mdpi' },
  { size: 72, folder: 'mipmap-hdpi' },
  { size: 96, folder: 'mipmap-xhdpi' },
  { size: 144, folder: 'mipmap-xxhdpi' },
  { size: 192, folder: 'mipmap-xxxhdpi' },
];

const svgIcon = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#0a0e1a" rx="200"/>
  <path d="M512 120 L750 232 L750 512 Q750 692 512 880 Q274 692 274 512 L274 232 Z" fill="#1a2035" stroke="#FF6B00" stroke-width="12"/>
  <text x="512" y="580" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="320" font-weight="900" fill="#ffffff">S</text>
  <text x="512" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="90" font-weight="700" fill="#ffffff" letter-spacing="4">SAFE<tspan fill="#FF6B00">ALERT</tspan></text>
  <text x="512" y="820" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="700" fill="#FF6B00" letter-spacing="16">NG</text>
</svg>`;

const svgForeground = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path d="M512 120 L750 232 L750 512 Q750 692 512 880 Q274 692 274 512 L274 232 Z" fill="none" stroke="#FF6B00" stroke-width="12"/>
  <text x="512" y="580" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="320" font-weight="900" fill="#ffffff">S</text>
  <text x="512" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="90" font-weight="700" fill="#ffffff" letter-spacing="4">SAFE<tspan fill="#FF6B00">ALERT</tspan></text>
  <text x="512" y="820" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="700" fill="#FF6B00" letter-spacing="16">NG</text>
</svg>`;

const svgBuffer = Buffer.from(svgIcon);
const svgForegroundBuffer = Buffer.from(svgForeground);
const androidResPath = 'android/app/src/main/res';

async function generateIcons() {
  const master = await sharp(svgBuffer, { density: 300 })
    .resize(1024, 1024)
    .png()
    .toBuffer();

  fs.writeFileSync('public/icon-1024.png', master);
  console.log('Master icon saved to public/icon-1024.png');

  const foreground = await sharp(svgForegroundBuffer, { density: 300 })
    .resize(1024, 1024)
    .png()
    .toBuffer();

  for (const { size, folder } of sizes) {
    const outputPath = path.join(androidResPath, folder, 'ic_launcher.png');
    const outputRoundPath = path.join(androidResPath, folder, 'ic_launcher_round.png');
    const outputForegroundPath = path.join(androidResPath, folder, 'ic_launcher_foreground.png');

    await sharp(master)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    await sharp(master)
      .resize(size, size)
      .png()
      .toFile(outputRoundPath);

    await sharp(foreground)
      .resize(size, size)
      .png()
      .toFile(outputForegroundPath);

    console.log(`Generated ${size}x${size} icon in ${folder}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
