import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let authUrl = null;

page.on("response", async (response) => {
  const url = response.url();

  if (
    url.includes("dmxleo.dailymotion.com/cdn/manifest/video/x8qckyq.m3u8")
  ) {
    console.log("MANIFEST:", response.status());

    try {
      const body = await response.text();

      const match = body.match(
        /https:\/\/dmxleo\.dailymotion\.com\/cdn\/manifest\/video\/x8qckyq\.m3u8\?auth=[^"<]+/
      );

      if (match) {
        authUrl = match[0]
          .replace(/&amp;/g, "&");

        console.log("=================================");
        console.log("AUTH URL DITEMUKAN:");
        console.log(authUrl);
        console.log("=================================");
      }
    } catch (error) {
      console.log("Gagal membaca manifest:", error.message);
    }
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

console.log("Menunggu manifest...");

for (let i = 0; i < 60 && !authUrl; i++) {
  await page.waitForTimeout(1000);
}

if (!authUrl) {
  console.error("AUTH URL tidak ditemukan.");
  await browser.close();
  process.exit(1);
}

console.log("Meminta AUTH URL...");

const response = await page.request.get(authUrl);

console.log("AUTH RESPONSE STATUS:", response.status());

const body = await response.text();

console.log("=================================");
console.log("ISI AUTH RESPONSE:");
console.log(body);
console.log("=================================");

await browser.close();
