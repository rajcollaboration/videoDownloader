import { expect, test } from "@playwright/test";

const metadataFixture = {
  requestId: "req-123",
  platform: "TikTok",
  title: "E2E Test Video",
  thumbnailUrl: "https://placehold.co/1280x720/png",
  duration: "10:00",
  isPlaylist: true,
  itemsCount: 3,
  legalNotice: "Download only content you own or have permission to use.",
  formats: [
    {
      id: "18",
      label: "360p MP4",
      mimeType: "mp4",
      quality: "360p",
      filesizeMb: 20.5,
      audioOnly: false
    },
    {
      id: "140",
      label: "Audio MP3",
      mimeType: "mp3",
      quality: "audio",
      filesizeMb: 8.1,
      audioOnly: true
    }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route("**/v1/videos/resolve", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(metadataFixture)
    });
  });

  await page.route("**/v1/downloads", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          jobId: "job-123",
          status: "processing",
          progress: 20,
          message: "Queued for processing"
        })
      });
      return;
    }

    await route.continue();
  });

  await page.route("**/v1/downloads/job-123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: "job-123",
        status: "processing",
        progress: 67,
        message: "Processing playlist item 2 of 3",
        updatedAt: new Date().toISOString(),
        playlistItems: [
          { id: "1", title: "Video 1", position: 1, status: "completed", progress: 100, duration: "1:00" },
          { id: "2", title: "Video 2", position: 2, status: "processing", progress: 50, duration: "2:00" },
          { id: "3", title: "Video 3", position: 3, status: "pending", progress: 0, duration: "3:00" }
        ]
      })
    });
  });
});

test("resolves metadata and starts a download job", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("video-url-input").fill("https://www.tiktok.com/@user/video/1234567890");
  await page.getByTestId("fetch-formats-button").click();

  await expect(page.getByTestId("download-result-card")).toBeVisible();
  await expect(page.getByText("E2E Test Video")).toBeVisible();
  await expect(page.getByTestId("legal-notice")).toContainText("permission");

  await page.getByTestId("download-video-18").click();

  await expect(page.getByTestId("download-progress-panel")).toBeVisible();
  await expect(page.getByTestId("playlist-progress-list")).toBeVisible();
  await expect(page.getByText("Processing playlist item 2 of 3")).toBeVisible();
});

test("supports theme toggle and ad placeholders", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark|light/);
  await expect(page.getByTestId("ads-slot-top-sidebar-banner")).toBeVisible();
});

