const { chromium } = require('playwright');

async function createHajunCharacter() {
  // 기존 크롬 프로파일 사용 (로그인 세션 유지)
  const userDataDir = '/Users/motive/Library/Application Support/Google/Chrome';

  console.log('기존 크롬 프로파일로 실행 중...');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--no-first-run', '--no-default-browser-check'],
    viewport: { width: 1280, height: 800 }
  });

  const pages = browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  console.log('미드저니 접속 중...');
  await page.goto('https://www.midjourney.com/imagine', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/Users/motive/mj-login-check.png' });

  const url = page.url();
  console.log('현재 URL:', url);

  // 로그인 상태면 프롬프트 입력
  if (url.includes('midjourney.com') && !url.includes('login')) {
    console.log('로그인 확인됨! 프롬프트 입력 시도...');

    // 프롬프트 입력창 찾기
    const textarea = await page.$('textarea, [contenteditable="true"], input[placeholder]');
    if (textarea) {
      const prompt = 'Korean male project manager character, 30s, smart casual business style, friendly and professional expression, short black hair, glasses optional, clean modern illustration style, full body portrait, white background, --ar 1:1 --style raw --v 6';
      await textarea.click();
      await textarea.fill(prompt);
      console.log('프롬프트 입력 완료:', prompt);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/Users/motive/mj-prompt-ready.png' });
      console.log('스크린샷: /Users/motive/mj-prompt-ready.png');
    } else {
      console.log('입력창을 찾을 수 없습니다.');
    }
  } else {
    console.log('로그인이 필요합니다. URL:', url);
  }

  await page.waitForTimeout(3000);
  await browser.close();
}

createHajunCharacter().catch(console.error);
