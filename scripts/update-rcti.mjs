import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    host: "rcti-linier.rctiplus.id"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    host: "mnctv-linier.rctiplus.id"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",
    host: "gtv-linier.rctiplus.id"
  }
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

function isM3U8(url) {
  return url.toLowerCase().includes(".m3u8");
}

function isChannelStream(url, channel) {
  const lower = url.toLowerCase();

  return (
    lower.includes(channel.host.toLowerCase()) &&
    lower.includes(".m3u8")
  );
}

function extractM3U8FromText(text, channel) {
  if (!text) {
    return null;
  }

  const escapedHost = channel.host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `https?:\\/\\/${escapedHost}[^\\s"'<>\\\\]+?\\.m3u8(?:\\?[^\\s"'<>\\\\]+)?`,
    "i"
  );

  const match = text.match(regex);

  if (match) {
    return match[0]
      .replace(/&amp;/g, "&")
      .replace(/\\u0026/g, "&")
      .trim();
  }

  return null;
}

async function findStream(channel) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage();

  let streamUrl = null;

  // =====================================================
  // REQUEST
  // =====================================================

  page.on("request", (request) => {
    if (streamUrl) {
      return;
    }

    const url = request.url();

    if (isChannelStream(url, channel)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("=================================");
      console.log("Sumber: request");
      console.log("");
      console.log(streamUrl);
      console.log("");
    }
  });

  // =====================================================
  // RESPONSE
  // =====================================================

  page.on("response", async (response) => {
    if (streamUrl) {
      return;
    }

    const url = response.url();

    if (!isChannelStream(url, channel)) {
      return;
    }

    streamUrl = url;

    console.log("");
    console.log("=================================");
    console.log(`${channel.name} STREAM DITEMUKAN`);
    console.log("=================================");
    console.log("Sumber: response");
    console.log("");
    console.log(streamUrl);
    console.log("");
  });

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(`${channel.name} halaman berhasil dibuka.`);

    // =====================================================
    // TUNGGU PLAYER
    // =====================================================

    for (
      let second = 0;
      second < 20 && !streamUrl;
      second++
    ) {
      await page.waitForTimeout(1000);

      console.log(
        `${channel.name} menunggu player... ${second + 1} detik`
      );
    }

    // =====================================================
    // COBA PLAY SEMUA VIDEO
    // =====================================================

    if (!streamUrl) {
      const videos = await page.locator("video").count();

      console.log(
        `${channel.name} jumlah video element: ${videos}`
      );

      for (
        let i = 0;
        i < videos && !streamUrl;
        i++
      ) {
        try {
          await page
            .locator("video")
            .nth(i)
            .evaluate((video) => {
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
    }

    // =====================================================
    // COBA TOMBOL PLAY JWPLAYER
    // =====================================================

    if (!streamUrl) {
      const selectors = [
        '[aria-label*="Play"]',
        'button[class*="play"]',
        ".jw-icon-playback",
        ".jw-display-icon-container",
        ".jw-display-icon-display"
      ];

      for (const selector of selectors) {
        if (streamUrl) {
          break;
        }

        try {
          const count = await page.locator(selector).count();

          if (count > 0) {
            console.log(
              `${channel.name} menemukan tombol: ${selector}`
            );

            for (let i = 0; i < count; i++) {
              try {
                await page
                  .locator(selector)
                  .nth(i)
                  .click({
                    force: true,
                    timeout: 3000
                  });

                await page.waitForTimeout(1000);

                if (streamUrl) {
                  break;
                }
              } catch {
                // abaikan
              }
            }
          }
        } catch {
          // abaikan
        }
      }
    }

    // =====================================================
    // KHUSUS GTV
    //
    // GTV tidak mengeluarkan URL lewat video.src.
    // Jadi kita fokus menunggu REQUEST/RESPONSE .m3u8.
    // =====================================================

    if (!streamUrl && channel.name === "GTV") {
      console.log("");
      console.log("=================================");
      console.log("MODE KHUSUS GTV");
      console.log("=================================");
      console.log("Fokus mencari request .m3u8 GTV.");

      for (
        let second = 0;
        second < 90 && !streamUrl;
        second++
      ) {
        await page.waitForTimeout(1000);

        if (second % 10 === 0) {
          console.log(
            `GTV masih mencari .m3u8... ${second} detik`
          );
        }
      }
    }

    // =====================================================
    // UNTUK RCTI / MNCTV
    // =====================================================

    if (!streamUrl && channel.name !== "GTV") {
      console.log("");
      console.log(
        `${channel.name} menunggu URL stream setelah Play...`
      );

      for (
        let second = 0;
        second < 60 && !streamUrl;
        second++
      ) {
        await page.waitForTimeout(1000);

        if (second % 10 === 0) {
          console.log(
            `${channel.name} masih menunggu... ${second} detik`
          );
        }
      }
    }

    // =====================================================
    // LAST CHANCE:
    // PERIKSA SOURCE VIDEO
    // =====================================================

    if (!streamUrl) {
      try {
        const videoInfo = await page
          .locator("video")
          .evaluateAll((videos) =>
            videos.map((video) => ({
              src: video.src || "",
              currentSrc: video.currentSrc || "",
              readyState: video.readyState,
              networkState: video.networkState
            }))
          );

        console.log("");
        console.log("=================================");
        console.log(`PEMERIKSAAN VIDEO ${channel.name}`);
        console.log("=================================");
        console.log(JSON.stringify(videoInfo, null, 2));

        for (const video of videoInfo) {
          if (
            video.currentSrc &&
            isChannelStream(video.currentSrc, channel)
          ) {
            streamUrl = video.currentSrc;
            break;
          }

          if (
            video.src &&
            isChannelStream(video.src, channel)
          ) {
            streamUrl = video.src;
            break;
          }
        }
      } catch (error) {
        console.log(
          `${channel.name} gagal membaca video: ${error.message}`
        );
      }
    }

    // =====================================================
    // LAST CHANCE:
    // CARI URL M3U8 DARI ATTRIBUTE / SCRIPT
    // BUKAN SELURUH HTML
    // =====================================================

    if (!streamUrl) {
      try {
        const candidates = await page.evaluate((host) => {
          const found = new Set();

          const elements = document.querySelectorAll(
            "script, source, video, audio, iframe"
          );

          for (const element of elements) {
            for (const attr of element.attributes || []) {
              const value = attr.value || "";

              if (
                value.includes(host) &&
                value.toLowerCase().includes(".m3u8")
              ) {
                found.add(value);
              }
            }

            const text = element.textContent || "";

            if (
              text.includes(host) &&
              text.toLowerCase().includes(".m3u8")
            ) {
              found.add(text);
            }
          }

          return Array.from(found);
        }, channel.host);

        for (const candidate of candidates) {
          const extracted = extractM3U8FromText(
            candidate,
            channel
          );

          if (extracted) {
            streamUrl = extracted;
            break;
          }
        }
      } catch (error) {
        console.log(
          `${channel.name} gagal membaca candidate: ${error.message}`
        );
      }
    }

  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  // =====================================================
  // CLOSE PAGE
  // =====================================================

  await page.close();

  return streamUrl;
}

// =========================================================
// PROSES SEMUA CHANNEL
// =========================================================

for (const channel of channels) {
  const streamUrl = await findStream(channel);

  if (!streamUrl) {
    console.error("");
    console.error("=================================");
    console.error(
      `${channel.name}: URL STREAM TIDAK DITEMUKAN`
    );
    console.error("=================================");
    continue;
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

// =========================================================
// CLOSE BROWSER
// =========================================================

await browser.close();

// =========================================================
// HASIL
// =========================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(result.name);
  console.log(result.url);
}

// =========================================================
// SIMPAN
// =========================================================

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

// =========================================================
// SELESAI
// =========================================================

console.log("");
console.log("=================================");
console.log("SEMUA FILE BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
