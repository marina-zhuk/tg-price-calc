// Генерация скриншотов для README (one-off, puppeteer-core + системный Chrome).
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "public/screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
await sleep(400);
await page.screenshot({ path: `${OUT}/01-calculator.png`, fullPage: true });
console.log("saved 01-calculator.png");

// Перейти к форме заявки
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    x.textContent.includes("Перейти к заявке")
  );
  b && b.click();
});
await sleep(500);

// Заполнить форму для более «живого» кадра
await page.type("#name", "Анна");
await page.type("#phone", "9001234567");
await page.type("#comment", "2 комнаты, кухня. Удобно после 18:00.");
await sleep(300);
await page.screenshot({ path: `${OUT}/02-form.png`, fullPage: true });
console.log("saved 02-form.png");

// Отправить заявку и снять экран успеха «что дальше»
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) =>
    x.textContent.includes("Оставить заявку")
  );
  b && b.click();
});
await page.waitForFunction(
  () => document.body.innerText.includes("Заявка принята"),
  { timeout: 15000 }
);
await sleep(300);
await page.screenshot({ path: `${OUT}/03-success.png`, fullPage: true });
console.log("saved 03-success.png");

await browser.close();
console.log("done");
