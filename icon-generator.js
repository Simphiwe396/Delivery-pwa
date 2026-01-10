const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(0, 0, size, size);
  
  // Motorcycle icon
  ctx.fillStyle = '#ffffff';
  
  // Simple motorcycle icon
  const center = size / 2;
  const wheelRadius = size / 6;
  
  // Body
  ctx.beginPath();
  ctx.ellipse(center, center, size/4, size/6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Wheels
  ctx.beginPath();
  ctx.arc(center - size/4, center, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(center + size/4, center, wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), buffer);
  
  // Create shortcut icon
  const shortcutCanvas = createCanvas(96, 96);
  const shortcutCtx = shortcutCanvas.getContext('2d');
  shortcutCtx.fillStyle = '#27ae60';
  shortcutCtx.fillRect(0, 0, 96, 96);
  
  // Plus sign for start
  shortcutCtx.fillStyle = '#ffffff';
  shortcutCtx.fillRect(36, 20, 24, 56);
  shortcutCtx.fillRect(20, 36, 56, 24);
  
  const shortcutBuffer = shortcutCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'shortcut-icon.png'), shortcutBuffer);
  
  // Create badge icon
  const badgeCanvas = createCanvas(72, 72);
  const badgeCtx = badgeCanvas.getContext('2d');
  badgeCtx.fillStyle = '#e74c3c';
  badgeCtx.arc(36, 36, 36, 0, Math.PI * 2);
  badgeCtx.fill();
  
  badgeCtx.fillStyle = '#ffffff';
  badgeCtx.font = 'bold 40px Arial';
  badgeCtx.textAlign = 'center';
  badgeCtx.textBaseline = 'middle';
  badgeCtx.fillText('D', 36, 36);
  
  const badgeBuffer = badgeCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'badge-72.png'), badgeBuffer);
});

console.log('Icons generated successfully!');