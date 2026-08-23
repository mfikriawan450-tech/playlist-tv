import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

const found = new Set();

page.on("request", request => {
  const url = request.url();

  if (url.includes(".m3u8")) {
    if (!found.has(url)) {
      found.add(url);

      console.log("=================================");
      console.log("M3U8 REQUEST:");
      console.log(url);
      console.log("=================================");
    }
  }
});

page.on("response", response => {
  const url = response.url();

  if (url.includes(".m3u8")) {
    console.log(
      "M3U8 RESPONSE:",
      response.status(),
      url
    );
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
console.log("Menunggu semua request M3U8...");

await page.waitForTimeout(60000);

console.log("=================================");
console.log("SELESAI");
console.log("Jumlah M3U8:", found.size);
console.log("=================================");

await browser.close();
