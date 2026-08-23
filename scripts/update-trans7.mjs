import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

page.on("request", (request) => {
  const url = request.url();

  if (url.includes("dailymotion")) {
    console.log("DM REQUEST:", url);
  }
});

page.on("response", (response) => {
  const url = response.url();

  if (url.includes("dailymotion")) {
    console.log("DM RESPONSE:", response.status(), url);
  }
});

console.log("Membuka Dailymotion...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "networkidle",
    timeout: 60000
  }
);

console.log("Halaman selesai dimuat.");
console.log("Menunggu 30 detik...");

await page.waitForTimeout(30000);

await browser.close();

console.log("Selesai.");
