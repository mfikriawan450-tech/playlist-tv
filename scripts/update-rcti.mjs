import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    pattern:
      /https:\/\/rcti-linier\.rctiplus\.id\/rcti-sdi\.m3u8\?hdnts=[^\s"']+/
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    pattern:
      /https:\/\/mnctv-linier\.rctiplus\.id\/mnctv-sdi\.m3u8\?hdnts=[^\s"']+/
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",
    pattern:
      /^https:\/\/gtv-linier\.rctiplus\.id\/.*\/gtv-sdi-avc1_.*\.m3u8(?:\?.*)?$/
  }
];

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled"
  ]
});

const results = [];

for (const channel of channels) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage({
    viewport: {
      width: 1920,
      height: 1080
    }
  });

  let streamUrl = null;

  // ==========================================
  // REQUEST LISTENER
  // ==========================================

  page.on("request", (request) => {
    const url = request.url();

    // Debug khusus GTV
    if (
      channel.name === "GTV" &&
      url.includes("gtv-linier.rctiplus.id")
    ) {
      console.log("");
      console.log("GTV REQUEST:");
      console.log(url);
    }

    // ========================================
    // RCTI / MNCTV
    // ========================================

    if (
      channel.name !== "GTV" &&
      channel.pattern.test(url) &&
      !streamUrl
    ) {
      streamUrl = url;

      console.log("");
      console.log(`${channel.name} STREAM DITEMUKAN:`);
      console.log(streamUrl);
      console.log("");
    }

    // ========================================
    // GTV
    // ========================================

    if (
      channel.name === "GTV" &&
      url.includes("gtv-linier.rctiplus.id") &&
      url.includes("/hdntl=") &&
      url.includes("gtv-sdi-avc1_") &&
      url.includes(".m3u8") &&
      !streamUrl
    ) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log("GTV STREAM DITEMUKAN");
      console.log("=================================");
      console.log(streamUrl);
      console.log("");
    }
  });

  // ==========================================
  // RESPONSE LISTENER
  // ==========================================

  page.on("response", (response) => {
    const url = response.url();

    if (
      channel.name === "GTV" &&
      url.includes("gtv-linier.rctiplus.id") &&
      url.includes(".m3u8")
    ) {
      console.log("");
      console.log("GTV RESPONSE:");
      console.log(response.status());
      console.log(url);
    }
  });

  try {
    // ========================================
    // BUKA HALAMAN
    // ========================================

    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(`${channel.name} halaman berhasil dibuka.`);

    // ========================================
    // TUNGGU AWAL
    // ========================================

    await page.waitForTimeout(5000);

    // ========================================
    // SCROLL
    // ========================================

    await page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight / 3,
        behavior: "instant"
      });
    });

    await page.waitForTimeout(2000);

    // ========================================
    // COBA JALANKAN SEMUA VIDEO
    // ========================================

    const videoCount = await page.locator("video").count();

    console.log(
      `${channel.name} jumlah video element: ${videoCount}`
    );

    for (let i = 0; i < videoCount; i++) {
      try {
        const video = page.locator("video").nth(i);

        await video.scrollIntoViewIfNeeded();

        await video.click({
          position: {
            x: 100,
            y: 100
          },
          timeout: 5000
        }).catch(() => {});

        await video.evaluate((element) => {
          element.muted = true;

          const playPromise = element.play();

          if (playPromise) {
            playPromise.catch(() => {});
          }
        });

        console.log(
          `${channel.name} video ${i + 1} dicoba dijalankan.`
        );
      } catch (error) {
        console.log(
          `${channel.name} video ${i + 1} gagal dijalankan.`
        );
      }
    }

    // ========================================
    // COBA KLIK TOMBOL PLAY
    // ========================================

    const playSelectors = [
      'button[aria-label*="Play"]',
      'button[aria-label*="play"]',
      '[aria-label*="Play"]',
      '[aria-label*="play"]',
      'button[class*="play"]',
      'button[class*="Play"]'
    ];

    for (const selector of playSelectors) {
      try {
        const count = await page.locator(selector).count();

        if (count > 0) {
          console.log(
            `${channel.name} menemukan tombol: ${selector}`
          );

          await page
            .locator(selector)
            .first()
            .click({
              timeout: 3000
            })
            .catch(() => {});
        }
      } catch {}
    }

    // ========================================
    // TUNGGU STREAM
    // ========================================

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

    // ========================================
    // PERFORMANCE RESOURCE CHECK
    // ========================================

    if (!streamUrl && channel.name === "GTV") {
      console.log("");
      console.log("=================================");
      console.log("PEMERIKSAAN RESOURCE GTV");
      console.log("=================================");

      const resources = await page.evaluate(() => {
        return performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) =>
            url.includes("gtv-linier.rctiplus.id")
          );
      });

      if (resources.length === 0) {
        console.log(
          "Tidak ada resource gtv-linier yang terdeteksi."
        );
      } else {
        for (const resource of resources) {
          console.log("GTV RESOURCE:");
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

  await page.close();

  // ==========================================
  // CEK HASIL
  // ==========================================

  if (!streamUrl) {
    console.error("");
    console.error(
      `${channel.name}: URL stream tidak ditemukan.`
    );

    await browser.close();
    process.exit(1);
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

await browser.close();

// ==========================================
// HASIL SEMUA STREAM
// ==========================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.name}:`);
  console.log(result.url);
}

// ==========================================
// SIMPAN FILE
// ==========================================

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log(
    `${result.name} URL berhasil disimpan ke ${result.outputFile}.`
  );
}

// ==========================================
// HASIL AKHIR
// ==========================================

console.log("");
console.log("=================================");
console.log("SEMUA FILE STREAM BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
