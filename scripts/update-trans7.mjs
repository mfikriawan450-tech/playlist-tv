import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

page.on("response", async (response) => {
  const url = response.url();

  if (
    url.includes(
      "dmxleo.dailymotion.com/cdn/manifest/video/x8qckyq.m3u8"
    )
  ) {
    console.log("=================================");
    console.log("MANIFEST RESPONSE:", response.status());
    console.log("=================================");

    try {
      const body = await response.text();

      console.log("===== ISI MANIFEST =====");
      console.log(body);
      console.log("========================");
    } catch (error) {
      console.log("Gagal membaca response:", error.message);
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

console.log("Player terbuka.");
console.log("Menunggu manifest...");

await page.waitForTimeout(30000);

await browser.close();

console.log("Selesai.");
