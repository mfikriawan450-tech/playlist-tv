import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt"
  }
];

// ==========================================
// POLA STREAM
// ==========================================

function isStreamUrl(url, channelName) {
  const lower = url.toLowerCase();

  const host = `${channelName.toLowerCase()}-linier.rctiplus.id`;

  if (!lower.includes(host)) {
    return false;
  }

  if (!lower.includes(".m3u8")) {
    return false;
  }

  return true;
}

// ==========================================
// EKSTRAK URL DARI STRING
// ==========================================

function extractStreamUrl(text, channelName) {
  if (!text) {
    return null;
  }

  const host = `${channelName.toLowerCase()}-linier.rctiplus.id`;

  // Cari URL lengkap yang mengandung host channel
  const regex = new RegExp(
    `https?:\\/\\/${host.replace(/\./g, "\\.")}[^"'\\s<>\\\\]+\\.m3u8[^"'\\s<>\\\\]*`,
    "i"
  );

  const match = text.match(regex);

  if (match) {
    return match[0];
  }

  return null;
}

// ==========================================
// BROWSER
// ==========================================

const browser = await chromium.launch({
  headless: true
});

const results = [];

// ==========================================
// PROSES CHANNEL
// ==========================================

for (const channel of channels) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  let streamUrl = null;

  // ========================================
  // REQUEST
  // ========================================

  page.on("request", (request) => {
    const url = request.url();

    // Debug khusus GTV
    if (channel.name === "GTV") {
      if (url.includes("gtv-linier.rctiplus.id")) {
        console.log("");
        console.log("GTV REQUEST TERDETEKSI:");
        console.log(url);
      }
    }

    if (!streamUrl && isStreamUrl(url, channel.name)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("Sumber: request");
      console.log("=================================");
      console.log(streamUrl);
    }

    // RCTI/MNCTV juga bisa mendapatkan URL
    // melalui parameter JWPlayer "mu"
    if (!streamUrl && url.includes("jwpltx.com")) {
      try {
        const parsed = new URL(url);

        const mu = parsed.searchParams.get("mu");

        if (mu) {
          const decoded = decodeURIComponent(mu);

          if (isStreamUrl(decoded, channel.name)) {
            streamUrl = decoded;

            console.log("");
            console.log("=================================");
            console.log(`${channel.name} STREAM DITEMUKAN`);
            console.log("Sumber: request -> JWPlayer mu");
            console.log("=================================");
            console.log(streamUrl);
          }
        }
      } catch (error) {
        // Abaikan URL analytics yang tidak valid
      }
    }
  });

  // ========================================
  // RESPONSE
  // ========================================

  page.on("response", async (response) => {
    if (streamUrl) {
      return;
    }

    const url = response.url();

    if (isStreamUrl(url, channel.name)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("Sumber: response");
      console.log("=================================");
      console.log(streamUrl);
    }
  });

  // ========================================
  // CONSOLE BROWSER
  // ========================================

  page.on("console", (msg) => {
    const text = msg.text();

    if (
      text.toLowerCase().includes("gtv") ||
      text.toLowerCase().includes("m3u8") ||
      text.toLowerCase().includes("linier")
    ) {
      console.log(`BROWSER CONSOLE: ${text}`);
    }
  });

  // ========================================
  // BUKA HALAMAN
  // ========================================

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(`${channel.name} halaman berhasil dibuka.`);
  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  // ========================================
  // TUNGGU PLAYER
  // ========================================

  console.log("");
  console.log(`${channel.name} menunggu player...`);

  for (let i = 0; i < 15 && !streamUrl; i++) {
    await page.waitForTimeout(1000);

    console.log(
      `${channel.name} masih menunggu... ${i + 1} detik`
    );
  }

  // ========================================
  // CEK VIDEO
  // ========================================

  const videoCount = await page.locator("video").count();

  console.log("");
  console.log(
    `${channel.name} jumlah video element: ${videoCount}`
  );

  for (let i = 0; i < videoCount; i++) {
    try {
      const video = page.locator("video").nth(i);

      await video.evaluate((element) => {
        element.muted = true;
        element.play().catch(() => {});
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
  // KLIK PLAY
  // ========================================

  const playSelectors = [
    '[aria-label*="Play"]',
    'button[class*="play"]',
    '[title*="Play"]',
    '.jw-icon-playback',
    '.jw-display-icon-container'
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
          .click({ timeout: 5000 })
          .catch(() => {});
      }
    } catch {
      // lanjut selector berikutnya
    }
  }

  // ========================================
  // TUNGGU LAGI SETELAH PLAY
  // ========================================

  console.log("");
  console.log(
    `${channel.name} menunggu URL stream setelah Play...`
  );

  for (let i = 0; i < 30 && !streamUrl; i++) {
    await page.waitForTimeout(1000);

    if (i % 10 === 0) {
      console.log(
        `${channel.name} masih menunggu... ${i} detik`
      );
    }
  }

  // ========================================
  // PERIKSA VIDEO SRC
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN VIDEO ${channel.name}`);
    console.log("=================================");

    const videoSources = await page.locator("video").evaluateAll(
      (videos) =>
        videos.map((video) => ({
          src: video.src || "",
          currentSrc: video.currentSrc || ""
        }))
    );

    console.log(
      JSON.stringify(videoSources, null, 2)
    );

    for (const video of videoSources) {
      const candidates = [
        video.src,
        video.currentSrc
      ];

      for (const candidate of candidates) {
        if (
          candidate &&
          isStreamUrl(candidate, channel.name)
        ) {
          streamUrl = candidate;
          break;
        }
      }
    }
  }

  // ========================================
  // PERIKSA PERFORMANCE RESOURCE
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN RESOURCE ${channel.name}`);
    console.log("=================================");

    try {
      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
      );

      for (const resource of resources) {
        if (
          resource.toLowerCase().includes(
            `${channel.name.toLowerCase()}-linier`
          )
        ) {
          console.log(resource);
        }

        if (
          resource.toLowerCase().includes(".m3u8")
        ) {
          console.log(
            `M3U8 RESOURCE: ${resource}`
          );
        }
      }
    } catch (error) {
      console.log(
        "Gagal membaca performance resource:",
        error.message
      );
    }
  }

  // ========================================
  // PERIKSA HTML
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN HTML ${channel.name}`);
    console.log("=================================");

    try {
      const html = await page.content();

      const extracted = extractStreamUrl(
        html,
        channel.name
      );

      if (extracted) {
        streamUrl = extracted;

        console.log(
          `${channel.name} STREAM DITEMUKAN DARI HTML:`
        );

        console.log(streamUrl);
      } else {
        console.log(
          `Tidak ditemukan URL stream ${channel.name} di HTML.`
        );
      }
    } catch (error) {
      console.log(
        `Gagal membaca HTML ${channel.name}:`,
        error.message
      );
    }
  }

  // ========================================
  // HASIL
  // ========================================

  if (!streamUrl) {
    console.error("");
    console.error("=================================");
    console.error(
      `${channel.name}: URL STREAM TIDAK DITEMUKAN`
    );
    console.error("=================================");

    await page.close();
    await context.close();

    await browser.close();

    process.exit(1);
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });

  await page.close();
  await context.close();
}

// ==========================================
// SELESAI
// ==========================================

await browser.close();

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

// ==========================================
// SIMPAN FILE
// ==========================================

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log("");
  console.log(
    `${result.name} URL berhasil disimpan ke ${result.outputFile}`
  );

  console.log(result.url);
}

console.log("");
console.log("=================================");
console.log("SELESAI");
console.log("=================================");
