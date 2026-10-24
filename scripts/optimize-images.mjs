import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const inputPath = path.resolve('public/assets/hospital-bg.jpg');
const outputPath = path.resolve('public/assets/hospital-bg.webp');

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
  }

  const inputStats = fs.statSync(inputPath);
  console.log(`Input JPG size: ${(inputStats.size / 1024).toFixed(2)} KB`);

  await sharp(inputPath)
    .webp({ quality: 68, effort: 6 })
    .toFile(outputPath);

  const outputStats = fs.statSync(outputPath);
  console.log(`Output WebP size: ${(outputStats.size / 1024).toFixed(2)} KB`);
  console.log('Optimized successfully!');
}

run().catch((err) => {
  console.error('Failed to optimize image:', err);
  process.exit(1);
});
