// Appearance-reviewed preparation. Never expand/outline/rasterize effects or alter opacity.
function animationWorkingDocument(filePath) {
    var f=new File(filePath);
    for(var i=0;i<app.documents.length;i++)try{if(app.documents[i].fullName.fsName===f.fsName)return app.documents[i];}catch(e){}
    return app.open(f);
}
function reviewAnimationAppearance(workingPath,svgPath,allowMissingLinks){
    var previous=app.userInteractionLevel;
    try{
        app.userInteractionLevel=UserInteractionLevel.DONTDISPLAYALERTS;
        var d=animationWorkingDocument(workingPath),missing=[],groups=[];
        for(var i=0;i<d.placedItems.length;i++){
            try{if(!d.placedItems[i].file.exists)missing.push(d.placedItems[i].name);}catch(e){missing.push(d.placedItems[i].name);}
        }
        if(missing.length&&!allowMissingLinks)throw Error('Missing linked artwork: '+missing.join(', '));
        for(var i=0;i<d.groupItems.length;i++)d.groupItems[i].name='AnimationReview_'+i;
        for(var i=0;i<d.groupItems.length;i++){
            var g=d.groupItems[i],directImages=0,directMissingImages=0;
            for(var j=0;j<g.pageItems.length;j++)if(g.pageItems[j].parent===g&&g.pageItems[j].typename==='PlacedItem'){
                directImages++;try{if(!g.pageItems[j].file.exists)directMissingImages++;}catch(e){directMissingImages++;}
            }
            groups.push({name:g.name,directImages:directImages,directMissingImages:allowMissingLinks?directMissingImages:0});
        }
        var png=new ExportOptionsPNG24();png.artBoardClipping=true;png.horizontalScale=png.verticalScale=60;
        d.exportFile(new File(svgPath+'.before'),ExportType.PNG24,png);
        var options=new ExportOptionsSVG();options.embedRasterImages=true;options.fontType=SVGFontType.OUTLINEFONT;
        d.exportFile(new File(svgPath),ExportType.SVG,options);
        // SVG export may change document identity in Illustrator. Persist review IDs on the WORKING COPY.
        var nativeOptions=new IllustratorSaveOptions();nativeOptions.pdfCompatible=true;nativeOptions.embedLinkedFiles=!allowMissingLinks;
        d.saveAs(new File(workingPath),nativeOptions);
        return {missingLinks:missing,groups:groups};
    }finally{app.userInteractionLevel=previous;}
}
function prepareAnimationUnits(workingPath,outputPath,safeGroups,allowMissingLinks,renderBase){
    var d=animationWorkingDocument(workingPath),ab=d.artboards[0].artboardRect;
    if(d.artboards.length!==1)throw Error('Select a single-artboard source explicitly');
    // Existing layers already express appearance boundaries; do not decompose them.
    if(d.layers.length>1){
        var existing=unpackIllustratorDoc(workingPath,outputPath,allowMissingLinks);
        var preview=new ExportOptionsPNG24();preview.artBoardClipping=true;preview.horizontalScale=preview.verticalScale=60;
        d.exportFile(new File(renderBase),ExportType.PNG24,preview);return existing;
    }
    var root=d.layers[0],safe={};
    for(var i=0;i<safeGroups.length;i++)safe['$'+safeGroups[i]]=true;
    if(root.opacity!==100||root.blendingMode!==BlendModes.NORMAL)throw Error('Root layer appearance is protected');
    var w=ab[2]-ab[0],h=ab[1]-ab[3],units=[];
    function children(parent){var a=[];if(!parent.pageItems)return a;for(var i=0;i<parent.pageItems.length;i++)if(parent.pageItems[i].parent===parent)a.push(parent.pageItems[i]);return a;}
    function texts(item,out){if(item.typename==='TextFrame')out.push(item.contents);else if(item.typename==='GroupItem'){var a=children(item);for(var i=0;i<a.length;i++)texts(a[i],out);}return out;}
    function collect(parent){
        var items=children(parent);
        for(var i=0;i<items.length;i++){
            var x=items[i],b=x.visibleBounds,tw=(b[2]-b[0])/w,th=(b[1]-b[3])/h;
            var t=texts(x,[]),repeated=t.length>1;
            for(var q=1;q<t.length;q++)if(t[q]!==t[0])repeated=false;
            var protectedGroup=x.typename==='GroupItem'&&(!safe['$'+x.name]||x.clipped||x.opacity!==100||x.blendingMode!==BlendModes.NORMAL);
            // Text shadow/duplicate treatments, illustrations, badges and cards stay cohesive.
            var direct=children(x),onlyText=direct.length>0;
            for(var q=0;q<direct.length;q++)if(direct[q].typename!=='TextFrame')onlyText=false;
            var cohesive=(!onlyText&&tw<0.31&&th<0.25)||t.length===0||repeated;
            if(x.typename==='GroupItem'&&!protectedGroup&&!cohesive)collect(x);
            else units.push(x);
        }
    }
    collect(root);
    if(units.length<2)throw Error('Insufficient independently prepared animation units');
    function label(x,i){
        var b=x.visibleBounds,cy=(ab[1]-(b[1]+b[3])/2)/h,cx=((b[0]+b[2])/2-ab[0])/w;
        var rawTexts=texts(x,[]);
        if(b[0]>=ab[2]||b[2]<=ab[0]||b[1]<=ab[3]||b[3]>=ab[1])return 'Ambient_Pasteboard';
        if(rawTexts.length===0&&x.typename==='GroupItem'&&!x.clipped&&cx<.45&&cy<.2&&(b[2]-b[0])<w*.12)return 'Ambient_Ornament';
        var t=rawTexts.join('_').replace(/[^a-zA-Z0-9]+/g,'_').substr(0,60);
        if(x.typename==='GroupItem'&&x.clipped)return 'BG_Clipped_Artboard';
        if((b[2]-b[0])>w*.8&&cy>.75)return 'Bottom_Ribbon';
        if(x.typename==='PlacedItem')return 'Left_Logo';
        return (cy>.8?'Bottom_':cx>.45?'Right_':'Left_')+(t||'Illustration_'+i);
    }
    for(var i=units.length-1;i>=0;i--){
        var layer=d.layers.add();layer.name=label(units[i],i)+'__'+(i+1);
        units[i].move(layer,ElementPlacement.PLACEATEND);
    }
    // Only empty plain layout shells are removed. Never remove a protected appearance unit.
    if(!root.pageItems.length)root.remove();
    else {
        function emptyShells(p){var a=children(p);for(var i=a.length-1;i>=0;i--)if(a[i].typename==='GroupItem'&&safe['$'+a[i].name]&&a[i].opacity===100&&!a[i].clipped){emptyShells(a[i]);if(!a[i].pageItems.length)a[i].remove();}}
        emptyShells(root);if(root.pageItems.length)throw Error('Residual artwork remains in source layer');root.remove();
    }
    var result=unpackIllustratorDoc(workingPath,outputPath,allowMissingLinks);
    var png=new ExportOptionsPNG24();png.artBoardClipping=true;png.horizontalScale=png.verticalScale=60;
    d.exportFile(new File(renderBase),ExportType.PNG24,png);
    return result;
}
