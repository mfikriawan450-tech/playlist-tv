import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

console.log("");
console.log("=================================");
console.log("INVESTIGASI GTV");
console.log("=================================");

// =====================================================
// REQUEST
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("gtv") ||
    url.includes("rctiplus") ||
    url.includes("m3u8") ||
    url.includes("hdntl") ||
    url.includes("jwplayer")
  ) {
    console.log("");
    console.log("[REQUEST]");
    console.log(url);
  }
});

// =====================================================
// RESPONSE
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("gtv") ||
    url.includes("rctiplus") ||
    url.includes("m3u8") ||
    url.includes("hdntl") ||
    url.includes("jwplayer")
  ) {
    console.log("");
    console.log("[RESPONSE]");
    console.log(response.status());
    console.log(url);
  }
});

// =====================================================
// BUKA GTV
// =====================================================

console.log("");
console.log("Membuka GTV...");

try {

  await page.goto(
    "https://www.rctiplus.com/tv/gtv",
    {
      waitUntil: "domcontentloaded",
      timeout: 60000
    }
  );

  console.log("GTV berhasil dibuka.");

} catch (error) {

  console.log(
    "Gagal membuka GTV:",
    error.message
  );
}

// =====================================================
// TUNGGU
// =====================================================

console.log("");
console.log("Menunggu player GTV...");

for (let i = 0; i < 60; i++) {

  await page.waitForTimeout(1000);

  if (i % 10 === 0) {
    console.log(`Menunggu ${i} detik...`);
  }
}

// =====================================================
// VIDEO
// =====================================================

console.log("");
console.log("=================================");
console.log("VIDEO ELEMENT");
console.log("=================================");

const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

for (let i = 0; i < videos; i++) {

  try {

    const info = await page.locator("video").nth(i).evaluate(video => ({
      src: video.src,
      currentSrc: video.currentSrc,
      paused: video.paused,
      readyState: video.readyState
    }));

    console.log("");
    console.log(`VIDEO ${i + 1}`);
    console.log(info);

  } catch (error) {

    console.log(
      "Gagal membaca video:",
      error.message
    );
  }
}

// =====================================================
// PERFORMANCE RESOURCE
// =====================================================

console.log("");
console.log("=================================");
console.log("SEMUA RESOURCE");
console.log("=================================");

try {

  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map(x => x.name)
  );

  console.log(
    "Jumlah resource:",
    resources.length
  );

  for (const url of resources) {

    console.log(url);
  }

} catch (error) {

  console.log(
    "Gagal membaca resource:",
    error.message
  );
}

// =====================================================
// LOCAL STORAGE
// =====================================================

console.log("");
console.log("=================================");
console.log("LOCAL STORAGE");
console.log("=================================");

try {

  const localStorage = await page.evaluate(() => {

    const result = {};

    for (let i = 0; i < window.localStorage.length; i++) {

      const key = window.localStorage.key(i);

      result[key] = window.localStorage.getItem(key);
    }

    return result;
  });

  console.log(
    JSON.stringify(localStorage, null, 2)
  );

} catch (error) {

  console.log(
    "Gagal membaca localStorage:",
    error.message
  );
}

// =====================================================
// SESSION STORAGE
// =====================================================

console.log("");
console.log("=================================");
console.log("SESSION STORAGE");
console.log("=================================");

try {

  const sessionStorage = await page.evaluate(() => {

    const result = {};

    for (let i = 0; i < window.sessionStorage.length; i++) {

      const key = window.sessionStorage.key(i);

      result[key] =
        window.sessionStorage.getItem(key);
    }

    return result;
  });

  console.log(
    JSON.stringify(sessionStorage, null, 2)
  );

} catch (error) {

  console.log(
    "Gagal membaca sessionStorage:",
    error.message
  );
}

// =====================================================
// COOKIES
// =====================================================

console.log("");
console.log("=================================");
console.log("COOKIES");
console.log("=================================");

try {

  const cookies = await page.context().cookies();

  for (const cookie of cookies) {

    console.log(
      `${cookie.name}=${cookie.value}`
    );
  }

} catch (error) {

  console.log(
    "Gagal membaca cookies:",
    error.message
  );
}

// =====================================================
// HTML
// =====================================================

console.log("");
console.log("=================================");
console.log("HTML INFO");
console.log("=================================");

try {

  const html = await page.content();

  console.log(
    "Panjang HTML:",
    html.length
  );

  fs.writeFileSync(
    "debug-gtv.html",
    html,
    "utf8"
  );

  console.log(
    "HTML disimpan ke debug-gtv.html"
  );

} catch (error) {

  console.log(
    "Gagal menyimpan HTML:",
    error.message
  );
}

// =====================================================
// SELESAI
// =====================================================

console.log("");
console.log("=================================");
console.log("INVESTIGASI SELESAI");
console.log("=================================");

await browser.close();
