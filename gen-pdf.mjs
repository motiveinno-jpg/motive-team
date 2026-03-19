import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 }
});

await page.goto('file:///Users/motive/motive-team/whistle-alibaba-bp-v10.html', {
  waitUntil: 'networkidle'
});

// Remove toolbar, fix each slide for perfect PDF rendering
await page.evaluate(() => {
  document.querySelector('.toolbar-float')?.remove();

  document.querySelectorAll('.P').forEach(p => {
    // Reset transforms and sizing
    p.style.transform = 'none';
    p.style.marginBottom = '0';
    p.style.width = '1920px';
    p.style.minHeight = '1080px';
    p.style.pageBreakAfter = 'always';
    p.style.flexShrink = '0';
    p.style.boxSizing = 'border-box';

    // Measure actual content height
    p.style.height = 'auto';
    p.style.overflow = 'visible';
    const contentH = p.scrollHeight;

    if (contentH > 1080) {
      // Scale down to fit exactly 1080px
      const scale = 1080 / contentH;
      p.style.height = '1080px';
      p.style.overflow = 'hidden';
      p.style.transformOrigin = 'top left';
      p.style.transform = `scale(${scale})`;
      // Compensate width for scale
      p.style.width = `${1920 / scale}px`;
    } else {
      p.style.height = '1080px';
      p.style.overflow = 'hidden';
    }
  });

  // Remove page-break on last slide
  const pages = document.querySelectorAll('.P');
  if (pages.length) pages[pages.length - 1].style.pageBreakAfter = 'auto';
});

await page.pdf({
  path: '/Users/motive/motive-team/whistle-alibaba-bp-v10.pdf',
  width: '1920px',
  height: '1080px',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: false,
});

console.log('PDF generated!');
await browser.close();
