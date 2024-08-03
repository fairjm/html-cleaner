import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperPublisher from 'metascraper-publisher';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
import { getRenderedHtml } from './puppeteerService';
import { logger } from './logger';

const ms = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperPublisher()
]);

interface CleanedContent {
  title: string;
  author: string | null;
  description: string | null;
  date: string | null;
  logo: string | null;
  image: string | null;
  publisher: string | null;
  content: string;
  markdown: string;
}

export async function cleanHtml(url: string, html: string | null): Promise<CleanedContent> {

  if (html === null) {
    // const response = await fetch(url, {
    //   headers: {
    //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    //   }
    // });
    // html = await response.text();
    logger.info(`cleanHtml - no html provided, start fetch. url: ${url}`);
    html = await getRenderedHtml(url);
    logger.info(`cleanHtml - fetch end. url: ${url}`);
  }

  const dom = new JSDOM(html, { url });
  preprocessDom(dom);
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    logger.warn(`cleanHtml - parse article failed. url: ${url}`);
    throw new Error('Failed to parse content');
  }

  const metadata = await ms({ html, url });

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  turndownService.use(gfm);
  turndownService.keep(['img', 'video', 'iframe']);

  turndownService.addRule('table', {
    filter: ['table'],
    replacement: function (content, node) {
      const table = node as HTMLTableElement;
      let markdown = '\n\n';

      const headers = Array.from(table.rows[0].cells).map(cell => cell?.textContent?.trim());
      markdown += '| ' + headers.join(' | ') + ' |\n';
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

      for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];
        const cells = Array.from(row.cells).map(cell => cell?.textContent?.trim());
        markdown += '| ' + cells.join(' | ') + ' |\n';
      }

      return markdown + '\n\n';
    }
  });

  const markdown = turndownService.turndown(article.content);

  return {
    title: metadata.title || article.title,
    author: metadata.author || null,
    description: metadata.description || null,
    date: metadata.date || null,
    content: article.content,
    logo: metadata.logo || null,
    image: metadata.image || null,
    publisher: metadata.publisher || null,
    markdown: markdown
  };
}

function preprocessDom(dom: JSDOM) {
  const document = dom.window.document;

  document.querySelectorAll('img').forEach(img => {
    // remove 1x1 image
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if ((width === '1' && height === '1') || (img.width === 1 && img.height === 1)) {
      img.remove();
      return;
    }

    // data-src to src
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc) {
      img.setAttribute('src', dataSrc);
      img.removeAttribute('data-src');
    }
  });

  // remove empty content
  document.querySelectorAll('p, div').forEach(el => {
    if (el.innerHTML.trim() === '') {
      el.remove();
    }
  });

  // remove comments
  const removeComments = (node: Node) => {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 8) {
        node.removeChild(child);
        i--;
      } else if (child.nodeType === 1) {
        removeComments(child);
      }
    }
  };
  removeComments(document.body);

  document.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      el.setAttribute(attr.name, attr.value.trim());
    });
  });
}