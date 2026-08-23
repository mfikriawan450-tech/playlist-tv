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
});

const page = await context.newPage();

const streams = new Set();
const manifests = new Set();

/*
====================================================
CEK URL
====================================================
*/

function checkUrl(url, source) {
  if (!url) return;

  /*
   * STREAM HLS YANG KITA CARI
   */
  if (
    url.includes("live-240.m3u8") ||
    url.includes("live-480.m3u8") ||
    url.includes("live-720.m3u8")
  ) {
    if (!streams.has(url)) {
      streams.add(url);

      console.log("");
      console.log("=================================");
      console.log("STREAM HLS DITEMUKAN");
      console.log("SOURCE:", source);
      console.log("=================================");
      console.log(url);
      console.log("=================================");
    }

    return;
  }

  /*
   * Manifest CDN Dailymotion
   */
  if (
    url.includes(".m3u8") &&
    (
      url.includes("dmcdn.net") ||
      url.includes("dailymotion.com")
    )
  ) {
    if (!manifests.has(url)) {
      manifests.add(url);

      console.log("");
      console.log("HLS MANIFEST:");
      console.log(url);
    }
  }
}

/*
====================================================
REQUEST
====================================================
*/

page.on("request", request => {
  checkUrl(
    request.url(),
    "REQUEST"
  );
});

/*
====================================================
RESPONSE
====================================================
*/

page.on("response", response => {
  checkUrl(
    response.url(),
    `RESPONSE ${response.status()}`
  );
});

/*
====================================================
REQUEST FAILED
====================================================
*/

page.on("requestfailed", request => {
  const url = request.url();

  if (
    url.includes(".m3u8") ||
    url.includes("dmcdn.net")
  ) {
    console.log("");
    console.log("REQUEST FAILED:");
    console.log(url);
    console.log(
      request.failure()?.errorText || ""
    );
  }
});

/*
====================================================
CONSOLE PLAYER
====================================================
*/

page.on("console", msg => {
  const text = msg.text();

  if (
    text.includes("HLS") ||
    text.includes("m3u8") ||
    text.includes("stream")
  ) {
    console.log(
      "[PLAYER]",
      text
    );
  }
});

/*
====================================================
BUKA DAILYMOTION
====================================================
*/

console.log(
  "Membuka Dailymotion Player Trans7..."
);

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
TUNGGU PLAYER
====================================================
*/

await page.waitForTimeout(10000);

/*
====================================================
VIDEO
====================================================
*/

console.log(
  "Mencari elemen video..."
);

const videos =
  await page.locator("video").count();

console.log(
  "Jumlah video:",
  videos
);

for (let i = 0; i < videos; i++) {
  try {
    await page
      .locator("video")
      .nth(i)
      .evaluate(video => {

        video.muted = true;

        try {
          video.setAttribute(
            "playsinline",
            ""
          );
        } catch {}

        const p = video.play();

        if (p) {
          p.catch(() => {});
        }
      });

    console.log(
      `Video ${i} diperintahkan PLAY.`
    );

  } catch (error) {

    console.log(
      `Gagal PLAY video ${i}:`,
      error.message
    );
  }
}

/*
====================================================
COBA KLIK PLAYER
====================================================
*/

try {

  await page.mouse.click(
    640,
    360
  );

  console.log(
    "Player diklik."
  );

} catch {}

/*
====================================================
TUNGGU HLS
====================================================
*/

console.log("");
console.log(
  "Menunggu request HLS..."
);

const MAX_WAIT = 300; // 5 menit

for (
  let i = 0;
  i < MAX_WAIT;
  i++
) {

  if (streams.size > 0) {
    break;
  }

  if (i % 10 === 0) {
    console.log(
      `Menunggu... ${i}s`
    );
  }

  await page.waitForTimeout(
    1000
  );
}

/*
====================================================
HASIL
====================================================
*/

console.log("");
console.log(
  "================================="
);

console.log(
  "HASIL"
);

console.log(
  "================================="
);

console.log(
  "Jumlah manifest:",
  manifests.size
);

console.log(
  "Jumlah stream:",
  streams.size
);

console.log(
  "================================="
);

if (streams.size === 0) {

  console.log("");
  console.log(
    "STREAM BELUM DITEMUKAN."
  );

  console.log("");
  console.log(
    "Manifest yang berhasil terlihat:"
  );

  for (const url of manifests) {
    console.log(url);
  }

  await browser.close();

  process.exit(1);
}

/*
====================================================
PILIH STREAM
====================================================
*/

const urls = [
  ...streams
];

const streamUrl =
  urls.find(u =>
    u.includes(
      "live-720.m3u8"
    )
  ) ||
  urls.find(u =>
    u.includes(
      "live-480.m3u8"
    )
  ) ||
  urls.find(u =>
    u.includes(
      "live-240.m3u8"
    )
  ) ||
  urls[0];

console.log("");
console.log(
  "STREAM TERPILIH:"
);

console.log(
  streamUrl
);

/*
====================================================
SIMPAN PLAYLIST
====================================================
*/

fs.mkdirSync(
  "playlist",
  {
    recursive: true
  }
);

const playlist =
`#EXTM3U
#EXTINF:-1,Trans7
${streamUrl}
`;

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist,
  "utf8"
);

console.log("");
console.log(
  "================================="
);

console.log(
  "PLAYLIST BERHASIL DISIMPAN"
);

console.log(
  "playlist/trans7.m3u"
);

console.log(
  "================================="
);

await browser.close();
