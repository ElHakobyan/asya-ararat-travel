import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
class Element {
 constructor(){this.value='';this.files=[];this.children=[];this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(){this.children=[];}
 addEventListener(name,fn){this.listeners[name]=fn;}
 reset(){} scrollIntoView(){} focus(){}
}
function setup(){
 const nodes=new Map(); const $=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 const calls=[], messages=[];
 const ctx=vm.createContext({document:{createElement:()=>new Element()},$,CFG:{url:'https://example.supabase.co'},crypto:{randomUUID:()=> 'unique'},say:(...x)=>messages.push(x),btn:()=>new Element(),api:async(path,opts)=>{calls.push({path,opts});return {ok:true,json:async()=>opts?.method?[{id:'saved'}]:[]};}});
 vm.runInContext(readFileSync('admin-cms.js','utf8'),ctx);
 return {ctx,$,calls,messages};
}
test('existing admin scripts parse independently',()=>{
 const html=readFileSync('admin.html','utf8');for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});
test('tour save sends multilingual structured data and reports success only after server response',async()=>{
 const {$,calls,messages}=setup();
 $('cms-ru-title').value='Токио';$('tourStatus').value='draft';$('tourCurrency').value='USD';$('tourOrder').value='0';
 await $('tourForm').listeners.submit({preventDefault(){}});
 const save=calls.find(x=>x.opts?.method==='POST');assert.ok(save);
 const data=JSON.parse(save.opts.body);assert.equal(data.translations.ru.title,'Токио');assert.equal(data.price,null);assert.equal(data.status,'draft');
 assert.equal(messages.at(-1)[2],'ok');assert.equal($('saveTour').disabled,false);
});
test('oversize image is rejected before uploading or saving',async()=>{
 const {$,calls,messages}=setup();$('tourUpload').files=[{type:'image/jpeg',size:6*1024*1024}];
 await $('tourForm').listeners.submit({preventDefault(){}});
 assert.equal(calls.length,0);assert.equal(messages.at(-1)[2],'err');
});
test('unsafe image URL is rejected before persistence',async()=>{
 const {$,calls,messages}=setup();$('tourImage').value='javascript:alert(1)';
 await $('tourForm').listeners.submit({preventDefault(){}});
 assert.equal(calls.length,0);assert.equal(messages.at(-1)[2],'err');
});
