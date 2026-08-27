import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    pattern:
      /https:\/\/rcti-linier\.rctiplus\.id\/rcti-sdi\.m3u8\?hdnts=[^\s"'\\]+/
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    pattern:
      /https:\/\/mnctv-linier\.rctiplus\.id\/mnctv-sdi\.m3u8\?hdnts=[^\s"'\\]+/
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",

    // GTV BERBEDA:
    // token berada di PATH, bukan ?hdnts=
    pattern:
      /https:\/\/gtv-linier\.rctiplus\.id\/hdntl=[^"'\\\s]+\/gtv-sdi-[^"'\\\s]+\.m3u8/
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

  const context = await browser.newContext();

  const page = await context.newPage();

  let streamUrl = null;

  // =====================================================
  // FUNGSI UNTUK MENYIMPAN URL
  // =====================================================

  function checkUrl(url, source) {

    if (!url || streamUrl) {
      return;
    }

    // Hilangkan HTML entity jika ada
    let cleanUrl = url
      .replace(/&amp;/g, "&")
      .replace(/\\u0026/g, "&");

    if (channel.pattern.test(cleanUrl)) {

      streamUrl = cleanUrl;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log(`Sumber: ${source}`);
      console.log("=================================");
      console.log(streamUrl);
      console.log("");
    }
  }

  // =====================================================
  // MONITOR REQUEST
  // =====================================================

  page.on("request", request => {

    const url = request.url();

    checkUrl(url, "request");

    // Untuk RCTI / MNCTV, kadang URL asli ada
    // di parameter JWPlayer "mu"
    if (!streamUrl && url.includes("jwpltx.com")) {

      try {

        const parsed = new URL(url);

        const mu = parsed.searchParams.get("mu");

        if (mu) {
          checkUrl(mu, "request -> JWPlayer mu");
        }

      } catch (error) {
        // abaikan URL yang tidak valid
      }
    }
  });

  // =====================================================
  // MONITOR RESPONSE
  // =====================================================

  page.on("response", response => {

    const url = response.url();

    checkUrl(url, "response");
  });

  // =====================================================
  // BUKA HALAMAN
  // =====================================================

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

  // =====================================================
  // TUNGGU HALAMAN
  // =====================================================

  if (!streamUrl) {

    await page.waitForTimeout(5000);
  }

  // =====================================================
  // COBA VIDEO ELEMENT
  // =====================================================

  if (!streamUrl) {

    try {

      const videos = await page.locator("video").all();

      console.log(
        `${channel.name} jumlah video element: ${videos.length}`
      );

      for (let i = 0; i < videos.length && !streamUrl; i++) {

        try {

          await videos[i].evaluate(video => {

            video.muted = true;

            const result = video.play();

            if (result) {
              result.catch(() => {});
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

        await page.waitForTimeout(3000);
      }

    } catch (error) {

      console.log(
        `${channel.name} gagal membaca video element:`,
        error.message
      );
    }
  }

  // =====================================================
  // COBA TOMBOL PLAY
  // =====================================================

  if (!streamUrl) {

    const selectors = [
      '[aria-label*="Play"]',
      'button[class*="play"]',
      '[class*="play-button"]',
      '[class*="jw-icon-play"]',
      '.jw-display-icon-container'
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

          try {

            await page.locator(selector).first().click({
              timeout: 5000
            });

          } catch (error) {
            // tombol ada tetapi tidak bisa diklik
          }

          await page.waitForTimeout(5000);
        }

      } catch (error) {
        // abaikan
      }
    }
  }

  // =====================================================
  // TUNGGU URL STREAM
  // =====================================================

  if (!streamUrl) {

    console.log(
      `${channel.name} menunggu URL stream...`
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

  // =====================================================
  // CEK PERFORMANCE RESOURCE
  // =====================================================

  if (!streamUrl) {

    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN RESOURCE ${channel.name}`);
    console.log("=================================");

    try {

      const resources = await page.evaluate(() => {

        return performance
          .getEntriesByType("resource")
          .map(entry => entry.name);

      });

      for (const resource of resources) {

        checkUrl(resource, "performance resource");

        if (streamUrl) {
          break;
        }
      }

      if (!streamUrl) {

        const relevant = resources.filter(url =>
          url.includes("linier") ||
          url.includes(".m3u8") ||
          url.includes("hdntl") ||
          url.includes("hdnts")
        );

        if (relevant.length > 0) {

          console.log(
            `Resource relevan ${channel.name}:`
          );

          for (const url of relevant) {
            console.log(url);
          }
        }
      }

    } catch (error) {

      console.log(
        `Gagal membaca resource ${channel.name}:`,
        error.message
      );
    }
  }

  // =====================================================
  // CEK HTML
  // =====================================================

  if (!streamUrl) {

    console.log("");
    console.log("=================================");
    console.log(`PEMERIKSAAN HTML ${channel.name}`);
    console.log("=================================");

    try {

      const html = await page.content();

      // Coba regex langsung dari HTML
      const match = html.match(channel.pattern);

      if (match) {

        checkUrl(
          match[0],
          "HTML"
        );

      } else {

        console.log(
          `Tidak ditemukan pola stream ${channel.name} di HTML.`
        );
      }

    } catch (error) {

      console.error(
        `${channel.name} gagal membaca HTML:`,
        error.message
      );
    }
  }

  // =====================================================
  // DEBUG KHUSUS GTV
  // =====================================================

  if (channel.name === "GTV" && !streamUrl) {

    console.log("");
    console.log("=================================");
    console.log("DEBUG GTV");
    console.log("=================================");

    try {

      const html = await page.content();

      const positions = [
        "gtv-linier",
        "gtv-sdi",
        "hdntl",
        ".m3u8"
      ];

      for (const keyword of positions) {

        const index = html.indexOf(keyword);

        if (index !== -1) {

          console.log("");
          console.log(`Ditemukan keyword: ${keyword}`);
          console.log(
            html.substring(
              Math.max(0, index - 500),
              Math.min(html.length, index + 1500)
            )
          );

        } else {

          console.log(
            `Keyword tidak ditemukan: ${keyword}`
          );
        }
      }

    } catch (error) {

      console.log(
        "DEBUG GTV gagal:",
        error.message
      );
    }
  }

  // =====================================================
  // TUTUP PAGE
  // =====================================================

  await page.close();
  await context.close();

  // =====================================================
  // HASIL
  // =====================================================

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

// =====================================================
// SEMUA BERHASIL
// =====================================================

await browser.close();

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {

  console.log(`${result.name}:`);
  console.log(result.url);
  console.log("");
}

// =====================================================
// SIMPAN FILE
// =====================================================

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
