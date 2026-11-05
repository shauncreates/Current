const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const root=path.join(__dirname,'cep');
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}if(p===root||p.endsWith(path.sep))p=path.join(p,'index.html');try{res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch(e){res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});const page=await browser.newPage({viewport:{width:300,height:640}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.hostCalls=[];window.__adobe_cep__={evalScript:(s,cb)=>{window.hostCalls.push(s);cb(JSON.stringify({ok:true,result:{properties:1}}));}};});
await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.CurrentPanel);
for(let i=0;i<20;i++){const h=await page.locator('#hit0').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(240,100,{steps:12});await page.mouse.move(60,85,{steps:12});await page.mouse.up();assert.equal(await page.evaluate(()=>CurrentPanel.isDragging()),false);}
assert.equal(await page.evaluate(()=>hostCalls.length),0,'drag must not call After Effects');
await page.locator('#apply').click();assert.equal(await page.evaluate(()=>hostCalls.length),1);
await page.locator('#list-name').fill('Mine');await page.locator('#new-list').click();await page.locator('#graph-name').fill('Saved');await page.locator('#save').click();
await page.locator('#import-file').setInputFiles({name:'Another.flow',mimeType:'application/json',buffer:Buffer.from('[{"name":"Vertical","value":[0,0.4,1,0.6]}]')});await page.waitForFunction(()=>CurrentPanel.getDocument().lists.length===2);
assert.equal(await page.evaluate(()=>CurrentPanel.getDocument().lists[1].name),'Another');
assert.equal(await page.locator('[data-mode=standard],[data-mode=spring]').count(),0);
for(const mode of ['elastic','bounce','bezier']){await page.locator('[data-mode="'+mode+'"]').click();assert.equal(await page.evaluate(()=>CurrentPanel.getConfig().mode),mode);}
for(const mode of ['elastic','bounce']) {
  await page.locator('[data-mode="'+mode+'"]').click();
  await page.waitForFunction(mode=>document.querySelector('#curve-label').textContent.startsWith(mode),mode);
  for(const id of ['hit0','hit2']) {
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const before=await page.evaluate(()=>CurrentPanel.getConfig());
    const box=await page.locator('#'+id).boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+15,{steps:8});await page.mouse.up();
    const after=await page.evaluate(()=>CurrentPanel.getConfig());
    assert.notDeepEqual(after,before,mode+' '+id+' must edit parameters '+JSON.stringify({before,after,box}));
    assert.deepEqual(after.curve,before.curve,'physics drag preserves stored Bezier');
    assert.equal(await page.evaluate(()=>CurrentPanel.isDragging()),false);
  }
}
assert.equal(await page.evaluate(()=>hostCalls.length),1,'physics drag must not call host');
// Old modes remain loadable through libraries even though their selectors are gone.
const legacy={format:'current.graph-lists',version:1,lists:[{name:'Legacy',graphs:[{name:'Old Spring',config:{mode:'spring'}},{name:'Old Ease',config:{mode:'standard',family:'quint',direction:'in'}}]}]};
await page.locator('#import-file').setInputFiles({name:'Legacy.current',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
await page.getByRole('button',{name:'Old Spring',exact:true}).click();assert.equal(await page.evaluate(()=>CurrentPanel.getConfig().mode),'spring');
await page.getByRole('button',{name:'Old Ease',exact:true}).click();assert.equal(await page.evaluate(()=>CurrentPanel.getConfig().family),'quint');
await page.locator('[data-mode=bezier]').click();
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-mode=elastic]').click();
await page.waitForTimeout(40);const reducedPath=await page.locator('#curve').getAttribute('d');await page.waitForTimeout(100);assert.equal(await page.locator('#curve').getAttribute('d'),reducedPath);
await page.emulateMedia({reducedMotion:'no-preference'});
for(const width of [240,300,500]){await page.setViewportSize({width,height:640});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow at '+width);await page.screenshot({path:path.join(__dirname,'artifacts/cep-'+width+'.png')});}
await page.setViewportSize({width:300,height:640});fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});await page.screenshot({path:path.join(__dirname,'artifacts/cep-panel.png')});
assert.deepEqual(errors,[]);console.log('CEP browser: 20 repeated drags, zero host calls on drag, explicit apply, modes, lists, Flow import and responsive layout passed.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
