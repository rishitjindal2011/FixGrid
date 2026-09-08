const sharp = require('sharp');
const fs = require('fs');

const svgLeft = `<svg viewBox="0 0 200 200" width="800" height="800" fill="none" stroke="#6366F1" stroke-width="0.9" opacity="0.25" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="30"/>
  <circle cx="90" cy="100" r="45"/>
  <circle cx="80" cy="100" r="60"/>
  <circle cx="70" cy="100" r="75"/>
  <circle cx="60" cy="100" r="90"/>
  <ellipse cx="100" cy="90" rx="80" ry="40" transform="rotate(25, 100, 90)"/>
  <ellipse cx="100" cy="90" rx="95" ry="50" transform="rotate(45, 100, 90)"/>
</svg>`;

const svgRight = `<svg viewBox="0 0 200 200" width="800" height="800" fill="none" stroke="#6366F1" stroke-width="0.9" opacity="0.25" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="35"/>
  <circle cx="110" cy="95" r="50"/>
  <circle cx="120" cy="90" r="65"/>
  <circle cx="130" cy="85" r="80"/>
  <ellipse cx="100" cy="100" rx="75" ry="40" transform="rotate(-30, 100, 100)"/>
  <ellipse cx="100" cy="100" rx="90" ry="55" transform="rotate(-55, 100, 100)"/>
</svg>`;

const svgBottomRight = `<svg viewBox="0 0 200 200" width="800" height="800" fill="none" stroke="#6366F1" stroke-width="0.9" opacity="0.25" xmlns="http://www.w3.org/2000/svg">
  <circle cx="120" cy="120" r="40"/>
  <circle cx="120" cy="120" r="60"/>
  <circle cx="120" cy="120" r="80"/>
  <circle cx="120" cy="120" r="100"/>
  <ellipse cx="110" cy="110" rx="90" ry="50" transform="rotate(-35, 110, 110)"/>
  <ellipse cx="110" cy="110" rx="105" ry="65" transform="rotate(-60, 110, 110)"/>
</svg>`;

Promise.all([
  sharp(Buffer.from(svgLeft)).png().toFile('guilloche_left.png'),
  sharp(Buffer.from(svgRight)).png().toFile('guilloche_right.png'),
  sharp(Buffer.from(svgBottomRight)).png().toFile('guilloche_bottom_right.png')
]).then(() => {
  console.log('SVGs rendered to PNG successfully!');
}).catch(err => {
  console.error(err);
  process.exit(1);
});
