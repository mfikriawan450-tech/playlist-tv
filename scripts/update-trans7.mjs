import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let streamUrl = null;

page.on("request", request => {
  const url = request.url();

  if (
    url.includes(
      "cdndirector.dailymotion.com/cdn/live/video/x8qckyq.m3u8"
    )
  ) {
    console.log("=================================");
    console.log("STREAM URL DITEMUKAN:");
    console.log(url);
    console.log("=================================");

    streamUrl = url;
  }
});

console.log("Membuka Dailymotion Player Trans7...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");
console.log("Menunggu stream...");

for (let i = 0; i < 60 && !streamUrl; i++) {
  await page.waitForTimeout(1000);
}

if (!streamUrl) {
  console.error("STREAM URL TIDAK DITEMUKAN.");
  await browser.close();
  process.exit(1);
}

console.log("Stream Trans7 berhasil ditemukan.");

await browser.close();
