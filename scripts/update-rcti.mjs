import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    hostname: "rcti-linier.rctiplus.id"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    hostname: "mnctv-linier.rctiplus.id"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",
    hostname: "gtv-linier.rctiplus.id"
  }
];

// ==========================================================
// CEK APAKAH URL BENAR-BENAR URL STREAM
// ==========================================================

function isStreamUrl(url, channel) {
  try {
    const parsed = new URL(url);

    return (
      parsed.hostname === channel.hostname &&
      parsed.pathname.endsWith(".m3u8")
    );
  } catch {
    return false;
  }
}

// ==========================================================
// AMBIL URL STREAM DARI URL JWPLAYER PING
// ==========================================================

function extractFromJWPlayer(url, channel) {
  try {
    const parsed = new URL(url);

    // Hanya proses domain JWPlayer
    if (!parsed.hostname.includes("jwpltx.com")) {
      return null;
    }

    // Parameter "mu" berisi URL media
    const mediaUrl = parsed.searchParams.get("mu");

    if (!mediaUrl) {
      return null;
    }

    if (isStreamUrl(mediaUrl, channel)) {
      return mediaUrl;
    }

    return null;
  } catch {
    return null;
  }
}

// ==========================================================
// AMBIL URL STREAM DARI URL YANG TER-ENCODE
// ==========================================================

function extractEncodedStream(url, channel) {
  try {
    if (!url.includes(channel.hostname)) {
      return null;
    }

    // Decode URL kalau masih encoded
    const decoded = decodeURIComponent(url);

    // Cari posisi hostname
    const index = decoded.indexOf(
      `https://${channel.hostname}/`
    );

    if (index === -1) {
      return null;
    }

    let candidate = decoded.substring(index);

    // Hentikan kalau ada parameter tambahan
    const possibleEnds = [
      "&",
      "\"",
      "'",
      " ",
      "<",
      ">"
    ];

    for (const endChar of possibleEnds) {
      const position = candidate.indexOf(endChar);

      if (position !== -1) {
        candidate = candidate.substring(0, position);
      }
    }

    if (isStreamUrl(candidate, channel)) {
      return candidate;
    }

    return null;
  } catch {
    return null;
  }
}

// ==========================================================
// BROWSER
// ==========================================================

const browser = await chromium.launch({
  headless: true
});

const results = [];

// ==========================================================
// PROSES CHANNEL
// ==========================================================

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
      "Mozilla/5.0 (X11; Linux x86_64) " +
      "AppleWebKit/537.36 " +
      "(KHTML, like Gecko) " +
      "Chrome/151.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  let streamUrl = null;

  // ========================================================
  // FUNGSI PUSAT UNTUK MEMERIKSA URL
  // ========================================================

  const checkUrl = (url, source) => {
    if (!url || streamUrl) {
      return;
    }

    // ------------------------------------------------------
    // 1. URL STREAM LANGSUNG
    // ------------------------------------------------------

    if (isStreamUrl(url, channel)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log(`Sumber: ${source}`);
      console.log("=================================");
      console.log(streamUrl);
      console.log("");

      return;
    }

    // ------------------------------------------------------
    // 2. URL DARI JWPLAYER ping.gif -> parameter mu
    // ------------------------------------------------------

    const jwStream = extractFromJWPlayer(url, channel);

    if (jwStream) {
      streamUrl = jwStream;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log(`Sumber: ${source} -> JWPlayer mu`);
      console.log("=================================");
      console.log(streamUrl);
      console.log("");

      return;
    }

    // ------------------------------------------------------
    // 3. URL STREAM YANG MASIH TER-ENCODE
    // ------------------------------------------------------

    const encodedStream = extractEncodedStream(
      url,
      channel
    );

    if (encodedStream) {
      streamUrl = encodedStream;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log(`Sumber: ${source} -> encoded`);
      console.log("=================================");
      console.log(streamUrl);
      console.log("");
    }
  };

  // ========================================================
  // REQUEST
  // ========================================================

  page.on("request", (request) => {
    checkUrl(
      request.url(),
      "request"
    );
  });

  // ========================================================
  // RESPONSE
  // ========================================================

  page.on("response", (response) => {
    checkUrl(
      response.url(),
      "response"
    );
  });

  // ========================================================
  // REQUEST FINISHED
  // ========================================================

  page.on("requestfinished", (request) => {
    checkUrl(
      request.url(),
      "requestfinished"
    );
  });

  // ========================================================
  // REQUEST FAILED
  // ========================================================

  page.on("requestfailed", (request) => {
    const url = request.url();

    if (
      url.includes(channel.hostname) &&
      url.includes(".m3u8")
    ) {
      console.log("");
      console.log(
        `${channel.name} REQUEST STREAM GAGAL`
      );
      console.log(url);
      console.log(
        "Alasan:",
        request.failure()?.errorText
      );
      console.log("");
    }
  });

  // ========================================================
  // BUKA HALAMAN
  // ========================================================

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(
      `${channel.name} halaman berhasil dibuka.`
    );

    // Beri waktu player/Javascript bekerja
    await page.waitForTimeout(5000);

    // ======================================================
    // VIDEO ELEMENT
    // ======================================================

    const videoCount =
      await page.locator("video").count();

    console.log(
      `${channel.name} jumlah video element: ${videoCount}`
    );

    // ======================================================
    // JALANKAN VIDEO
    // ======================================================

    for (let i = 0; i < videoCount; i++) {
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

    // ======================================================
    // TOMBOL PLAY
    // ======================================================

    const playSelectors = [
      '[aria-label*="Play"]',
      '[aria-label*="play"]',
      'button[class*="play"]',
      '[class*="play-button"]',
      '[class*="PlayButton"]'
    ];

    for (const selector of playSelectors) {
      try {
        const count =
          await page.locator(selector).count();

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

    // ======================================================
    // TUNGGU STREAM
    // ======================================================

    console.log(
      `${channel.name} menunggu URL stream...`
    );

    for (
      let i = 0;
      i < 60 && !streamUrl;
      i++
    ) {
      await page.waitForTimeout(1000);

      if (i % 10 === 0) {
        console.log(
          `${channel.name} masih menunggu... ${i} detik`
        );
      }
    }

    // ======================================================
    // PERFORMANCE RESOURCE
    // ======================================================

    if (!streamUrl) {
      console.log("");
      console.log("=================================");
      console.log(
        `PEMERIKSAAN RESOURCE ${channel.name}`
      );
      console.log("=================================");

      const resources =
        await page.evaluate(() => {
          return performance
            .getEntriesByType("resource")
            .map(
              (entry) => entry.name
            );
        });

      for (const resource of resources) {
        checkUrl(
          resource,
          "performance"
        );

        if (streamUrl) {
          break;
        }
      }
    }

    // ======================================================
    // CARI STREAM DI HTML
    // ======================================================

    if (!streamUrl) {
      console.log("");
      console.log("=================================");
      console.log(
        `PEMERIKSAAN HTML ${channel.name}`
      );
      console.log("=================================");

      const html =
        await page.content();

      const decodedHtml =
        decodeURIComponent(html);

      const hostnameIndex =
        decodedHtml.indexOf(
          channel.hostname
        );

      if (hostnameIndex !== -1) {
        const start =
          Math.max(
            0,
            hostnameIndex - 300
          );

        const end =
          Math.min(
            decodedHtml.length,
            hostnameIndex + 1000
          );

        console.log(
          decodedHtml.substring(
            start,
            end
          )
        );
      } else {
        console.log(
          `${channel.hostname} tidak ditemukan di HTML.`
        );
      }
    }

    // ======================================================
    // DEBUG RESOURCE RCTIPLUS
    // ======================================================

    if (!streamUrl) {
      console.log("");
      console.log("=================================");
      console.log(
        `DEBUG RESOURCE ${channel.name}`
      );
      console.log("=================================");

      const resources =
        await page.evaluate(() => {
          return performance
            .getEntriesByType("resource")
            .map(
              (entry) => entry.name
            )
            .filter(
              (url) =>
                url.includes("rctiplus")
            );
        });

      for (const resource of resources) {
        console.log(resource);
      }
    }
  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  await page.close();
  await context.close();

  // ========================================================
  // HASIL CHANNEL
  // ========================================================

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

// ==========================================================
// TUTUP BROWSER
// ==========================================================

await browser.close();

// ==========================================================
// HASIL SEMUA
// ==========================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
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

// ==========================================================
// SELESAI
// ==========================================================

console.log("");
console.log("=================================");
console.log(
  "SEMUA FILE STREAM BERHASIL DIPERBARUI"
);
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(
    `${result.outputFile}:`
  );
  console.log(result.url);
}
