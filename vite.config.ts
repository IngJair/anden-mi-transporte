import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(),{
    name: 'pilot-offline',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = ['/index.html', ...Object.keys(bundle).filter(f => f.startsWith('assets/')).map(f => '/' + f)];
      const cache = 'olivos-pilot-' + Object.keys(bundle).find(f => f.endsWith('.js'));
      this.emitFile({type:'asset',fileName:'pilot-sw.js',source:
        `const key=${JSON.stringify(cache)};
        self.addEventListener('install', e=>e.waitUntil(caches.open(key).then(c=>c.addAll(${JSON.stringify(files)})).then(()=>self.skipWaiting())));
        self.addEventListener('activate', e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('olivos-pilot-')&&k!==key).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
        self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
          if(e.request.mode==='navigate'||u.pathname.startsWith('/assets/'))e.respondWith(caches.open(key).then(async c=>(await c.match(e.request.mode==='navigate'?'/index.html':u.pathname,{ignoreVary:true}))||fetch(e.request)))});
        `});
    }
  }],
});
