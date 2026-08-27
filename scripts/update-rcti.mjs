import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",

    match: (url) =>
      url.includes("rcti-linier.rctiplus.id") &&
      url.includes(".m3u8")
  },

  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",

    match: (url) =>
      url.includes("mnctv-linier.rctiplus.id") &&
      url.includes(".m3u8")
  },

  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",

    match: (url) =>
      url.includes("gtv-linier.rctiplus.id") &&
      url.includes(".m3u8")
  }
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

for (const channel of channels) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 720
    },

    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  let streamUrl = null;

  // =========================================================
  // FUNGSI UNTUK MENYIMPAN URL
  // =========================================================

  const checkUrl = (url, source = "unknown") => {
    if (!url) return;

    if (!streamUrl && channel.match(url)) {
      streamUrl = url;

      console.log("");
      console.log(`=================================`);
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log(`Sumber: ${source}`);
      console.log(`=================================`);
      console.log(streamUrl);
      console.log("");
    }
  };

  // =========================================================
  // REQUEST
  // =========================================================

  page.on("request", (request) => {
    checkUrl(request.url(), "request");
  });

  // =========================================================
  // RESPONSE
  // =========================================================

  page.on("response", (response) => {
    checkUrl(response.url(), "response");
  });

  // =========================================================
  // REQUEST FINISHED
  // =========================================================

  page.on("requestfinished", (request) => {
    checkUrl(request.url(), "requestfinished");
  });

  // =========================================================
  // REQUEST FAILED
  // =========================================================

  page.on("requestfailed", (request) => {
    const url = request.url();

    if (
      url.includes("linier.rctiplus.id") &&
      url.includes(".m3u8")
    ) {
      console.log("");
      console.log(`${channel.name} REQUEST STREAM GAGAL:`);
      console.log(url);
      console.log("Alasan:", request.failure()?.errorText);
      console.log("");
    }
  });

  try {
    // =======================================================
    // BUKA HALAMAN
    // =======================================================

    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(`${channel.name} halaman berhasil dibuka.`);

    // =======================================================
    // TUNGGU HALAMAN SELESAI LOAD
    // =======================================================

    await page.waitForTimeout(5000);

    // =======================================================
    // CEK VIDEO ELEMENT
    // =======================================================

    const videoCount = await page.locator("video").count();

    console.log(
      `${channel.name} jumlah video element: ${videoCount}`
    );

    for (let i = 0; i < videoCount; i++) {
      try {
        await page.locator("video").nth(i).evaluate((video) => {
          video.muted = true;

          const promise = video.play();

          if (promise) {
            promise.catch(() => {});
          }
        });

        console.log(
          `${channel.name} video ${i + 1} dicoba dijalankan.`
        );
      } catch {
        console.log(
          `${channel.name} video ${i + 1} gagal dijalankan.`
        );
      }
    }

    // =======================================================
    // CARI TOMBOL PLAY
    // =======================================================

    const playSelectors = [
      '[aria-label*="Play"]',
      '[aria-label*="play"]',
      'button[class*="play"]',
      '[class*="play-button"]',
      '[class*="PlayButton"]'
    ];

    for (const selector of playSelectors) {
      try {
        const count = await page.locator(selector).count();

        if (count > 0) {
          console.log(
            `${channel.name} menemukan tombol: ${selector}`
          );

          for (let i = 0; i < count; i++) {
            try {
              await page.locator(selector).nth(i).click({
                timeout: 3000
              });

              await page.waitForTimeout(2000);
            } catch {
              // Abaikan tombol yang tidak bisa diklik
            }
          }
        }
      } catch {
        // Abaikan selector bermasalah
      }
    }

    // =======================================================
    // TUNGGU STREAM
    // =======================================================

    console.log(
      `${channel.name} menunggu URL stream...`
    );

    for (let i = 0; i < 60 && !streamUrl; i++) {
      await page.waitForTimeout(1000);

      if (i % 10 === 0) {
        console.log(
          `${channel.name} masih menunggu... ${i} detik`
        );
      }
    }

    // =======================================================
    // CEK PERFORMANCE RESOURCE
    // =======================================================

    if (!streamUrl) {
      console.log("");
      console.log("=================================");
      console.log(`PEMERIKSAAN RESOURCE ${channel.name}`);
      console.log("=================================");

      const resources = await page.evaluate(() => {
        return performance
          .getEntriesByType("resource")
          .map((entry) => entry.name);
      });

      for (const resource of resources) {
        if (
          resource.includes("linier.rctiplus.id") &&
          resource.includes(".m3u8")
        ) {
          console.log("Resource ditemukan:");
          console.log(resource);

          checkUrl(resource, "performance");

          if (streamUrl) {
            break;
          }
        }
      }

      if (!streamUrl) {
        console.log(
          `Tidak ada resource ${channel.name}-linier yang terdeteksi.`
        );
      }
    }

    // =======================================================
    // CEK SEMUA REQUEST STREAM YANG TERLIHAT
    // =======================================================

    if (!streamUrl) {
      console.log("");
      console.log("=================================");
      console.log(`DEBUG URL ${channel.name}`);
      console.log("=================================");

      const resources = await page.evaluate(() => {
        return performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) =>
            url.includes("rctiplus")
          );
      });

      for (const resource of resources) {
        if (
          resource.includes(".m3u8") ||
          resource.includes("linier")
        ) {
          console.log(resource);
        }
      }
    }
  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  // =========================================================
  // HASIL
  // =========================================================

  await page.close();
  await context.close();

  if (!streamUrl) {
    console.error("");
    console.error(
      `${channel.name}: URL stream tidak ditemukan.`
    );
    console.error("");

    await browser.close();
    process.exit(1);
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

// ===========================================================
// TUTUP BROWSER
// ===========================================================

await browser.close();

// ===========================================================
// TAMPILKAN HASIL
// ===========================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.name}:`);
  console.log(result.url);
}

// ===========================================================
// SIMPAN FILE
// ===========================================================

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log("");
  console.log(
    `${result.name} URL berhasil disimpan ke ${result.outputFile}.`
  );
}

// ===========================================================
// SELESAI
// ===========================================================

console.log("");
console.log("=================================");
console.log("SEMUA FILE STREAM BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
