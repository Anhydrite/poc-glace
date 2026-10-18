import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', m => console.log('[console]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.setContent(`<!doctype html><canvas id="c" width="640" height="360"></canvas>`);
const info = await page.evaluate(() => {
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { ok: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  gl.clearColor(0.05, 0.4, 0.7, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {
    ok: true,
    version: gl.getParameter(gl.VERSION),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'n/a',
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a',
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    floatExt: !!gl.getExtension('OES_texture_float'),
    aniso: !!gl.getExtension('EXT_texture_filter_anisotropic'),
    dataUrlLen: c.toDataURL('image/png').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
