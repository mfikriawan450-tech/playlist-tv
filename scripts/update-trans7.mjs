import { chromium } from "playwright";

const PAGE_URL = "https://20.detik.com/live/trans-7";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox"
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

let hlsRequest = null;

// ==========================================
// TANGKAP REQUEST HLS
// ==========================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    if (!hlsRequest) {
      hlsRequest = {
        url,
        headers: request.headers()
      };

      console.log("");
      console.log("=================================");
      console.log("HLS REQUEST DITEMUKAN");
      console.log("=================================");
      console.log("URL:");
      console.log(url);

      console.log("");
      console.log("HEADERS:");
      console.log(JSON.stringify(
        request.headers(),
        null,
        2
      ));
    }
  }
});

// ==========================================
// BUKA HALAMAN
// ==========================================

try {
  console.log("Membuka Live Trans7 20Detik...");

  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000
  });

  console.log("Halaman Trans7 terbuka.");

} catch (error) {

  console.log("");
  console.log("Navigasi mengalami masalah:");
  console.log(error.message);

  console.log("");
  console.log("Tetap menunggu request HLS...");
}

// ==========================================
// TUNGGU PLAYER
// ==========================================

await page.waitForTimeout(10000);

// ==========================================
// PLAY VIDEO
// ==========================================

console.log("");
console.log("Mencari video player...");

for (const frame of page.frames()) {

  try {

    const videoCount = await frame
      .locator("video")
      .count();

    if (videoCount > 0) {

      console.log(
        `Frame memiliki ${videoCount} video.`
      );

      for (let i = 0; i < videoCount; i++) {

        try {

          await frame
            .locator("video")
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

// ==========================================
// KLIK PLAYER
// ==========================================

try {

  await page.mouse.click(640, 360);

  console.log("Player diklik.");

} catch {}

// ==========================================
// TUNGGU HLS
// ==========================================

console.log("");
console.log("Menunggu HLS...");

for (
  let i = 0;
  i < 60 && !hlsRequest;
  i++
) {

  await page.waitForTimeout(2000);

  if (i % 5 === 0) {
    console.log(
      `Menunggu HLS... ${i * 2}s`
    );
  }
}

// ==========================================
// HASIL
// ==========================================

console.log("");
console.log("=================================");
console.log("HASIL DIAGNOSTIK");
console.log("=================================");

if (!hlsRequest) {

  console.error(
    "HLS playlist tidak ditemukan."
  );

  await browser.close();
  process.exit(1);
}

console.log("");
console.log("URL HLS:");
console.log(hlsRequest.url);

console.log("");
console.log("=================================");
console.log("HEADER YANG DIGUNAKAN BROWSER");
console.log("=================================");

for (
  const [name, value]
  of Object.entries(hlsRequest.headers)
) {

  console.log(
    `${name}: ${value}`
  );

}

// ==========================================
// TEST URL DENGAN HEADER YANG SAMA
// ==========================================

console.log("");
console.log("=================================");
console.log("TEST URL DENGAN HEADER BROWSER");
console.log("=================================");

try {

  const response = await page.request.get(
    hlsRequest.url,
    {
      headers: hlsRequest.headers
    }
  );

  console.log(
    "STATUS:",
    response.status()
  );

  console.log(
    "CONTENT-TYPE:",
    response.headers()["content-type"]
  );

  const body = await response.text();

  console.log(
    "UKURAN RESPONSE:",
    body.length
  );

  console.log("");
  console.log("AWAL RESPONSE:");
  console.log(
    body.substring(0, 1000)
  );

} catch (error) {

  console.error(
    "Gagal melakukan test:",
    error.message
  );

}

// ==========================================
// TEST URL TANPA HEADER KHUSUS
// ==========================================

console.log("");
console.log("=================================");
console.log("TEST URL TANPA HEADER BROWSER");
console.log("=================================");

try {

  const response = await page.request.get(
    hlsRequest.url
  );

  console.log(
    "STATUS:",
    response.status()
  );

  console.log(
    "CONTENT-TYPE:",
    response.headers()["content-type"]
  );

} catch (error) {

  console.error(
    "Gagal melakukan test:",
    error.message
  );

}

// ==========================================
// SELESAI
// ==========================================

await browser.close();

console.log("");
console.log("=================================");
console.log("DIAGNOSTIK SELESAI");
console.log("=================================");
