const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const planner=require(path.join(root,'flow_plan.jsx'));
const units=[
{name:'BG_Base',cx:.5,cy:.5,width:1,height:1,background:true,leaves:50,protectedAppearance:true},
{name:'Bottom_MisnamedBody',cx:.2,cy:.65,width:.3,height:.1,leaves:1},
{name:'Logo',cx:.2,cy:.1,width:.2,height:.1,leaves:1},
{name:'Right_Frame',cx:.7,cy:.4,width:.5,height:.4,leaves:8},
{name:'Right_Title',cx:.7,cy:.2,width:.3,height:.1,leaves:1},
{name:'Card_C',cx:.9,cy:.7,width:.1,height:.1,leaves:3},
{name:'Card_A',cx:.5,cy:.7,width:.1,height:.1,leaves:3},
{name:'Card_B',cx:.7,cy:.7,width:.1,height:.1,leaves:3},
{name:'Bottom_Ribbon',cx:.5,cy:.91,width:1,height:.2,leaves:2},
{name:'Bottom_Details',cx:.2,cy:.92,width:.3,height:.1,leaves:2}];
test('geometry wins over misleading labels, prices sort by X, footer follows body',()=>{
 const p=planner.plan(units,10,24,{});
 assert.deepEqual(p.beats.map(b=>b.name),['Logo','Bottom_MisnamedBody','Right_Frame','Right_Title','Card_A','Card_B','Card_C','Bottom_Ribbon','Bottom_Details']);
 assert.equal(p.coveredLeaves,74);assert.equal(p.units,units.length);
});
test('requested duration and final hold remain correct across short and long briefs',()=>{
 for(const duration of [0.5,4,10,12,20]){
  const p=planner.plan(units,duration,24,{});
  assert(Math.abs(p.duration-duration)<=1/48);assert(p.duration-p.holdStart<=1+1/24);
  assert(Math.abs(p.beats.at(-1).end-p.motionEnd)<1e-8);
  for(let i=1;i<p.beats.length;i++)assert(p.beats[i].start>p.beats[i-1].start);
  assert(p.motionEnd<=p.holdStart-1/24+1e-8);
 }
});
test('dense layouts limit concurrent entrances and preserve complete coverage',()=>{
 const many=Array.from({length:100},(_,i)=>({name:'object_'+i,cx:(i%10)/10,cy:Math.floor(i/10)/10,width:.05,height:.05,leaves:1}));
 const p=planner.plan(many,10,24,{});assert.equal(p.beats.length,100);
 let maximum=0;
 for(const beat of p.beats)maximum=Math.max(maximum,p.beats.filter(b=>b.start<=beat.start&&b.end>beat.start).length);
 assert(maximum<=2);
});
test('invalid FPS, hold and duplicate unit names fail explicitly',()=>{
 assert.throws(()=>planner.plan(units,0,24,{}));assert.throws(()=>planner.plan(units,10,0,{}));
 assert.throws(()=>planner.plan(units,10,24,{holdSeconds:10}));
 assert.throws(()=>planner.plan([units[0],units[0]],10,24,{}),/Duplicate/);
});
test('CLI accepts multi-file input and refuses unknown options',()=>{
 const cli=require(path.join(root,'cli_puppet_animator.js'));
 const a=cli.parseArgs(['--file','a.ai','b.ai','--duration','10']);assert.equal(a.files.length,2);assert.equal(a.duration,10);
 assert.throws(()=>cli.parseArgs(['--file','a.ai','b.ai','--output','out.aep']));
 assert.throws(()=>cli.parseArgs(['--bogus']));
});
test('AE mock: all units move, source rest values/depth survive, exact duration and hold audit pass',()=>{
 const core=fs.readFileSync(path.join(root,'puppet_core.jsx'),'utf8');
 const animate=fs.readFileSync(path.join(root,'apply_puppet_animation.jsx'),'utf8');
 const plannerSource=fs.readFileSync(path.join(root,'flow_plan.jsx'),'utf8');
 const setup=String.raw`
 var names=manifest.map(function(u){return u.name;});
 var OldFile=File;File=function(p){OldFile.call(this,p);this.name=p.split('/').pop();};File.prototype=OldFile.prototype;
 CompItem.prototype.openInViewer=function(){};
 var app={beginUndoGroup:function(){},endUndoGroup:function(){},project:{file:null,dirty:false,items:[],bitsPerChannel:32,
 item:function(i){return this.items[i-1];},importFile:function(){var c=new CompItem(names);this.items.push(c);return c;},
 save:function(f){this.file=f;files[f.path]='aep';}}};
 Object.defineProperty(app.project,'numItems',{get:function(){return this.items.length;}});
 var result=applyPuppetAnimation('/art.ai','/out.aep',10,'',{units:manifest,frameRate:24});
 var c=app.project.item(1);assert.equal(c.duration,10);assert.equal(c.numLayers,manifest.length);assert.equal(app.project.bitsPerChannel,32);
 assert.equal(result.report.violations.length,0);
 for(var i=1;i<=c.numLayers;i++){
 var l=c.layer(i),p=Puppet.prop(l,'ADBE Position'),s=Puppet.prop(l,'ADBE Scale'),o=Puppet.prop(l,'ADBE Opacity');
 assert(p.numKeys||s.numKeys);assert.equal(l.outPoint,10);assert.deepEqual(s.value,[80,120]);assert.equal(o.value,75);
 Puppet.walk(l,function(q){for(var k=1;k<=q.numKeys;k++)assert(q.keyTime(k)<=result.plan.motionEnd+1e-8);});
 }
 `;
 vm.runInNewContext(core+'\n'+require('./mock-ae.cjs')+'\n'+plannerSource+'\n'+animate+'\n'+setup,{require,console,manifest:JSON.parse(JSON.stringify(units))});
});
test('plain containers separate logo/title/body while duplicated title treatment and opacity groups stay intact',()=>{
 const context={console};vm.createContext(context);
 const fixture=String.raw`
 var BlendModes={NORMAL:0},ElementPlacement={PLACEATEND:0};
 function File(p){this.fsName=p;this.exists=true;}
 function ExportOptionsPNG24(){}var ExportType={PNG24:1};
 var layers=[];
 function node(type,name,bounds,content){var n={typename:type,name:name,visibleBounds:bounds,contents:content,opacity:100,blendingMode:0,clipped:false,pageItems:[]};
 n.move=function(target){this.parent.pageItems.splice(this.parent.pageItems.indexOf(this),1);this.parent=target;target.pageItems.push(this);};
 n.remove=function(){if(this.parent)this.parent.pageItems.splice(this.parent.pageItems.indexOf(this),1);else layers.splice(layers.indexOf(this),1);};return n;}
 function attach(parent,items){parent.pageItems=items;items.forEach(function(x){x.parent=parent;});return parent;}
 var christmas=attach(node('GroupItem','ChristmasTreatment',[50,700,400,550]),[node('TextFrame','',[50,700,400,550],'Christmas'),node('TextFrame','',[51,699,401,549],'Christmas')]);
 var day=attach(node('GroupItem','DayTreatment',[50,550,400,450]),[node('TextFrame','',[50,550,400,450],'Day'),node('TextFrame','',[51,549,401,449],'Day')]);
 var title=attach(node('GroupItem','plainTitles',[50,700,400,450]),[christmas,day]);
 var logo=node('PlacedItem','logo',[50,950,300,850]);
 var body=node('TextFrame','',[50,400,400,350],'Body copy');
 var layout=attach(node('GroupItem','plainLayout',[50,950,400,350]),[logo,title,body]);
 var bg=attach(node('GroupItem','protectedBackground',[0,1000,1000,0]),[node('PathItem','',[0,1000,1000,0])]);bg.opacity=50;bg.clipped=true;
 var root=attach(node('Layer','root',[0,1000,1000,0]),[layout,bg]);layers.push(root);
 layers.add=function(){var l=node('Layer','',[0,1000,1000,0]);layers.unshift(l);return l;};
 var doc={fullName:new File('/working.ai'),layers:layers,artboards:[{artboardRect:[0,1000,1000,0]}],exportFile:function(){}};
 var app={documents:[doc]};
 function unpackIllustratorDoc(){return {names:layers.map(function(l){return l.name;}),count:layers.length};}
 var result=prepareAnimationUnits('/working.ai','/out.ai',['plainLayout','plainTitles'],true,'/cache/after');
 if(result.count!==5)throw Error('Expected five independent units');
 if(logo.parent===christmas.parent||christmas.parent===day.parent)throw Error('Title units remained bundled');
 if(christmas.pageItems.length!==2||day.pageItems.length!==2)throw Error('Title treatment split');
 if(bg.opacity!==50||!bg.clipped||bg.pageItems.length!==1)throw Error('Background appearance changed');
 `;
 vm.runInContext(fs.readFileSync(path.join(root,'prepare_units.jsx'),'utf8')+'\n'+fixture,context);
});
test('logo, Christmas, Day and body receive distinct ordered entrances',()=>{
 const u=[{name:'Left_Day_Day',cx:.2,cy:.42,width:.2,height:.2},{name:'Left_Logo',cx:.2,cy:.1,width:.2,height:.1},{name:'Left_Christmas_Christmas',cx:.2,cy:.3,width:.35,height:.2},{name:'Left_Body',cx:.2,cy:.65,width:.3,height:.1},{name:'Left_Santa_Christmas_Tree',cx:.2,cy:.72,width:.3,height:.1}];
 const p=planner.plan(u,10,24,{});
 assert.deepEqual(p.beats.map(b=>b.name),['Left_Logo','Left_Christmas_Christmas','Left_Day_Day','Left_Body','Left_Santa_Christmas_Tree']);
});
