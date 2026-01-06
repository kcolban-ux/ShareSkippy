import { expect, test } from './globals';

test.describe('Landing page', () => {
  test('renders hero messaging and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Happy Dogs\./ })).toBeVisible();

    // Scope CTA checks to the hero section containing the main heading
    const heroHeading = page.getByRole('heading', { name: /Happy Dogs\./ });
    const heroSection = heroHeading.locator('xpath=ancestor::section[1]');

    const shareButton = heroSection.getByRole('button', { name: /Share Your Dog/i });
    await expect(shareButton).toBeVisible();

    const borrowButton = heroSection.getByRole('button', { name: /Borrow a Dog/i });
    await expect(borrowButton).toBeVisible();
    await page.evaluate(() =>
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'instant',
      })
    );
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
  });
});
