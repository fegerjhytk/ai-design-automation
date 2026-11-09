import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const accs = JSON.parse(fs.readFileSync("./auth_info/accounts.json", "utf-8"));
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const USER_DATA_DIR = "/tmp/insta_headless_session_test";

async function testHeadless() {
  console.log("[Method 3 Test] Launching isolated Headless Chrome daemon...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--user-data-dir=${USER_DATA_DIR}`,
      "--window-size=1280,900"
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    console.log("[Method 3 Test] Navigating to Instagram login...");
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2", timeout: 30000 });
    console.log("[Method 3 Test] Current page URL:", page.url());
    console.log("[Method 3 Test] Current page Title:", await page.title());
    
    // Check if input[name="username"] is present
    const usernameInput = await page.$('input[name="username"]');
    console.log("[Method 3 Test] Login username field found:", !!usernameInput);

    await browser.close();
    console.log("[Method 3 Test] Successfully verified headless daemon launch & DOM access!");
  } catch (err) {
    console.error("[Method 3 Test] Error:", err.message);
    await browser.close();
  }
}

testHeadless();
