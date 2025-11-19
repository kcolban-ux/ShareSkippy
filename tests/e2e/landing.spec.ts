import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
    test("renders hero messaging and CTA", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { name: /Happy Dogs\./ }))
            .toBeVisible();
        await expect(
            page.getByRole("button", { name: /Share Your Dog/i }).first(),
        )
            .toBeVisible();
        await expect(
            page.getByRole("button", { name: /Borrow a Dog/i }).first(),
        )
            .toBeVisible();
        await page.evaluate(() =>
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "instant",
            })
        );
        const footer = page.getByRole("contentinfo");
        await expect(footer).toBeVisible();
    });
});
