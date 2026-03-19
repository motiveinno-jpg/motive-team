import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: collect JS errors that fire during a page's lifetime
// ---------------------------------------------------------------------------
function trackJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ===========================================================================
// 1. Manufacturer Portal (whistle.html)
// ===========================================================================

test.describe('Whistle Manufacturer Portal', () => {
  test('1 - Page loads without JS errors', async ({ page }) => {
    const jsErrors = trackJsErrors(page);

    const response = await page.goto('/whistle.html', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Whistle\s*AI/i);

    // Allow a short settling period then assert zero JS errors
    await page.waitForTimeout(2000);
    expect(jsErrors).toEqual([]);
  });

  test('2 - Footer compliance info', async ({ page }) => {
    await page.goto('/whistle.html', { waitUntil: 'domcontentloaded' });

    // Wait for footer to be present
    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 10_000 });

    const footerText = await footer.textContent();

    // Business registration number
    expect(footerText).toContain('956-87-02691');
    // E-commerce license keyword
    expect(footerText).toMatch(/통신판매업/);
    // Address
    expect(footerText).toMatch(/미추홀구.*학익동.*663/s);
    // Contact email
    expect(footerText).toContain('contact@whistle-ai.com');
  });

  test('3 - Auth form with login/signup tabs', async ({ page }) => {
    await page.goto('/whistle.html', { waitUntil: 'domcontentloaded' });

    // Email & password inputs should be present (visible or within auth modal)
    const emailInput = page.locator('input[type="email"], input[placeholder*="이메일"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeAttached({ timeout: 10_000 });
    await expect(passwordInput).toBeAttached({ timeout: 10_000 });

    // Login / Signup tab text
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/로그인/);
    expect(bodyText).toMatch(/회원가입/);
  });

  test('4 - Signup empty-form validation', async ({ page }) => {
    await page.goto('/whistle.html', { waitUntil: 'domcontentloaded' });

    // Switch to signup tab if it exists
    const signupTab = page.locator('text=회원가입').first();
    if (await signupTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signupTab.click();
      await page.waitForTimeout(500);
    }

    // Find and click the submit / signup button without filling any fields
    const submitBtn = page.locator(
      'button:has-text("가입"), button:has-text("회원가입"), button[type="submit"]'
    ).first();

    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // After submitting empty form, either:
      //   a) HTML5 validation prevents submission (required attribute), or
      //   b) Custom validation message appears
      const hasValidation =
        (await page.locator(':invalid').count()) > 0 ||
        (await page.locator('[class*="error"], [class*="alert"], [class*="warn"], [role="alert"]').count()) > 0 ||
        (await page.locator('text=/필수|required|입력해/i').count()) > 0;

      expect(hasValidation).toBeTruthy();
    } else {
      // If no visible submit button, verify required attributes exist on inputs
      const requiredInputs = await page.locator('input[required]').count();
      expect(requiredInputs).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// 2. Buyer Portal (buyer.html)
// ===========================================================================

test.describe('Whistle Buyer Portal', () => {
  test('5 - Page loads with English lang attribute', async ({ page }) => {
    const response = await page.goto('/buyer.html', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Buyer/i);

    // lang attribute should be English
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^en/i);
  });

  test('6 - Footer has English business info', async ({ page }) => {
    await page.goto('/buyer.html', { waitUntil: 'domcontentloaded' });

    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 10_000 });

    const footerText = await footer.textContent();

    expect(footerText).toMatch(/Motive\s*Innovation/i);
    expect(footerText).toContain('956-87-02691');
  });

  test('7 - Auth form labels in English', async ({ page }) => {
    await page.goto('/buyer.html', { waitUntil: 'domcontentloaded' });

    const bodyText = await page.textContent('body') ?? '';

    // English auth keywords should be present
    expect(bodyText).toMatch(/Email/i);
    expect(bodyText).toMatch(/Password/i);
    expect(bodyText).toMatch(/Sign\s*In/i);
    expect(bodyText).toMatch(/Sign\s*Up/i);
  });

  test('8 - No Korean UI text on auth page', async ({ page }) => {
    await page.goto('/buyer.html', { waitUntil: 'domcontentloaded' });

    // Collect visible text from interactive/label elements (exclude hidden, meta, script)
    const visibleTexts = await page.locator(
      'button, label, a, h1, h2, h3, h4, p, span, th, td, li, [role="tab"]'
    ).allTextContents();

    const joined = visibleTexts.join(' ');

    // Common Korean auth terms should NOT appear in visible UI text
    const koreanAuthPattern = /가입|로그인|비밀번호/;
    expect(joined).not.toMatch(koreanAuthPattern);
  });
});

// ===========================================================================
// 3. Admin Portal (admin.html)
// ===========================================================================

test.describe('Whistle Admin Portal', () => {
  test('9 - Page loads', async ({ page }) => {
    const response = await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Admin/i);
  });
});

// ===========================================================================
// 4. Cross-Portal Isolation
// ===========================================================================

test.describe('Cross-Portal Isolation', () => {
  test('10 - buyer.html has no links to whistle.html or admin.html', async ({ page }) => {
    await page.goto('/buyer.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Gather all href values on the page
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '')
    );

    const forbidden = hrefs.filter(
      (h) => /whistle\.html/i.test(h) || /admin\.html/i.test(h)
    );

    expect(
      forbidden,
      `buyer.html should not link to other portals, but found: ${forbidden.join(', ')}`
    ).toHaveLength(0);
  });
});
