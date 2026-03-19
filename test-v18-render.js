const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///Users/motive/motive-team/whistle.html');
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  const checks = [
    ['McKinsey SCR Framework', content.includes('McKinsey SCR Framework')],
    ['Situation label', content.includes('Situation')],
    ['Complication label', content.includes('Complication')],
    ['Resolution label', content.includes('Resolution')],
    ['인코텀즈 비용 비교', content.includes('인코텀즈 비용 비교')],
    ['경쟁 포지셔닝 맵', content.includes('경쟁 포지셔닝 맵')],
    ['포지셔닝 전략', content.includes('포지셔닝 전략')],
    ['성장 전망', content.includes('성장 전망')],
    ['전략적 시사점', content.includes('전략적 시사점')],
    ['떠오르는 기술', content.includes('떠오르는 기술')],
    ['_exSumStr helper', content.includes('_exSumStr')],
    ['KPI in action_plan', content.includes('KPI:')],
    ['KPI in roadmap', content.includes('📊')],
  ];
  
  let pass = 0, fail = 0;
  checks.forEach(([name, ok]) => {
    console.log((ok ? '✅' : '❌') + ' ' + name);
    if (ok) pass++; else fail++;
  });
  
  console.log(`\n${pass}/${pass+fail} passed`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
