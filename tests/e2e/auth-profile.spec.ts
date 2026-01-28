import 'dotenv/config';
import { expect, test } from '@/tests/e2e/globals';

const E2E_SECRET = process.env.E2E_AUTH_SECRET;

if (!E2E_SECRET) {
  test.skip(true, 'E2E secret not configured');
}

test.describe('Authenticated profile flow', () => {
  test.beforeEach(async ({ page }) => {
    // Request the session JSON from the test login endpoint and set
    // the Supabase auth cookies directly in the browser context. This
    // avoids relying on server-side cookie plumbing which can vary
    // between runtimes.
    const request = await page.request.get(`/api/test/e2e-login?redirect=/community`, {
      headers: {
        Authorization: `Bearer ${E2E_SECRET}`,
        'x-e2e-return-session': '1',
      },
    });

    const body = await request.json();
    const session = body?.session;

    if (session && session.access_token) {
      // Determine origin for cookies. Prefer PLAYWRIGHT_BASE_URL (overridable),
      // otherwise try the response URL, and finally fall back to localhost.
      let origin: string | undefined;
      try {
        if (process.env.PLAYWRIGHT_BASE_URL) {
          origin = new URL(process.env.PLAYWRIGHT_BASE_URL).origin;
        }
      } catch {
        origin = undefined;
      }

      if (!origin) {
        // APIResponse may expose `url()`; guard for both function and property.
        try {
          const reqWithUrl = request as unknown as { url?: string | (() => string) };
          const maybeUrl = typeof reqWithUrl.url === 'function' ? reqWithUrl.url() : reqWithUrl.url;
          if (typeof maybeUrl === 'string' && maybeUrl) origin = new URL(maybeUrl).origin;
        } catch {
          origin = undefined;
        }
      }

      if (!origin) {
        origin = 'http://127.0.0.1:3000';
      }

      // Attach cookies for the app origin so server-side code sees them.
      // Playwright's addCookies accepts either a `url` or `domain`+`path`.
      // Using `domain`+`path` derived from the origin is more reliable across configs.
      try {
        const parsed = new URL(origin);
        const domain = parsed.hostname;
        const secure = parsed.protocol === 'https:';

        await page.context().addCookies([
          {
            name: 'sb-access-token',
            value: String(session.access_token),
            domain,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure,
          },
          {
            name: 'sb-refresh-token',
            value: String(session.refresh_token || ''),
            domain,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure,
          },
        ]);
      } catch {
        // Fallback to localhost domain
        await page.context().addCookies([
          {
            name: 'sb-access-token',
            value: String(session.access_token),
            domain: '127.0.0.1',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
          },
          {
            name: 'sb-refresh-token',
            value: String(session.refresh_token || ''),
            domain: '127.0.0.1',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
          },
        ]);
      }
    }

    await page.goto('/community');
    await expect(page).toHaveURL(/\/community/);
  });

  test('navigates from landing to profile, updates info, and returns to community', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Community', exact: true }).first().click();
    await expect(page).toHaveURL(/\/community/);

    const profileLink = page.getByTestId('nav-profile-link');
    await expect(profileLink).toHaveAttribute('href', '/profile');
    await profileLink.click();
    await expect(page).toHaveURL(/\/profile$/);

    await page.getByRole('link', { name: 'Edit Profile' }).click();
    await expect(page).toHaveURL(/\/profile\/edit/);

    await page.fill('input[name="first_name"]', 'Playwright');
    await page.fill('input[name="last_name"]', 'Tester');
    await page.fill('input[name="phone_number"]', '555-123-4567');
    await page.selectOption('select[name="role"]', 'dog_owner');

    await page.fill('input[name="street_address"]', '123 Market St');
    await page.fill('input[name="city"]', 'San Francisco');
    await page.fill('input[name="state"]', 'CA');
    await page.fill('input[name="zip_code"]', '94103');

    await page.route('https://nominatim.openstreetmap.org/search**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            lat: '37.7749',
            lon: '-122.4194',
            address: {
              suburb: 'Mission',
              city: 'San Francisco',
              state: 'CA',
              neighbourhood: 'Mission',
            },
          },
        ]),
      })
    );

    await page.getByRole('button', { name: 'Verify Address' }).click();
    await expect(page.getByText('✅ Address Verified')).toBeVisible();

    await page.getByRole('button', { name: 'Save Profile' }).click();
    await page.waitForURL(/\/onboarding\/welcome/);

    await page.getByRole('link', { name: 'Community', exact: true }).first().click();
    await expect(page).toHaveURL(/\/community/);
  });
});
