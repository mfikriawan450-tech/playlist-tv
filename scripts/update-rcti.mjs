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
      /^https:\/\/gtv-linier\.rctiplus\.id\/.*\.m3u8/
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

  const page = await browser.newPage();

  let streamUrl = null;

  // =========================================================
  // REQUEST DEBUG
  // =========================================================

  page.on("request", (request) => {
    const url = request.url();

    const lower = url.toLowerCase();

    // RCTI / MNCTV / GTV normal detection
    if (channel.pattern.test(url) && !streamUrl) {
      streamUrl = url;

      console.log("");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("Sumber: request");
      console.log("");
      console.log(streamUrl);
      console.log("");
    }

    // DEBUG KHUSUS GTV
    if (
      channel.name === "GTV" &&
      (
        lower.includes("gtv") ||
        lower.includes("linier") ||
        lower.includes("m3u8") ||
        lower.includes("hdntl") ||
        lower.includes("hls")
      )
    ) {
      console.log("");
      console.log("---------- GTV REQUEST ----------");
      console.log(request.method());
      console.log(url);
      console.log("---------------------------------");
    }
  });

  // =========================================================
  // RESPONSE DEBUG
  // =========================================================

  page.on("response", async (response) => {
    const url = response.url();
    const lower = url.toLowerCase();

    if (
      channel.name === "GTV" &&
      (
        lower.includes("gtv") ||
        lower.includes("linier") ||
        lower.includes("m3u8") ||
        lower.includes("hdntl") ||
        lower.includes("hls")
      )
    ) {
      console.log("");
      console.log("---------- GTV RESPONSE ----------");
      console.log(response.status());
      console.log(url);
      console.log("----------------------------------");
    }
  });

  // =========================================================
  // CONSOLE BROWSER
  // =========================================================

  page.on("console", (msg) => {
    if (channel.name === "GTV") {
      console.log("");
      console.log("GTV BROWSER CONSOLE:");
      console.log(msg.text());
    }
  });

  // =========================================================
  // PAGE ERROR
  // =========================================================

  page.on("pageerror", (error) => {
    if (channel.name === "GTV") {
      console.log("");
      console.log("GTV PAGE ERROR:");
      console.log(error.message);
    }
  });

  try {
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
    // CEK VIDEO
    // =======================================================

    const videoCount = await page.locator("video").count();

    console.log(
      `${channel.name} jumlah video element: ${videoCount}`
    );

    for (let i = 0; i < videoCount; i++) {
      try {
        await page.locator("video").nth(i).evaluate((video) => {
          video.muted = true;
          video.play().catch(() => {});
        });

        console.log(
          `${channel.name} video ${i + 1} dicoba dijalankan.`
        );
      } catch (error) {
        console.log(
          `${channel.name} video ${i + 1} gagal: ${error.message}`
        );
      }
    }

    // =======================================================
    // CARI TOMBOL PLAY
    // =======================================================

    const selectors = [
      '[aria-label*="Play"]',
      '[aria-label*="play"]',
      'button[class*="play"]',
      '[class*="play"]'
    ];

    for (const selector of selectors) {
      try {
        const count = await page.locator(selector).count();

        if (count > 0) {
          console.log(
            `${channel.name} menemukan tombol: ${selector}`
          );

          for (let i = 0; i < Math.min(count, 3); i++) {
            try {
              await page.locator(selector).nth(i).click({
                timeout: 3000
              });

              console.log(
                `${channel.name} tombol play ${i + 1} diklik.`
              );
            } catch {}
          }
        }
      } catch {}
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
    // KHUSUS GTV:
    // CEK VIDEO SRC
    // =======================================================

    if (channel.name === "GTV" && !streamUrl) {
      console.log("");
      console.log("=================================");
      console.log("PEMERIKSAAN VIDEO GTV");
      console.log("=================================");

      const videos = await page.locator("video").evaluateAll(
        (elements) =>
          elements.map((video) => ({
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            networkState: video.networkState
          }))
      );

      console.log(JSON.stringify(videos, null, 2));
    }

    // =======================================================
    // KHUSUS GTV:
    // CEK SOURCE TAG
    // =======================================================

    if (channel.name === "GTV" && !streamUrl) {
      console.log("");
      console.log("=================================");
      console.log("PEMERIKSAAN SOURCE GTV");
      console.log("=================================");

      const sources = await page.locator("source").evaluateAll(
        (elements) =>
          elements.map((source) => ({
            src: source.src,
            type: source.type
          }))
      );

      console.log(JSON.stringify(sources, null, 2));
    }

    // =======================================================
    // KHUSUS GTV:
    // CEK PERFORMANCE RESOURCE
    // =======================================================

    if (channel.name === "GTV" && !streamUrl) {
      console.log("");
      console.log("=================================");
      console.log("PEMERIKSAAN RESOURCE GTV");
      console.log("=================================");

      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => {
            const lower = url.toLowerCase();

            return (
              lower.includes("gtv") ||
              lower.includes("linier") ||
              lower.includes("m3u8") ||
              lower.includes("hdntl") ||
              lower.includes("hls")
            );
          })
      );

      if (resources.length === 0) {
        console.log("Tidak ada resource terkait GTV.");
      } else {
        for (const resource of resources) {
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

  // =========================================================
  // JIKA TIDAK DITEMUKAN
  // =========================================================

  if (!streamUrl) {
    console.error("");
    console.error(
      `${channel.name}: URL stream tidak ditemukan.`
    );

    if (channel.name === "GTV") {
      console.error("");
      console.error(
        "DEBUG GTV selesai. Lihat log REQUEST, RESPONSE,"
      );
      console.error(
        "VIDEO, SOURCE, dan RESOURCE di atas."
      );
    }

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

// ===========================================================
// HASIL
// ===========================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log(`${result.name}: ${result.url}`);
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

  console.log(
    `${result.name} URL berhasil disimpan ke ${result.outputFile}.`
  );
}

console.log("");
console.log("=================================");
console.log("SEMUA FILE STREAM BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
