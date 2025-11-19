import 'dotenv/config';
import { expect, test } from './globals';

const E2E_SECRET = process.env.E2E_AUTH_SECRET;

if (!E2E_SECRET) {
  test.skip(true, 'E2E secret not configured');
}

test.describe('Authenticated profile flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/api/test/e2e-login?secret=${E2E_SECRET}&redirect=/community`);
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
