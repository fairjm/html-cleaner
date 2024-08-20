import puppeteer, { Page } from 'puppeteer';
import { logger } from './logger';

export async function getRenderedHtml(url: string): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body');
    await autoScroll(page);
    return await page.content();
  } catch (exception) {
    logger.error(`getRenderedHtml failed. url:${url}`, exception);
    throw exception;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      var totalHeight = 0;
      var distance = 200;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 8000) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  })
}