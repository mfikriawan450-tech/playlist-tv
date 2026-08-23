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
  }
});

const page = await context.newPage();

let found = false;

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("cdndirector.dailymotion.com") &&
    url.includes("/cdn/live/video/x8qckyq.m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("CDNDIRECTOR DITEMUKAN");
    console.log("=================================");
    console.log(url);
    console.log("=================================");

    found = true;
  }
});

console.log("Membuka Dailymotion Player Trans7...");

await page.goto(
  "https://sevenhub.id/live",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");
console.log("Menunggu cdndirector...");

for (let i = 0; i < 12; i++) {
  if (found) break;

  console.log(`Menunggu... ${i * 10}s`);
  await page.waitForTimeout(10000);
}

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("CDNDIRECTOR:", found);
console.log("=================================");

await browser.close();

if (!found) {
  process.exit(1);
}
