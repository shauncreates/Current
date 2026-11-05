const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'cep/index.html')).href);
    await page.waitForFunction(()=>window.CurrentPanel);
    async function geometry(label) {
      await page.waitForFunction(()=>{const g=document.querySelector('#graph'),v=g.viewBox.baseVal;return Math.abs(v.width-g.clientWidth)<0.1&&Math.abs(v.height-g.clientHeight)<0.1;});
      const values=await page.evaluate(()=>{
        const ids=['start','end','h0','h2','hit0','hit2'];const knobs=ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,width:r.width,height:r.height};});
        const icons=[...document.querySelectorAll('.control-icon')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};});
        const m=document.getElementById('graph').getScreenCTM();return {knobs,icons,scale:[m.a,m.d]};
      });
      for(const knob of values.knobs){assert(Math.abs(knob.width-knob.height)<0.1,label+' round '+knob.id);assert(Math.abs(knob.width-(knob.id.startsWith('hit')?30:knob.id.startsWith('h')?12:6))<0.1,label+' fixed diameter '+knob.id);}
      for(const icon of values.icons){assert(Math.abs(icon.width-14)<0.1&&Math.abs(icon.height-14)<0.1,label+' fixed icon');}
      assert(Math.abs(values.scale[0]-values.scale[1])<0.001,label+' uniform stroke scale');return values;
    }
    const checks=[];
    for(const [width,height] of [[240,640],[500,640],[1200,400],[280,1000]]){
      await page.setViewportSize({width,height});checks.push({width,height,...await geometry('viewport '+width+'x'+height)});
      await page.locator('#compact').click();await geometry('compact '+width);await page.locator('#compact').click();await geometry('expanded '+width);
    }
    await page.evaluate(()=>document.getElementById('graph').style.height='340px');await geometry('container height without window resize');
    const h=await page.locator('#hit0').boundingBox(),g=await page.locator('#graph').boundingBox();
    const target={x:g.x+20+(g.width-40)*0.6,y:g.y+16+(g.height-39)*0.65};
    await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up();
    const config=await page.evaluate(()=>CurrentPanel.getConfig());assert(Math.abs(config.curve[0]-0.6)<0.01);assert(Math.abs(config.curve[1]-0.35)<0.01);
    fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'artifacts/resize-tall.png')});
    await page.evaluate(()=>document.getElementById('graph').style.height='');await page.setViewportSize({width:1200,height:500});await geometry('wide final');
    await page.screenshot({path:path.join(__dirname,'artifacts/resize-wide.png')});
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'artifacts/resize-result.json'),JSON.stringify({ok:true,checks,drag:config.curve},null,2));
    console.log('Resize: 4 viewport shapes, compact toggles, container-only resize, fixed circles/icons/strokes and drag mapping passed.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
