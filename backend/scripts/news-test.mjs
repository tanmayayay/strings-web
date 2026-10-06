// Offline test: serves fixture RSS feeds locally and checks collect()/enrichImages().
import http from 'node:http';
import assert from 'node:assert/strict';
import { collect, enrichImages } from '../src/lib/newsFeed.js';

const rss = (items) => `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>T</title>${items}</channel></rss>`;
const now = new Date().toUTCString();
const item = (n, extra = '') => `<item><title>${n}</title><link>http://localhost:4300/a/${n.replace(/\W/g, '')}</link><guid>${n}</guid><pubDate>${now}</pubDate><description><![CDATA[<p>Short <b>summary</b> of ${n}. The post ${n} appeared first on Site.</p>]]></description>${extra}</item>`;

const srv = http.createServer((req, res) => {
  if (req.url === '/a.xml') return res.setHeader('content-type', 'application/xml'), res.end(rss(item('Arijit Singh announces tour', '<media:content url="https://img.test/x.jpg" medium="image"/>') + item('Dup story')));
  if (req.url === '/b.xml') return res.setHeader('content-type', 'application/xml'), res.end(rss(item('Dup story') + item('New festival lineup for Sunburn')));
  if (req.url === '/bad.xml') return res.statusCode = 500, res.end('no');
  if (req.url.startsWith('/a/')) return res.setHeader('content-type', 'text/html'), res.end('<meta property="og:image" content="https://img.test/og.jpg">');
  res.statusCode = 404; res.end();
});
await new Promise((r) => srv.listen(4300, r));
const feeds = [
  { id: 'a', name: 'A', url: 'http://localhost:4300/a.xml', region: 'india', category: 'bollywood' },
  { id: 'b', name: 'B', url: 'http://localhost:4300/b.xml', region: 'world', category: 'general' },
  { id: 'x', name: 'X', url: 'http://localhost:4300/bad.xml', region: 'world', category: 'general' },
];
const { items, status } = await collect(feeds);
console.log(status);
assert.equal(status.find((s) => s.id === 'x').ok, false);
assert.equal(items.length, 3, 'dedupe by title');
assert.ok(items.every((i) => i.id && i.title && i.url && i.excerpt && i.category && i.region));
assert.ok(!/appeared first on/.test(items[0].excerpt));
assert.equal(items.find((i) => /Arijit/.test(i.title)).image, 'https://img.test/x.jpg');
await enrichImages(items);
assert.equal(items.find((i) => /Sunburn/.test(i.title)).image, 'https://img.test/og.jpg');
console.log(items.map((i) => [i.title, i.category, i.region, i.image]));
console.log('OK');
srv.close();
