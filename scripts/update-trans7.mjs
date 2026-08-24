import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required"
  ]
});

const page = await browser.newPage({
  viewport: {
    width: 1280,
    height: 720
  }
});

let found = false;

page.on("request", (request) => {
  const url = request.url();

  if (url.includes("/live-") && url.includes(".m3u8")) {
    console.log("=================================");
    console.log("FINAL HLS DITEMUKAN:");
    console.log(url);
    console.log("=================================");

    found = true;
  }
});

console.log("Membuka Dailymotion...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");

await page.waitForTimeout(5000);

console.log("Mencoba menjalankan video...");

const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate((video) => {
      video.muted = true;
      video.volume = 0;
      return video.play();
    });
  } catch (error) {
    console.log(`Video ${i} gagal play.`);
  }
}

await page.mouse.click(640, 360).catch(() => {});

console.log("Menunggu request HLS...");

for (let i = 0; i < 120 && !found; i++) {
  await page.waitForTimeout(1000);

  if (i % 10 === 0) {
    console.log(`Menunggu ${i} detik...`);
  }
}

await browser.close();

if (!found) {
  console.error("FINAL HLS TIDAK DITEMUKAN.");
  process.exit(1);
}

console.log("Selesai.");
