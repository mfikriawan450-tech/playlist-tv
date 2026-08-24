import { chromium } from "playwright";

const PAGE_URL = "https://20.detik.com/live/trans-7";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled"
  ]
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

let found = null;

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com") &&
    url.includes("trans7-sec") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("HLS DITEMUKAN");
    console.log("=================================");
    console.log(url);

    found = url;
  }
});

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("video.detik.com") &&
    url.includes("trans7-sec") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("HLS RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);
  }
});

console.log("Membuka halaman Trans7...");

try {
  await page.goto(PAGE_URL, {
    waitUntil: "commit",
    timeout: 15000
  });
} catch (error) {
  console.log("");
  console.log("GOTO ERROR:");
  console.log(error.message);
}

console.log("");
console.log("Menunggu request selama 60 detik...");

for (let i = 0; i < 30 && !found; i++) {
  await page.waitForTimeout(2000);

  if (i % 5 === 0) {
    console.log(`Menunggu... ${i * 2}s`);
  }
}

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("=================================");

if (found) {
  console.log("HLS:", found);
} else {
  console.log("HLS TIDAK DITEMUKAN");
}

await browser.close();

if (!found) {
  process.exit(1);
}
