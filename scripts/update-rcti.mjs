import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",

    // RCTI biasanya:
    // https://rcti-linier.rctiplus.id/rcti-sdi.m3u8?hdnts=...
    patterns: [
      /https:\/\/rcti-linier\.rctiplus\.id\/rcti-sdi\.m3u8\?hdnts=[^\s"'<>]+/,
      /https:\/\/rcti-linier\.rctiplus\.id\/hdntl=[^\s"'<>]+\/rcti-sdi-[^\s"'<>]+\.m3u8/
    ]
  },

  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",

    patterns: [
      /https:\/\/mnctv-linier\.rctiplus\.id\/mnctv-sdi\.m3u8\?hdnts=[^\s"'<>]+/,
      /https:\/\/mnctv-linier\.rctiplus\.id\/hdntl=[^\s"'<>]+\/mnctv-sdi-[^\s"'<>]+\.m3u8/
    ]
  },

  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",

    patterns: [
      // Format GTV lama / langsung
      /https:\/\/gtv-linier\.rctiplus\.id\/gtv-sdi\.m3u8\?hdnts=[^\s"'<>]+/,

      // Format GTV yang kamu temukan:
      // https://gtv-linier.rctiplus.id/hdntl=.../gtv-sdi-avc1_600000=5-mp4a_96000=1.m3u8
      /https:\/\/gtv-linier\.rctiplus\.id\/hdntl=[^\s"'<>]+\/gtv-sdi-[^\s"'<>]+\.m3u8/
    ]
  }
];

function findStream(text, channel) {
  if (!text) return null;

  // Bersihkan karakter escape yang kadang muncul
  const cleanText = text
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/");

  for (const pattern of channel.patterns) {
    const match = cleanText.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function isLikelyStream(url) {
  if (!url) return false;

  return (
    url.includes("-linier.rctiplus.id/") &&
    url.includes(".m3u8") &&
    (
      url.includes("hdnts=") ||
      url.includes("/hdntl=")
    )
  );
}

async function extractFromPage(page, channel) {
  let streamUrl = null;

  // ==========================================================
  // 1. REQUEST
  // ==========================================================

  page.on("request", (request) => {
    if (streamUrl) return;

    const url = request.url();

    const found = findStream(url, channel);

    if (found && isLikelyStream(found)) {
      streamUrl = found;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("Sumber: request");
      console.log("=================================");
      console.log(streamUrl);
    }
  });

  // ==========================================================
  // 2. RESPONSE
  // ==========================================================

  page.on("response", async (response) => {
    if (streamUrl) return;

    const url = response.url();

    const foundUrl = findStream(url, channel);

    if (foundUrl && isLikelyStream(foundUrl)) {
      streamUrl = foundUrl;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("Sumber: response URL");
      console.log("=================================");
      console.log(streamUrl);

      return;
    }

    // Coba membaca response text untuk request API/config
    // yang mungkin mengandung URL stream.
    try {
      const contentType =
        response.headers()["content-type"] || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/") ||
        contentType.includes("javascript")
      ) {
        const text = await response.text();

        const found = findStream(text, channel);

        if (found && isLikelyStream(found)) {
          streamUrl = found;

          console.log("");
          console.log("=================================");
          console.log(`${channel.name} STREAM DITEMUKAN`);
          console.log("Sumber: response body");
          console.log("=================================");
          console.log(streamUrl);
        }
      }
    } catch {
      // Abaikan response yang tidak dapat dibaca
    }
  });

  // ==========================================================
  // 3. GOTO
  // ==========================================================

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

  // ==========================================================
  // 4. TUNGGU PLAYER
  // ==========================================================

  console.log(`${channel.name} menunggu player...`);

  for (let i = 0; i < 15 && !streamUrl; i++) {
    await page.waitForTimeout(1000);

    if (!streamUrl) {
      console.log(
        `${channel.name} masih menunggu... ${i + 1} detik`
      );
    }
  }

  // ==========================================================
  // 5. VIDEO ELEMENT
  // ==========================================================

  if (!streamUrl) {
    const videos = await page.locator("video").count();

    console.log(
      `${channel.name} jumlah video element: ${videos}`
    );

    for (let i = 0; i < videos && !streamUrl; i++) {
      try {
        const video = page.locator("video").nth(i);

        await video.evaluate((element) => {
          try {
            element.muted = true;

            const result = element.play();

            if (result) {
              result.catch(() => {});
            }
          } catch {}
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
  }

  // ==========================================================
  // 6. KLIK PLAY
  // ==========================================================

  if (!streamUrl) {
    const selectors = [
      '[aria-label*="Play"]',
      'button[class*="play"]',
      ".jw-icon-playback",
      ".jw-display-icon-container",
      ".jw-button-container"
    ];

    for (const selector of selectors) {
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
              timeout: 5000
            })
            .catch(() => {});
        }
      } catch {
        // lanjut selector berikutnya
      }
    }
  }

  // ==========================================================
  // 7. KHUSUS GTV:
  // SCAN DOM / HTML / ATRIBUT
  // ==========================================================

  if (!streamUrl) {
    console.log("");
    console.log("=================================");
    console.log(`SCAN HALAMAN ${channel.name}`);
    console.log("=================================");

    try {
      const pageData = await page.evaluate(() => {
        const values = [];

        // HTML lengkap
        values.push(document.documentElement?.outerHTML || "");

        // Semua atribut elemen
        for (const element of document.querySelectorAll("*")) {
          for (const attribute of element.attributes || []) {
            values.push(attribute.value);
          }
        }

        // Script
        for (const script of document.scripts) {
          values.push(script.textContent || "");
          values.push(script.src || "");
        }

        // Video
        for (const video of document.querySelectorAll("video")) {
          values.push(video.src || "");
          values.push(video.currentSrc || "");
          values.push(video.outerHTML || "");
        }

        return values.join("\n");
      });

      const found = findStream(pageData, channel);

      if (found && isLikelyStream(found)) {
        streamUrl = found;

        console.log("");
        console.log("=================================");
        console.log(`${channel.name} STREAM DITEMUKAN`);
        console.log("Sumber: DOM / HTML / SCRIPT");
        console.log("=================================");
        console.log(streamUrl);
      }
    } catch (error) {
      console.error(
        `${channel.name} scan halaman gagal:`,
        error.message
      );
    }
  }

  // ==========================================================
  // 8. KHUSUS GTV:
  // CARI SEMUA URL DI PERFORMANCE RESOURCE
  // ==========================================================

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
        const found = findStream(resource, channel);

        if (found && isLikelyStream(found)) {
          streamUrl = found;

          console.log("");
          console.log("=================================");
          console.log(`${channel.name} STREAM DITEMUKAN`);
          console.log("Sumber: performance resource");
          console.log("=================================");
          console.log(streamUrl);

          break;
        }
      }

      if (!streamUrl) {
        console.log(
          `Tidak ada resource ${channel.name}-linier yang terdeteksi.`
        );
      }
    } catch (error) {
      console.error(
        `${channel.name} pemeriksaan resource gagal:`,
        error.message
      );
    }
  }

  // ==========================================================
  // 9. TUNGGU TAMBAHAN SETELAH PLAY
  // ==========================================================

  if (!streamUrl) {
    console.log("");
    console.log(
      `${channel.name} menunggu URL stream setelah Play...`
    );

    for (let i = 0; i < 30 && !streamUrl; i++) {
      await page.waitForTimeout(1000);

      if (i % 10 === 9) {
        console.log(
          `${channel.name} masih menunggu... ${i + 1} detik`
        );
      }
    }
  }

  // ==========================================================
  // 10. PEMERIKSAAN VIDEO TERAKHIR
  // ==========================================================

  if (!streamUrl) {
    try {
      const videoInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll("video")).map(
          (video) => ({
            src: video.src || "",
            currentSrc: video.currentSrc || "",
            readyState: video.readyState,
            networkState: video.networkState
          })
        )
      );

      console.log("");
      console.log(
        `=================================`
      );
      console.log(
        `PEMERIKSAAN VIDEO ${channel.name}`
      );
      console.log(
        `=================================`
      );

      console.log(
        JSON.stringify(videoInfo, null, 2)
      );
    } catch {
      // abaikan
    }
  }

  return streamUrl;
}

// ==========================================================
// MAIN
// ==========================================================

const browser = await chromium.launch({
  headless: true
});

const results = [];

try {
  for (const channel of channels) {
    console.log("");
    console.log("=================================");
    console.log(`MEMBUKA ${channel.name}`);
    console.log("=================================");

    const page = await browser.newPage();

    // User-Agent browser normal
    await page.setExtraHTTPHeaders({
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    });

    const streamUrl = await extractFromPage(
      page,
      channel
    );

    await page.close();

    if (!streamUrl) {
      console.error("");
      console.error(
        "================================="
      );
      console.error(
        `${channel.name}: URL STREAM TIDAK DITEMUKAN`
      );
      console.error(
        "================================="
      );

      // Jangan langsung browser.close + process.exit
      // supaya error lebih jelas.
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
} finally {
  await browser.close();
}

// ==========================================================
// SEMUA STREAM BERHASIL
// ==========================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log(`${result.name}:`);
  console.log(result.url);
}

// ==========================================================
// SIMPAN FILE
// ==========================================================

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
