import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled"
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

console.log("Membuka Live Trans7 20Detik...");

page.on("request", (request) => {
  const url = request.url();

  if (
    url.includes(".m3u8") ||
    url.includes("chunklist") ||
    url.includes("video.detik.com")
  ) {
    console.log("");
    console.log("REQUEST:");
    console.log(url);
  }
});

page.on("response", (response) => {
  const url = response.url();

  if (
    url.includes(".m3u8") ||
    url.includes("chunklist")
  ) {
    console.log("");
    console.log("RESPONSE:");
    console.log(response.status(), url);
  }
});

try {
await page.goto(
  "https://20.detik.com/live/trans-7",
  {
    waitUntil: "commit",
    timeout: 30000
  }
);

console.log("Navigasi halaman berhasil dimulai.");

  console.log("Halaman Trans7 mulai dimuat.");
} catch (error) {
  console.error("Gagal membuka halaman:", error.message);
  await browser.close();
  process.exit(1);
}

// Beri waktu halaman membangun iframe/player
await page.waitForTimeout(10000);

console.log("");
console.log("=================================");
console.log("FRAME YANG TERDETEKSI");
console.log("=================================");

for (const frame of page.frames()) {
  console.log("FRAME:", frame.url());
}

console.log("");
console.log("=================================");
console.log("IFRAME");
console.log("=================================");

const iframes = await page.locator("iframe").count();

console.log("Jumlah iframe:", iframes);

for (let i = 0; i < iframes; i++) {
  try {
    const src = await page
      .locator("iframe")
      .nth(i)
      .getAttribute("src");

    console.log(`iframe ${i}:`, src);
  } catch {}
}

// Coba scroll ke player
try {
  const video = page.locator("video").first();

  if (await video.count()) {
    await video.scrollIntoViewIfNeeded();

    console.log("Video ditemukan.");

    await video.evaluate((element) => {
      element.muted = true;

      const p = element.play();

      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    });

    console.log("Video play() dipanggil.");
  }
} catch (error) {
  console.log("Video tidak bisa dijalankan:", error.message);
}

// Coba menjalankan video di setiap frame
for (const frame of page.frames()) {
  try {
    const videos = await frame.locator("video").count();

    if (videos > 0) {
      console.log(
        `Frame ${frame.url()} memiliki ${videos} video.`
      );

      for (let i = 0; i < videos; i++) {
        await frame
          .locator("video")
          .nth(i)
          .evaluate((element) => {
            element.muted = true;

            const p = element.play();

            if (p && typeof p.catch === "function") {
              p.catch(() => {});
            }
          });
      }
    }
  } catch {}
}

console.log("");
console.log("Menunggu request HLS...");

for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(1000);

  if (i % 5 === 0) {
    console.log(`Menunggu... ${i}s`);
  }
}

await browser.close();

console.log("");
console.log("=================================");
console.log("SELESAI DIAGNOSTIC");
console.log("=================================");
