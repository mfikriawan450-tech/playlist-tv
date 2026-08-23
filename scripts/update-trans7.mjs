import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

const found = new Set();

function checkUrl(url, type) {
  if (
    url.includes("live-") ||
    url.includes("dmcdn.net/sec2")
  ) {
    if (!found.has(url)) {
      found.add(url);

      console.log("=================================");
      console.log(type);
      console.log(url);
      console.log("=================================");
    }
  }
}

page.on("request", request => {
  checkUrl(request.url(), "REQUEST");
});

page.on("response", response => {
  checkUrl(
    response.url(),
    `RESPONSE ${response.status()}`
  );
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

await page.waitForTimeout(10000);

console.log("Mencari elemen video...");

const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate(video => {
      video.muted = true;

      const p = video.play();

      if (p) {
        p.catch(() => {});
      }
    });

    console.log(`Video ${i} diperintahkan PLAY.`);
  } catch (error) {
    console.log(
      `Gagal menjalankan video ${i}:`,
      error.message
    );
  }
}

console.log("Menunggu HLS.js...");

await page.waitForTimeout(90000);

console.log("=================================");
console.log("HASIL");
console.log("Jumlah URL ditemukan:", found.size);
console.log("=================================");

for (const url of found) {
  console.log(url);
}

await browser.close();
