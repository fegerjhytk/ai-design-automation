// ES3. cli loads json2, flow_plan.jsx and puppet_core.jsx first.
function applyPuppetAnimation(aiFilePath, aepOutputPath, durationSec, recipeJsonPath, settings) {
    settings = settings || {};
    var source = new File(aiFilePath), output = new File(aepOutputPath), project = app.project;
    if (!source.exists || !output.parent.exists || !/\.aep$/i.test(output.name)) throw new Error('Invalid input/output');
    if (output.exists) throw new Error('Output exists; archive the previous owned output first');
    if (!project || project.numItems || project.file || project.dirty) throw new Error('Use a fresh empty AE project');
    if (!settings.units || !settings.units.length) throw new Error('An inspected Illustrator unit manifest is required');
    var options = {flow:settings.flow || 'columns'};
    if (settings.holdSeconds !== undefined) options.holdSeconds = settings.holdSeconds;
    var recipe = recipeJsonPath ? Puppet.read(recipeJsonPath) : null;
    // A choreography recipe orders units and may assign stages, without replacing source values.
    if (recipe && recipe.schemaVersion !== 3) throw new Error('Legacy recipes require migration to schemaVersion 3; refusing partial replay');
    if (recipe) {
        var roles = recipe.units || {}, selected = {};
        for (var i=0;i<settings.units.length;i++) {
            var u=settings.units[i], override=roles[u.name];
            if (!override) throw new Error('Recipe misses visible unit: '+u.name);
            if (typeof override.stage !== 'number' || !isFinite(override.stage)) throw new Error('Recipe stage missing: '+u.name);
            u.stage=override.stage;
            if (override.background !== undefined) u.background=override.background;
            selected['$'+u.name]=true;
        }
        for (var name in roles) if (roles.hasOwnProperty(name) && !selected['$'+name]) throw new Error('Recipe names missing artwork: '+name);
    }
    var plan = ReadingFlow.plan(settings.units, durationSec === undefined ? 10 : durationSec, settings.frameRate || 24, options);
    var io = new ImportOptions(source);
    io.sequence = false;
    if (!io.canImportAs(ImportAsType.COMP_CROPPED_LAYERS)) throw new Error('AI does not support layered composition import');
    io.importAs = ImportAsType.COMP_CROPPED_LAYERS;
    var comp = project.importFile(io);
    if (!(comp instanceof CompItem)) throw new Error('Import did not return a composition');
    if (comp.numLayers !== settings.units.length) throw new Error('Visible AI/AE unit count mismatch; inspect hidden or empty layers');
    var byName = {}, manifest = {}, original = {}, animated = {}, report;
    for (var i=0;i<settings.units.length;i++) manifest['$'+settings.units[i].name]=settings.units[i];
    for (var i=1;i<=comp.numLayers;i++) {
        var layer=comp.layer(i), key='$'+layer.name;
        if (!manifest[key] || byName[key]) throw new Error('AI/AE name mismatch: '+layer.name);
        Puppet.simpleLayer(layer);
        if (layer.threeDLayer || layer.locked) throw new Error('Expected fresh 2D artwork');
        byName[key]=layer;
        original[key]={position:Puppet.prop(layer,'ADBE Position').value.slice(0),
            scale:Puppet.prop(layer,'ADBE Scale').value.slice(0),opacity:Puppet.prop(layer,'ADBE Opacity').value};
    }
    // Do not resize a composition without translating its layer coordinates.
    if (settings.width && Math.abs(comp.width-settings.width)>1 || settings.height && Math.abs(comp.height-settings.height)>1)
        throw new Error('Imported composition does not match Illustrator artboard dimensions');
    comp.frameRate=plan.fps; comp.duration=plan.duration; comp.workAreaStart=0; comp.workAreaDuration=plan.duration;
    comp.motionBlur=true; comp.shutterAngle=180; comp.shutterPhase=-90;
    app.beginUndoGroup('Ordered reading-flow animation');
    try {
        for (var i=1;i<=comp.numLayers;i++) {
            var layer=comp.layer(i); layer.inPoint=0; layer.outPoint=plan.duration; layer.motionBlur=true;
            // Keep the importer renderer/default rasterization settings for complex appearances.
        }
        for (var i=0;i<plan.beats.length;i++) {
            var beat=plan.beats[i], key='$'+beat.name, layer=byName[key], base=original[key];
            var dx=0, dy=Math.min(comp.height*0.025,36);
            if (beat.stage<=1) { dx=-Math.min(comp.width*0.018,30); dy=0; }
            else if (beat.stage===2 || beat.stage===3) dy=-Math.min(comp.height*0.018,24);
            var pos=base.position.slice(0); pos[0]+=dx;pos[1]+=dy;
            Puppet.track(Puppet.prop(layer,'ADBE Position'),[beat.start,beat.end],[pos,base.position]);
            Puppet.track(Puppet.prop(layer,'ADBE Opacity'),[beat.start,beat.start+(beat.end-beat.start)*0.7],[0,base.opacity]);
            layer.inPoint=beat.start;
            // Protected units receive only whole-layer motion; underlying opacity/effects stay untouched.
            animated[key]=true;
        }
        for (var i=0;i<plan.ambient.length;i++) {
            var unit=plan.ambient[i], key='$'+unit.name, layer=byName[key], base=original[key];
            var drift=base.scale.slice(0);drift[0]*=1.008;drift[1]*=1.008;
            Puppet.track(Puppet.prop(layer,'ADBE Scale'),[0,plan.motionEnd*0.5,plan.motionEnd],[base.scale,drift,base.scale]);
            animated[key]=true;
        }
        for (var i=1;i<=comp.numLayers;i++) {
            var layer=comp.layer(i), key='$'+layer.name;
            if (!animated[key]) throw new Error('Unanimated visible unit: '+layer.name);
            layer.outPoint=plan.duration; // inPoint updates can alter span in the AE host.
            Puppet.walk(layer,function(p){
                if (p.numKeys) p.setInterpolationTypeAtKey(p.numKeys,p.keyInInterpolationType(p.numKeys),KeyframeInterpolationType.HOLD);
            });
        }
        report=Puppet.audit(comp,plan.holdStart);
        if (report.violations.length) throw new Error(report.violations.join('; '));
        // Resting layout equals the imported layout. Background drift also returns to its source scale.
        for (var key in byName) if (byName.hasOwnProperty(key)) {
            var layer=byName[key], base=original[key];
            var values=[['ADBE Position',base.position],['ADBE Scale',base.scale],['ADBE Opacity',base.opacity]];
            for (var q=0;q<values.length;q++) {
                var got=Puppet.prop(layer,values[q][0]).valueAtTime(plan.holdStart,false), expected=values[q][1];
                if (expected instanceof Array) {
                    for (var d=0;d<expected.length;d++) if (Math.abs(got[d]-expected[d])>0.0001) throw new Error('Resting layout changed: '+layer.name);
                } else if (Math.abs(got-expected)>0.0001) throw new Error('Resting opacity changed');
            }
        }
    } finally { app.endUndoGroup(); }
    if (app.project!==project || project.file) throw new Error('Project ownership changed');
    project.save(output); comp.openInViewer();
    comp.time=0;
    return {ok:true,compName:comp.name,duration:comp.duration,layers:comp.numLayers,outputAep:output.fsName,
        report:report,plan:plan,coveredLeaves:plan.coveredLeaves};
}
