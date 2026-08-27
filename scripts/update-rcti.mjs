import { chromium } from "playwright";
import fs from "fs";

// ==========================================
// KONFIGURASI CHANNEL
// ==========================================

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    domain: "rcti-linier.rctiplus.id"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    domain: "mnctv-linier.rctiplus.id"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",
    domain: "gtv-linier.rctiplus.id"
  }
];

// ==========================================
// FUNGSI VALIDASI URL STREAM
// ==========================================

function isM3U8(url) {
  return url.includes(".m3u8");
}

function isChannelStream(url, channel) {
  return (
    isM3U8(url) &&
    url.includes(channel.domain)
  );
}

// ==========================================
// LAUNCH BROWSER
// ==========================================

console.log("");
console.log("=================================");
console.log("MEMULAI PLAYWRIGHT");
console.log("=================================");

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]
});

const results = [];

// ==========================================
// PROSES SETIAP CHANNEL
// ==========================================

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

  // ========================================
  // SCAN SEMUA REQUEST
  // ========================================

  page.on("request", (request) => {
    const url = request.url();

    // Tampilkan SEMUA request .m3u8
    if (isM3U8(url)) {
      console.log("");
      console.log("========== M3U8 TERDETEKSI ==========");
      console.log(`${channel.name}:`);
      console.log(url);
      console.log("=====================================");

      // Hanya ambil URL milik channel
      if (
        !streamUrl &&
        isChannelStream(url, channel)
      ) {
        streamUrl = url;

        console.log("");
        console.log("=================================");
        console.log(`${channel.name} STREAM DITEMUKAN`);
        console.log("Sumber: request .m3u8");
        console.log("=================================");
        console.log(streamUrl);
      }
    }
  });

  // ========================================
  // SCAN RESPONSE
  // ========================================

  page.on("response", (response) => {
    const url = response.url();

    if (isM3U8(url)) {
      console.log("");
      console.log("========== M3U8 RESPONSE ==========");
      console.log(`${channel.name}:`);
      console.log(`Status: ${response.status()}`);
      console.log(url);
      console.log("===================================");

      if (
        !streamUrl &&
        isChannelStream(url, channel)
      ) {
        streamUrl = url;

        console.log("");
        console.log("=================================");
        console.log(`${channel.name} STREAM DITEMUKAN`);
        console.log("Sumber: response .m3u8");
        console.log("=================================");
        console.log(streamUrl);
      }
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
      `${channel.name} gagal membuka halaman:`
    );
    console.error(error.message);
  }

  // ========================================
  // TUNGGU PLAYER
  // ========================================

  console.log(`${channel.name} menunggu player...`);

  for (let i = 0; i < 20 && !streamUrl; i++) {
    await page.waitForTimeout(1000);

    console.log(
      `${channel.name} masih menunggu... ${i + 1} detik`
    );
  }

  // ========================================
  // COBA VIDEO ELEMENT
  // ========================================

  if (!streamUrl) {
    const videos = await page.locator("video").all();

    console.log("");
    console.log(
      `${channel.name} jumlah video element: ${videos.length}`
    );

    for (let i = 0; i < videos.length && !streamUrl; i++) {
      try {
        await videos[i].evaluate((video) => {
          video.muted = true;

          try {
            video.setAttribute("playsinline", "");
          } catch {}

          try {
            video.play();
          } catch {}
        });

        console.log(
          `${channel.name} video ${i + 1} dicoba dijalankan.`
        );
      } catch (error) {
        console.log(
          `${channel.name} video ${i + 1} gagal dijalankan.`
        );
      }

      await page.waitForTimeout(2000);
    }
  }

  // ========================================
  // CARI TOMBOL PLAY
  // ========================================

  if (!streamUrl) {
    const selectors = [
      '[aria-label*="Play"]',
      'button[class*="play"]',
      '.jw-icon-playback',
      '.jw-display-icon-container',
      '.jw-button-color'
    ];

    for (const selector of selectors) {
      if (streamUrl) break;

      try {
        const buttons = await page.locator(selector).all();

        if (buttons.length > 0) {
          console.log(
            `${channel.name} menemukan tombol: ${selector}`
          );

          for (const button of buttons) {
            if (streamUrl) break;

            try {
              await button.click({
                timeout: 3000,
                force: true
              });

              await page.waitForTimeout(3000);
            } catch {}
          }
        }
      } catch {}
    }
  }

  // ========================================
  // TUNGGU LAGI SETELAH PLAY
  // ========================================

  if (!streamUrl) {
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
  }

  // ========================================
  // SCAN PERFORMANCE RESOURCE
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`SCAN RESOURCE ${channel.name}`);
    console.log("=================================");

    try {
      const resources = await page.evaluate(() => {
        return performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => url.includes(".m3u8"));
      });

      if (resources.length > 0) {
        for (const resource of resources) {
          console.log(resource);

          if (
            !streamUrl &&
            isChannelStream(resource, channel)
          ) {
            streamUrl = resource;

            console.log("");
            console.log(
              `${channel.name} STREAM DITEMUKAN DARI RESOURCE`
            );
            console.log(streamUrl);
          }
        }
      } else {
        console.log(
          `Tidak ada resource .m3u8 ${channel.name} yang terdeteksi.`
        );
      }
    } catch (error) {
      console.log(
        `Gagal membaca resource ${channel.name}:`,
        error.message
      );
    }
  }

  // ========================================
  // SCAN HTML
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`SCAN HTML ${channel.name}`);
    console.log("=================================");

    try {
      const html = await page.content();

      // Cari URL .m3u8 langsung dari HTML
      const matches = html.match(
        /https?:\/\/[^"'\\\s<>]+\.m3u8[^"'\\\s<>]*/gi
      );

      if (matches && matches.length > 0) {
        console.log(
          `${channel.name} menemukan ${matches.length} kandidat .m3u8`
        );

        for (const url of matches) {
          console.log("");
          console.log("KANDIDAT:");
          console.log(url);

          if (
            !streamUrl &&
            isChannelStream(url, channel)
          ) {
            streamUrl = url;

            console.log("");
            console.log(
              `${channel.name} STREAM DITEMUKAN DARI HTML`
            );
            console.log(streamUrl);
          }
        }
      } else {
        console.log(
          `Tidak ditemukan URL .m3u8 di HTML ${channel.name}.`
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
  // DEBUG VIDEO
  // ========================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN VIDEO ${channel.name}`);
    console.log("=================================");

    try {
      const videoInfo = await page.locator("video").evaluateAll(
        (videos) =>
          videos.map((video) => ({
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            networkState: video.networkState
          }))
      );

      console.log(
        JSON.stringify(videoInfo, null, 2)
      );
    } catch {}
  }

  // ========================================
  // HASIL CHANNEL
  // ========================================

  await page.close();
  await context.close();

  if (!streamUrl) {
    console.error("");
    console.error("=================================");
    console.error(
      `${channel.name}: URL STREAM TIDAK DITEMUKAN`
    );
    console.error("=================================");

    await browser.close();

    throw new Error(
      `${channel.name}: URL stream tidak ditemukan`
    );
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

// ==========================================
// TUTUP BROWSER
// ==========================================

await browser.close();

// ==========================================
// TAMPILKAN HASIL
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
// SIMPAN KE FILE
// ==========================================

console.log("");
console.log("=================================");
console.log("MENYIMPAN STREAM");
console.log("=================================");

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log(
    `${result.name} -> ${result.outputFile}`
  );
}

// ==========================================
// SELESAI
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
