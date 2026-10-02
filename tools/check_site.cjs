/* Repeatable site checks. All third-party traffic and form submissions are intercepted. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.SITE_ROOT || 'site-dist');
const output = path.resolve(process.env.QA_OUTPUT || 'qa-results');
fs.mkdirSync(output, { recursive: true });
const checks = [], errors = [], blocked = new Set();
const routes = ['/', '/services/', '/intake-form/', '/about/', '/contact/', '/privacy/', '/terms/', '/services/ai-influencer/', '/404.html'];
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.ico':'image/x-icon','.json':'application/json' };
const localFile = (urlPath) => {
  let file = path.resolve(root, '.' + decodeURIComponent(urlPath));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
};
const server = http.createServer((req, res) => {
  const file = localFile(new URL(req.url, 'http://localhost').pathname);
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const record = (name, details = {}) => checks.push({ check:name, pass:true, ...details });
let browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true, ...(process.env.CHROME_EXECUTABLE ? { executablePath:process.env.CHROME_EXECUTABLE } : {}) });
  const setup = async (context, onPost) => {
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      if (url.hostname === 'formspree.io' && request.method() === 'POST' && onPost) return onPost(route);
      blocked.add(url.origin);
      return route.fulfill({ status:200, contentType:'application/javascript', body:'/* External traffic blocked by site QA. */' });
    });
  };
  const context = await browser.newContext({ reducedMotion:'reduce' });
  await setup(context);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (new URL(r.url()).origin === base && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height:960 });
    for (const route of routes) {
      await page.goto(base + route, { waitUntil:'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const critical = [...document.querySelectorAll('h1,.nav-logo,.nav-toggle,footer a,main button,main input:not([type=hidden]),main select,main textarea')].filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'none');
        return {
          title:document.title, h1:document.querySelectorAll('h1').length,
          pageWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth,
          clipped:critical.map(el => ({ tag:el.tagName, label:el.textContent.trim().slice(0,60), rect:el.getBoundingClientRect().toJSON() })).filter(r => r.rect.left < -1 || r.rect.right > innerWidth + 1),
          brokenImages:[...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
          fontLoaded:document.fonts.check('16px "IBM Plex Sans"'),
          main:!!document.querySelector('main'),
          links:[...document.querySelectorAll('a[href],img[src],script[src],link[href]')].map(el => el.getAttribute('href') || el.getAttribute('src'))
        };
      });
      assert.equal(result.h1,1, `One heading: ${route}`);
      assert.ok(result.main && result.title && result.fontLoaded, `Content/font: ${route}`);
      assert.ok(result.scrollWidth <= width+1 && !result.clipped.length, `Overflow ${width} ${route}: ${JSON.stringify(result.clipped)}`);
      assert.deepEqual(result.brokenImages,[],`Images: ${route}`);
      for (const ref of result.links) {
        const url = new URL(ref, base+route);
        if (url.origin !== base) continue;
        const file = localFile(url.pathname);
        assert.ok(file, `Missing local reference ${route} -> ${ref}`);
        if (url.hash && path.extname(file)==='.html') {
          const target = decodeURIComponent(url.hash.slice(1));
          const raw = fs.readFileSync(file,'utf8');
          assert.ok(raw.includes(`id="${target}"`) || raw.includes(`id='${target}'`), `Missing anchor ${ref}`);
        }
      }
      record('Responsive content, fonts, images and references',{ route,width });
      if ((width===390 || width===1440) && ['/', '/services/', '/intake-form/', '/contact/'].includes(route)) {
        const slug = route==='/' ? 'home' : route.split('/')[1];
        await page.screenshot({ path:path.join(output,`${slug}_${width}.png`),fullPage:true });
      }
      if (width===320) {
        const button=page.locator('.nav-toggle');
        await button.click(); assert.equal(await button.getAttribute('aria-expanded'),'true');
        assert.ok(await page.locator('.nav-links').isVisible());
        const menuLinks=await page.locator('.nav-links a').evaluateAll(links=>links.map(a=>{
          const r=a.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          return {label:a.textContent.trim(),visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,tappable:!!hit&&(hit===a||a.contains(hit))};
        }));
        assert.ok(menuLinks.length && menuLinks.every(a=>a.visible&&a.tappable),`Visible tappable menu ${route}: ${JSON.stringify(menuLinks)}`);
        await page.keyboard.press('Escape'); assert.equal(await button.getAttribute('aria-expanded'),'false');
        record('Mobile navigation links are visible and tappable; Escape closes',{route});
      }
    }
  }
  await context.close();
  const ids=['website-fix-sprint','brand-polish','launch','business','pro','logo-essentials','brand-identity','brand-launch','ai-starter','ai-professional','ai-enterprise','care-basic','care-standard','care-plus','not-sure'];
  const selected = await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await setup(selected); const formPage=await selected.newPage();
  for (const id of ids) {
    await formPage.goto(base+'/intake-form/?offer='+id);
    assert.equal(await formPage.locator('[name=offer]').inputValue(),id,`Offer selection ${id}`);
    record('Selected offer retained',{offer:id});
  }
  await formPage.goto(base+'/intake-form/?offer='+encodeURIComponent('<img src=x onerror="window.injected=true">'));
  assert.equal(await formPage.evaluate(()=>window.injected),undefined);
  assert.ok(ids.includes(await formPage.locator('[name=offer]').inputValue()));
  record('Unknown offer safely falls back'); await selected.close();
  const fill = async p => {
    await p.locator('[name=name]').fill('Alex QA');
    await p.locator('[name=email]').fill('alex-qa@example.com');
    await p.locator('[name=website]').fill('https://example.com');
    await p.locator('[name=problem]').fill('Clearly labelled automated test. Correct the call link.');
  };
  const formCase = async (mode) => {
    let requests=0, payload='';
    const c=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
    await setup(c,async route=>{
      requests++; payload=route.request().postData() || '';
      await new Promise(r=>setTimeout(r,120));
      if ((mode==='retry' || mode==='network') && requests===1) {
        if (mode==='network') return route.abort('failed');
        return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary failure"}'});
      }
      return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
    });
    const p=await c.newPage(); await p.goto(base+'/intake-form/?offer=website-fix-sprint');
    await fill(p);
    if (mode==='analytics') await p.evaluate(()=>{window.gtag=()=>{throw Error('QA analytics unavailable');};});
    await p.evaluate(()=>{const f=document.querySelector('form');f.requestSubmit();f.requestSubmit();});
    await p.waitForTimeout(450); assert.equal(requests,1,'Only one request in flight');
    if (mode==='retry' || mode==='network') {
      assert.equal(await p.locator('[name=email]').inputValue(),'alex-qa@example.com');
      assert.equal(await p.locator('button[type=submit]').isEnabled(),true);
      assert.ok(await p.locator('#form-error').isVisible());
      await p.locator('button[type=submit]').click();
      await p.waitForTimeout(350); assert.equal(requests,2,'Explicit retry only');
    }
    assert.ok(await p.locator('#form-success').isVisible(),`Submission accepted UI ${mode}`);
    assert.ok(payload.includes('website-fix-sprint') && payload.includes('alex-qa@example.com'));
    if (mode!=='analytics') {
      const events=await p.evaluate(()=>[...(window.dataLayer||[])].map(a=>Array.from(a)).filter(a=>a[0]==='event'));
      assert.ok(events.some(e=>e[1]==='form_start'));
      assert.ok(events.some(e=>e[1]==='generate_lead'));
      assert.ok(!JSON.stringify(events).includes('alex-qa@example.com') && !JSON.stringify(events).includes('Alex QA') && !JSON.stringify(events).includes('https://example.com'));
      assert.ok(!events.some(e=>e[1]==='qualify_lead'));
    }
    record('Mocked form single-flight, result and recovery',{mode,requests,actualInboxVerified:false});
    await c.close();
  };
  for (const mode of ['success','retry','network','analytics']) await formCase(mode);
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
  await setup(nojs);const np=await nojs.newPage();await np.goto(base+'/');
  assert.ok(await np.locator('h1').isVisible() && await np.locator('.nav-links').isVisible());
  await np.goto(base+'/intake-form/');
  assert.equal(await np.locator('form').getAttribute('action'),'https://formspree.io/f/xzznvqjr');
  assert.ok(await np.locator('button[type=submit]').isVisible());record('No JavaScript content, navigation and native form fallback');await nojs.close();
  assert.deepEqual(errors,[],'No page errors or broken local responses');
})().catch(e=>{errors.push(String(e.stack||e));process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();server.close();
  const files=[];
  const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,ent.name);if(ent.isDirectory())walk(f);else files.push({file:path.relative(root,f).split(path.sep).join('/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')});}};
  if(fs.existsSync(root))walk(root);
  const report={status:errors.length?'FAIL':'PASS',checks,errors,blockedExternalOrigins:[...blocked],boundFiles:files,limits:['No live form submissions or analytics traffic','Formspree inbox receipt remains unverified','No checkout purchases or payment-product validation','Browser-width simulations are not physical-phone verification']};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:checks.length,errors,report:path.join(output,'report.json')}));
});
