#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {spawnSync}=require('child_process');
const cacheRoot=path.join(os.homedir(),'.cache','antigravity','puppet-animations');
function jsxString(value){return JSON.stringify(value).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function parseArgs(argv){
 const out={duration:10,frameRate:24,flow:'columns',files:[]};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a==='--file'||a==='--files'){while(i+1<argv.length&&!argv[i+1].startsWith('--'))out.files.push(path.resolve(argv[++i]));}
  else if(['--output','--recipe','--extract'].includes(a)){if(!argv[i+1])throw Error('Missing '+a);out[a.slice(2)]=path.resolve(argv[++i]);}
  else if(a==='--duration')out.duration=Number(argv[++i]);
  else if(a==='--fps')out.frameRate=Number(argv[++i]);
  else if(a==='--hold-seconds')out.holdSeconds=Number(argv[++i]);
  else if(a==='--hold')out.holdSeconds=Number(argv[++i])*out.duration;
  else if(a==='--flow')out.flow=argv[++i];
  else if(a==='--comp')out.comp=argv[++i];
  else if(a==='--allow-missing-links')out.allowMissingLinks=true;
  else if(a==='--no-preview')continue;
  else if(/\.ai$/i.test(a))out.files.push(path.resolve(a));
  else throw Error('Unknown argument: '+a);
 }
 if(!Number.isFinite(out.duration)||out.duration<=0||!Number.isFinite(out.frameRate)||out.frameRate<1||out.frameRate>99)throw Error('Invalid duration/FPS');
 if(out.holdSeconds!==undefined&&(!Number.isFinite(out.holdSeconds)||out.holdSeconds<0||out.holdSeconds>=out.duration||out.holdSeconds>2))throw Error('Hold must be below duration and at most two seconds');
 if(!['columns','top-bottom','left-right'].includes(out.flow))throw Error('Invalid reading flow');
 if(out.output&&out.files.length>1)throw Error('--output requires one input');
 return out;
}
function runExtendScript(host,scriptName,expression){
 if(!['illustrator','aftereffects'].includes(host))throw Error('Unknown host');
 fs.mkdirSync(cacheRoot,{recursive:true});
 const temp=fs.mkdtempSync(path.join(cacheRoot,'bridge-')),receipt=path.join(temp,'receipt.json'),entry=path.join(temp,'run.jsx');
 const dependencies=['vendor/json2.js'];
 if(host==='illustrator')dependencies.push('unpack_illustrator.jsx');
 if(host==='aftereffects')dependencies.push('puppet_core.jsx','flow_plan.jsx');
 const code='try {\n'+dependencies.concat([scriptName]).filter(Boolean).map(n=>'$.evalFile(new File('+jsxString(path.resolve(__dirname,n))+'));').join('\n')+
 '\nvar envelope={ok:true,result:'+expression+'};\n}catch(e){var envelope={ok:false,error:String(e),line:e.line||null};}\n'+
 'var f=new File('+jsxString(receipt)+');f.encoding="UTF-8";if(!f.open("w"))throw Error("Cannot write receipt");f.write(JSON.stringify(envelope));f.close();';
 fs.writeFileSync(entry,code);
 const app=host==='illustrator'?(process.env.ILLUSTRATOR_APP||'/Applications/Adobe Illustrator 2026/Adobe Illustrator.app'):(process.env.AFTER_EFFECTS_APP||'Adobe After Effects 2026');
 // Raw event avoids Illustrator terminology lookup failures in newer installations.
 const command=host==='illustrator'?'«event miscDjxM» '+jsxString('$.evalFile(new File('+jsxString(entry)+'));'):'DoScriptFile '+jsxString(entry);
 const call=spawnSync('osascript',['-e','with timeout of 180 seconds\ntell application '+jsxString(app)+' to '+command+'\nend timeout'],{encoding:'utf8',timeout:190000,maxBuffer:1024*1024});
 if(call.error||call.status!==0)throw Error((call.error?.message||call.stderr||'Adobe bridge failed')+'; diagnostics: '+temp);
 if(!fs.existsSync(receipt))throw Error('Adobe returned without receipt: '+temp);
 const result=JSON.parse(fs.readFileSync(receipt,'utf8'));
 if(!result.ok)throw Error(result.error+' (JSX line '+result.line+'); diagnostics: '+temp);
 fs.rmSync(temp,{recursive:true,force:true});return result.result;
}
function reviewSafeGroups(svg,groups){
 const code=`import sys,json,xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1]).getroot()
expected={g['name']:g for g in json.loads(sys.argv[2])}
safe=[]
for e in root.iter():
 name=e.attrib.get('id','').replace('_x5F_','_')
 if name not in expected: continue
 if e.tag.split('}')[-1]!='g': continue
 if any(k not in ('id',) for k in e.attrib): continue
 direct=list(e)
 images=sum(x.tag.split('}')[-1]=='image' for x in direct)
 if not (expected[name]['directImages']-expected[name].get('directMissingImages',0)<=images<=expected[name]['directImages']): continue
 if any(x.tag.split('}')[-1] in ('filter','mask','clipPath') for x in direct): continue
 safe.append(name)
print(json.dumps(safe))`;
 const call=spawnSync('python3',['-c',code,svg,JSON.stringify(groups)],{encoding:'utf8',timeout:10000});
 if(call.status!==0)throw Error('SVG appearance review failed: '+call.stderr);
 return JSON.parse(call.stdout);
}
function verifyRasterEquality(before,after){
 const check=spawnSync('swift',[path.join(__dirname,'compare_renders.swift'),before,after],{encoding:'utf8',timeout:60000});
 if(check.status!==0)throw Error('Before/after appearance check failed: '+check.stdout+check.stderr);
 console.log(check.stdout.trim());
}
function waitForAI(file){
 const deadline=Date.now()+30000;let stamp='',stable=0;
 while(Date.now()<deadline){
  if(fs.existsSync(file)){
   const st=fs.statSync(file),next=st.size+':'+st.mtimeMs;
   if(next!==stamp){stamp=next;stable=Date.now();}
   if(st.size>100&&Date.now()-stable>1000){
    const fd=fs.openSync(file,'r'),head=Buffer.alloc(5),tail=Buffer.alloc(Math.min(2048,st.size));
    try{fs.readSync(fd,head,0,5,0);fs.readSync(fd,tail,0,tail.length,st.size-tail.length);}finally{fs.closeSync(fd);}
    if(head.toString()==='%PDF-'&&tail.includes(Buffer.from('%%EOF')))return;
   }
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
 }
 throw Error('AI save did not complete with PDF compatibility');
}
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function processSingleFile(source,opts){
 if(!fs.existsSync(source)||!fs.statSync(source).isFile()||!/\.ai$/i.test(source))throw Error('Missing .ai input: '+source);
 const base=path.basename(source,path.extname(source));
 const aep=opts.output||path.join(os.homedir(),'Desktop',base+'.aep');
 const ai=path.join(path.dirname(aep),path.basename(aep,'.aep')+'.ai');
 if(!/\.aep$/i.test(aep)||fs.existsSync(aep)||fs.existsSync(ai))throw Error('Final pair already exists. Archive only verified workflow-owned outputs before rerunning.');
 runExtendScript('aftereffects','', '(function(){if(!app.project)app.newProject();if(app.project.numItems||app.project.file||app.project.dirty)throw Error("Use a fresh empty AE project");return {ready:true};})()');
 fs.mkdirSync(cacheRoot,{recursive:true});fs.mkdirSync(path.dirname(aep),{recursive:true});
 const job=fs.mkdtempSync(path.join(cacheRoot,'job-')),working=path.join(job,base+'.working.ai'),sourceHash=hash(source);
 fs.copyFileSync(source,working,fs.constants.COPYFILE_EXCL);
 console.log('Preparing intact artwork: '+source);
 const svg=path.join(job,'appearance.svg');
 const review=runExtendScript('illustrator','prepare_units.jsx','reviewAnimationAppearance('+jsxString(working)+','+jsxString(svg)+','+Boolean(opts.allowMissingLinks)+')');
 const safe=reviewSafeGroups(svg,review.groups);
 const manifest=runExtendScript('illustrator','prepare_units.jsx','prepareAnimationUnits('+jsxString(working)+','+jsxString(ai)+','+JSON.stringify(safe)+','+Boolean(opts.allowMissingLinks)+','+jsxString(path.join(job,'after'))+')');
 manifest.missingLinks=review.missingLinks;
 // Preparation renders are copied into cache before any animation is accepted.
 const before=svg+'.png';
 if(fs.existsSync(before))fs.renameSync(before,path.join(job,'before.png'));
 verifyRasterEquality(path.join(job,'before.png'),path.join(job,'after.png'));

 waitForAI(ai);
 const settings={units:manifest.units,width:manifest.artboard.width,height:manifest.artboard.height,frameRate:opts.frameRate,flow:opts.flow};
 if(opts.holdSeconds!==undefined)settings.holdSeconds=opts.holdSeconds;
 fs.writeFileSync(path.join(job,'manifest.json'),JSON.stringify(manifest,null,2));
 console.log('Animating '+manifest.layers+' intact units / '+manifest.coveredLeaves+' visible leaves');
 const result=runExtendScript('aftereffects','apply_puppet_animation.jsx','applyPuppetAnimation('+jsxString(ai)+','+jsxString(aep)+','+opts.duration+','+jsxString(opts.recipe||'')+','+JSON.stringify(settings)+')');
 if(!fs.existsSync(aep)||!fs.statSync(aep).size)throw Error('AEP save failed');
 if(hash(source)!==sourceHash)throw Error('Input source changed during the run');
 const report={source,sourceHash,ai,aep,manifest,result,job};
 fs.writeFileSync(path.join(job,'report.json'),JSON.stringify(report,null,2));
 // Close only the owned prepared document, and only when no other Illustrator files are open.
 runExtendScript('illustrator','cleanup_illustrator.jsx','cleanupIllustratorDoc('+jsxString(ai)+')');
 fs.rmSync(working,{force:true});
 console.log(JSON.stringify({aep,ai,duration:result.duration,units:result.layers,coveredLeaves:result.coveredLeaves,hold:result.report.staticHoldDuration,report:path.join(job,'report.json')},null,2));
 return report;
}
function main(argv){
 const opts=parseArgs(argv);
 if(opts.extract)throw Error('Animation recipes now use schemaVersion 3 ordered-unit stages; legacy extraction is not compatible.');
 if(!opts.files.length)throw Error('Provide --file followed by one or more AI paths');
 const results=[];
 for(const file of opts.files){
  if(results.length){
   const prior=results[results.length-1].aep;
   runExtendScript('aftereffects','', '(function(){var p=app.project;if(!p.file||p.file.fsName!=='+jsxString(prior)+'||p.dirty)throw Error("Owned project changed; stop batch");if(!p.close(CloseOptions.DO_NOT_SAVE_CHANGES))throw Error("Close cancelled");app.newProject();return true;})()');
  }
  results.push(processSingleFile(file,opts));
 }
 return results;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('FATAL: '+e.message);process.exitCode=1;}}
module.exports={main,parseArgs,runExtendScript,jsxString,processSingleFile};
