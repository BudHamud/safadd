import fs from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const projectRoot = process.cwd();
const imageDir = path.join(projectRoot, 'assets', 'images');
const iconSvgPath = path.join(imageDir, 'icon.svg');

const iconSvg = await fs.readFile(iconSvgPath, 'utf8');

function stripOuterSvg(value) {
  return value.replace(/<\/?svg[^>]*>/g, '').trim();
}

function renderSvg(svg, outputPath) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1024,
    },
    background: 'rgba(0, 0, 0, 0)',
  });

  return fs.writeFile(outputPath, resvg.render().asPng());
}

function wrapSvg({ innerSvg, background = null, scale = 1, translate = 0 }) {
  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
  <g transform="translate(${translate} ${translate}) scale(${scale})">
    ${stripOuterSvg(innerSvg)}
  </g>
</svg>`;
}

const sourceArt = stripOuterSvg(iconSvg);

await Promise.all([
  renderSvg(
    wrapSvg({ innerSvg: sourceArt, background: '#141714', scale: 10.24 }),
    path.join(imageDir, 'icon.png'),
  ),
  renderSvg(
    wrapSvg({ innerSvg: sourceArt, scale: 7.4, translate: 142 }),
    path.join(imageDir, 'splash-icon.png'),
  ),
  renderSvg(
    wrapSvg({ innerSvg: sourceArt, background: '#141714', scale: 10.24 }),
    path.join(imageDir, 'favicon.png'),
  ),
  renderSvg(
    '<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="#141714"/></svg>',
    path.join(imageDir, 'android-icon-background.png'),
  ),
  renderSvg(
    wrapSvg({ innerSvg: sourceArt, scale: 8.2, translate: 102 }),
    path.join(imageDir, 'android-icon-foreground.png'),
  ),
  renderSvg(
    wrapSvg({ innerSvg: sourceArt, scale: 8.2, translate: 102 }),
    path.join(imageDir, 'android-icon-monochrome.png'),
  ),
]);

console.log('Generated app icon assets from assets/images/icon.svg');