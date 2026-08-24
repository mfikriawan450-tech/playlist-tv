import { chromium } from "playwright";

const PAGE_URL = "https://sevenhub.id/live";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

let streamUrl = null;

// =====================================================
// DETEKSI REQUEST M3U8 DAILYMOTION
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("cf.dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("M3U8 DAILYMOTION DITEMUKAN");
    console.log("=================================");
    console.log(url);

    // Prioritaskan stream Trans7 240p
    if (
      url.includes("x8qckyq") &&
      url.includes("live-240.m3u8")
    ) {
      streamUrl = url;

      console.log("");
      console.log("TARGET TRANS7 DITEMUKAN!");
    }

    // Fallback jika nama/struktur URL berubah
    else if (
      url.includes("live-240.m3u8") &&
      !streamUrl
    ) {
      streamUrl = url;

      console.log("");
      console.log("STREAM 240P DITEMUKAN!");
    }
  }
});

// =====================================================
// DETEKSI RESPONSE M3U8
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("cf.dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("M3U8 RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);

    if (
      response.status() === 200 &&
      url.includes("x8qckyq") &&
      url.includes("live-240.m3u8")
    ) {
      streamUrl = url;

      console.log("");
      console.log("TARGET TRANS7 RESPONSE 200!");
    }
  }
});

// =====================================================
// REQUEST ERROR
// =====================================================

page.on("requestfailed", request => {
  const url = request.url();

  if (url.includes("cf.dmcdn.net")) {
    console.log("");
    console.log("DAILYMOTION REQUEST FAILED");
    console.log(url);
    console.log(
      request.failure()?.errorText
    );
  }
});

// =====================================================
// BUKA SEVENHUB
// =====================================================

console.log("");
console.log("=================================");
console.log("MEMBUKA SEVENHUB");
console.log("=================================");
console.log(PAGE_URL);

try {
  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  console.log("SevenHub berhasil dibuka.");

} catch (error) {

  console.log("");
  console.log("Gagal membuka SevenHub:");
  console.log(error.message);

  await browser.close();
  process.exit(1);
}

// =====================================================
// TUNGGU PLAYER
// =====================================================

console.log("");
console.log("Menunggu player...");
console.log("Tunggu 10 detik agar stream mulai...");

await page.waitForTimeout(10000);

// =====================================================
// TAMPILKAN FRAME
// =====================================================

console.log("");
console.log("=================================");
console.log("FRAME YANG TERBUKA");
console.log("=================================");

for (const frame of page.frames()) {
  console.log(frame.url());
}

// =====================================================
// PLAY SEMUA VIDEO
// =====================================================

console.log("");
console.log("Mencari video player...");

for (const frame of page.frames()) {

  try {

    const videos = frame.locator("video");
    const count = await videos.count();

    if (count > 0) {

      console.log(
        `Frame memiliki ${count} video.`
      );

      for (let i = 0; i < count; i++) {

        try {

          await videos
            .nth(i)
            .evaluate(video => {

              video.muted = true;

              const promise = video.play();

              if (
                promise &&
                typeof promise.catch === "function"
              ) {
                promise.catch(() => {});
              }

            });

          console.log(
            `Video ${i} diperintahkan play.`
          );

        } catch (error) {

          console.log(
            `Video ${i} gagal play:`,
            error.message
          );

        }
      }
    }

  } catch {}

}

// =====================================================
// KLIK PLAYER
// =====================================================

try {

  await page.mouse.click(640, 360);

  console.log("Player diklik.");

} catch {}

// =====================================================
// TUNGGU STREAM
// =====================================================

console.log("");
console.log("Menunggu M3U8 Dailymotion...");

for (
  let i = 0;
  i < 30 && !streamUrl;
  i++
) {

  await page.waitForTimeout(2000);

  if (i % 5 === 0) {
    console.log(
      `Menunggu HLS... ${i * 2}s`
    );
  }
}

// =====================================================
// HASIL
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (!streamUrl) {

  console.error(
    "GAGAL: M3U8 Dailymotion Trans7 tidak ditemukan."
  );

  await browser.close();
  process.exit(1);
}

console.log("");
console.log("URL TRANS7:");
console.log(streamUrl);

// =====================================================
// TUTUP
// =====================================================

await browser.close();

console.log("");
console.log("=================================");
console.log("DETECTOR BERHASIL");
console.log("=================================");
