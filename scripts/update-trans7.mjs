import { chromium } from "playwright";
import fs from "fs";

const VIDEO_ID = "x8qckyq";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,720"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",

  locale: "en-US",

  timezoneId: "Asia/Jakarta"
});

await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined
  });

  Object.defineProperty(navigator, "languages", {
    get: () => ["en-US", "en"]
  });

  Object.defineProperty(navigator, "plugins", {
    get: () => [1, 2, 3, 4, 5]
  });

  Object.defineProperty(navigator, "platform", {
    get: () => "Win32"
  });
});

const page = await context.newPage();

let manifestUrl = null;
const found = new Set();

/*
====================================================
REQUEST MONITOR
====================================================
*/

page.on("request", request => {
  const url = request.url();

  /*
   * Manifest utama Dailymotion
   */
  if (
    url.includes(
      `dmxleo.dailymotion.com/cdn/manifest/video/${VIDEO_ID}.m3u8`
    )
  ) {
    if (!manifestUrl) {
      manifestUrl = url;

      console.log("");
      console.log("=================================");
      console.log("MANIFEST DITEMUKAN");
      console.log("=================================");
      console.log(url);
      console.log("=================================");
    }
  }

  /*
   * Kalau player langsung meminta stream
   */
  if (
    url.includes("/live-240.m3u8") ||
    url.includes("/live-480.m3u8") ||
    url.includes("/live-720.m3u8")
  ) {
    if (!found.has(url)) {
      found.add(url);

      console.log("");
      console.log("=================================");
      console.log("LIVE STREAM DITEMUKAN");
      console.log("=================================");
      console.log(url);
      console.log("=================================");
    }
  }
});

/*
====================================================
RESPONSE MONITOR
====================================================
*/

page.on("response", response => {
  const url = response.url();

  /*
   * Manifest utama
   */
  if (
    url.includes(
      `dmxleo.dailymotion.com/cdn/manifest/video/${VIDEO_ID}.m3u8`
    )
  ) {
    console.log("");
    console.log("MANIFEST RESPONSE:", response.status());

    if (!manifestUrl) {
      manifestUrl = url;
    }
  }

  /*
   * Stream langsung
   */
  if (
    url.includes("/live-240.m3u8") ||
    url.includes("/live-480.m3u8") ||
    url.includes("/live-720.m3u8")
  ) {
    if (!found.has(url)) {
      found.add(url);

      console.log("");
      console.log("=================================");
      console.log("LIVE STREAM RESPONSE");
      console.log("=================================");
      console.log(response.status());
      console.log(url);
      console.log("=================================");
    }
  }
});

/*
====================================================
BUKA PLAYER
====================================================
*/

console.log("Membuka Dailymotion Player Trans7...");

await page.goto(
  `https://geo.dailymotion.com/player/x15a7g.html?video=${VIDEO_ID}`,
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");

/*
====================================================
TUNGGU MANIFEST
====================================================
*/

console.log("Menunggu manifest...");

for (let i = 0; i < 30; i++) {
  if (manifestUrl) {
    break;
  }

  console.log(`Menunggu manifest... ${i * 2}s`);

  await page.waitForTimeout(2000);
}

if (manifestUrl) {
  console.log("");
  console.log("=================================");
  console.log("MANIFEST URL");
  console.log("=================================");
  console.log(manifestUrl);
  console.log("=================================");
} else {
  console.log("");
  console.log("MANIFEST TIDAK DITEMUKAN.");
}

/*
====================================================
CARI VIDEO
====================================================
*/

console.log("");
console.log("Mencari elemen video...");

const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate(video => {
      video.muted = true;

      const promise = video.play();

      if (promise) {
        promise.catch(() => {});
      }
    });

    console.log(`Video ${i} diperintahkan PLAY.`);
  } catch (error) {
    console.log(
      `Gagal menjalankan video ${i}: ${error.message}`
    );
  }
}

/*
====================================================
AMBIL ISI MANIFEST
====================================================
*/

if (manifestUrl) {
  console.log("");
  console.log("Mengambil isi manifest...");

  try {
    const response = await page.request.get(manifestUrl);

    console.log(
      "MANIFEST STATUS:",
      response.status()
    );

    const body = await response.text();

    console.log("");
    console.log("=================================");
    console.log("ISI MANIFEST");
    console.log("=================================");
    console.log(body);
    console.log("=================================");

    /*
     * Cari URL live stream langsung
     */

    const streamMatches = body.match(
      /https?:\/\/[^"'<>\\\s]+\/live-(?:240|480|720)\.m3u8[^"'<>\\\s]*/g
    );

    if (streamMatches && streamMatches.length > 0) {
      for (const url of streamMatches) {
        found.add(url);
      }

      console.log("");
      console.log("=================================");
      console.log(
        "STREAM DITEMUKAN DARI MANIFEST"
      );
      console.log("=================================");

      for (const url of found) {
        console.log(url);
      }

      console.log("=================================");
    } else {
      /*
       * Kadang manifest menggunakan URL relatif.
       */

      const relativeMatches = body.match(
        /(?:https?:\/\/[^"'<>\\\s]+)?\/?live-(?:240|480|720)\.m3u8[^"'<>\\\s]*/g
      );

      if (
        relativeMatches &&
        relativeMatches.length > 0
      ) {
        for (const relative of relativeMatches) {
          try {
            const absolute = new URL(
              relative,
              manifestUrl
            ).href;

            found.add(absolute);
          } catch {}
        }
      }
    }
  } catch (error) {
    console.log(
      "GAGAL MENGAMBIL MANIFEST:",
      error.message
    );
  }
}

/*
====================================================
TUNGGU REQUEST STREAM
====================================================
*/

console.log("");
console.log("Menunggu request stream...");

for (let i = 0; i < 30; i++) {
  if (found.size > 0) {
    break;
  }

  console.log(`Menunggu... ${i * 2}s`);

  await page.waitForTimeout(2000);
}

/*
====================================================
HASIL
====================================================
*/

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("=================================");
console.log(
  "Manifest ditemukan:",
  manifestUrl ? "YA" : "TIDAK"
);
console.log(
  "Jumlah URL stream:",
  found.size
);
console.log("=================================");

if (found.size === 0) {
  console.log("");
  console.log(
    "STREAM BELUM DITEMUKAN."
  );
  console.log(
    "Kita perlu melihat struktur manifest di atas."
  );

  await browser.close();

  process.exit(1);
}

/*
====================================================
PILIH KUALITAS
====================================================

Prioritas:
720p
480p
240p
*/

const urls = [...found];

let streamUrl =
  urls.find(url =>
    url.includes("live-720.m3u8")
  ) ||
  urls.find(url =>
    url.includes("live-480.m3u8")
  ) ||
  urls.find(url =>
    url.includes("live-240.m3u8")
  ) ||
  urls[0];

console.log("");
console.log("STREAM YANG DIPILIH:");
console.log(streamUrl);

/*
====================================================
SIMPAN PLAYLIST
====================================================
*/

fs.mkdirSync("playlist", {
  recursive: true
});

const playlist = `#EXTM3U
#EXTINF:-1,Trans7
${streamUrl}
`;

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist,
  "utf8"
);

console.log("");
console.log("=================================");
console.log("PLAYLIST BERHASIL DIPERBARUI");
console.log("=================================");
console.log("File:");
console.log("playlist/trans7.m3u");
console.log("");
console.log(playlist);
console.log("=================================");

await browser.close();
