import { expect, test } from "@playwright/test";

const routes = [
  { path: "/download-youtube-video", heading: "YouTube Video Downloader" },
  { path: "/download-instagram-reels", heading: "Instagram Reels Downloader" },
  { path: "/download-facebook-video", heading: "Facebook Video Downloader" }
];

for (const route of routes) {
  test(`seo landing page renders metadata for ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible();
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", /.+/);
  });
}
