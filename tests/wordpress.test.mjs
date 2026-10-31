import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root='wordpress/asya-ararat/';
test('WordPress template has core lifecycle hooks, admin link, and all script target IDs',()=>{
 const html=readFileSync(root+'front-page.php','utf8');
 for(const hook of ['wp_head();','wp_footer();','wp_body_open();','admin_url()'])assert.ok(html.includes(hook),hook);
 const js=readFileSync(root+'assets/site.js','utf8');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
 for(const match of js.matchAll(/getElementById\('([^']+)'\)/g))assert.ok(ids.has(match[1]),match[1]);
 assert.ok(!html.includes('admin.html'));assert.ok(!html.includes('config.js'));
});
test('theme ships local assets and 3-language content',()=>{
 const data=JSON.parse(readFileSync(root+'defaults.json','utf8'));
 for(const key of Object.keys(data.en))for(const lang of ['ru','hy'])assert.ok(key in data[lang]);
 for(const f of ['index.php','functions.php','front-page.php','style.css','assets/hero-mock.jpg','assets/logo-emblem.png'])assert.ok(existsSync(root+f));
});
