// Fixed ExtendScript worker. Never generate this file from a brief.
(function () {
    var q = $.global.__designJob;
    delete $.global.__designJob;
    // ES3-compatible JSON output; no dependency on a global JSON object.
    function encode(v) {
        if (v === null) return "null";
        if (typeof v === "string") return '"' + v.replace(/[\\"\x00-\x1f]/g, function (c) {
            return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
        }) + '"';
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        var out = [], k;
        if (v instanceof Array) {
            for (k = 0; k < v.length; k++) out.push(encode(v[k]));
            return "[" + out.join(",") + "]";
        }
        for (k in v) if (v.hasOwnProperty(k)) out.push(encode(k) + ":" + encode(v[k]));
        return "{" + out.join(",") + "}";
    }
    function requireOK(test, message) { if (!test) throw Error(message); }
    function finite(v) { return typeof v === "number" && isFinite(v); }
    function copyText(v) { return v.replace(/\r\n|\r/g, "\n"); }
    function slotState(slots, ab) {
        var state = {}, n, t, chars, k, c, color;
        for (n in slots) if (slots.hasOwnProperty(n)) {
            t=slots[n]; chars=[];
            for (k=0;k<t.characters.length;k++) {
                c=t.characters[k].characterAttributes; color=c.fillColor;
                chars.push([c.size,c.textFont.name,color.typename,
                    color.typename === "RGBColor" ? [color.red,color.green,color.blue] : null]);
            }
            state[n]=[t.contents,bounds(t,ab),chars];
        }
        // Full controlled-slot state, rather than a collision-prone short hash.
        return encode(state);
    }
    function unclipped(item) {
        var parent=item.parent;
        while (parent && parent.typename !== "Document") {
            if (parent.typename === "GroupItem" && parent.clipped) return false;
            parent=parent.parent;
        }
        return true;
    }
    function rect(v) {
        return v instanceof Array && v.length === 4 && finite(v[0]) && finite(v[1]) &&
            finite(v[2]) && finite(v[3]) && v[2] > 0 && v[3] > 0;
    }
    function named(doc, name, scope) {
        var found = [], i;
        for (i = 0; i < doc.pageItems.length; i++) {
            var candidate=doc.pageItems[i], parent=candidate, allowed=!scope, backup=false;
            while (parent && parent.typename !== "Document") {
                if (parent === scope) allowed=true;
                if (parent.name === "__AUTOMATION_BACKUP__") backup=true;
                parent=parent.parent;
            }
            if (candidate.name === name && allowed && !backup) found.push(candidate);
        }
        requireOK(found.length === 1, "Expected one uniquely named item: " + name);
        return found[0];
    }
    function bounds(item, ab) {
        var b = item.visibleBounds;
        return [b[0] - ab[0], ab[1] - b[1], b[2] - b[0], b[1] - b[3]];
    }
    function inside(a, b) {
        var e = 0.5;
        return a[0] >= b[0]-e && a[1] >= b[1]-e &&
            a[0]+a[2] <= b[0]+b[2]+e && a[1]+a[3] <= b[1]+b[3]+e;
    }
    var mutated = false;
    try {
        requireOK(q && q.document, "Missing job");
        var doc = null, i, j, item, p, name, rules, ab;
        for (i = 0; i < app.documents.length; i++) {
            try { if (app.documents[i].fullName.fsName === File(q.document).fsName) doc = app.documents[i]; }
            catch (ignore) {}
        }
        requireOK(doc !== null, "Open the saved job copy first; worker never opens templates");
        requireOK(q.artboard === Math.floor(q.artboard) && q.artboard >= 0 &&
            q.artboard < doc.artboards.length, "Invalid artboard index");
        requireOK(doc.documentColorSpace === DocumentColorSpace.RGB, "RGB template required");
        doc.activate();
        ab = doc.artboards[q.artboard].artboardRect;
        var width = ab[2]-ab[0], height = ab[1]-ab[3], slots = {};
        requireOK(q.policy && q.policy.slots, "Missing trusted template policy");
        requireOK(q.expectedCopy, "Missing frozen copy");
        requireOK(Math.abs(width-q.policy.width)<0.01 && Math.abs(height-q.policy.height)<0.01,
            "Artboard dimensions do not match template policy");
        rules = q.policy.slots;
        var root=named(doc,q.policy.root);
        requireOK(root.typename === "GroupItem", "Policy root must identify the live composition group");
        requireOK(rect(q.policy.safe), "Invalid safe rectangle");
        requireOK(inside(q.policy.safe, [0,0,width,height]), "Safe rectangle outside artboard");
        for (name in rules) if (rules.hasOwnProperty(name)) {
            p = rules[name]; item = named(doc, name, root);
            requireOK(item.typename === "TextFrame" && item.kind === TextType.POINTTEXT,
                name + ": use point text with explicit line breaks");
            requireOK(item.editable, name + ": item or parent is locked/hidden");
            requireOK(unclipped(item), name + ": clipped ancestor requires a render verifier");
            requireOK(typeof q.expectedCopy[name] === "string", "Missing copy: " + name);
            requireOK(typeof p.font === "string", "Missing approved PostScript font: " + name);
            requireOK(app.textFonts.getByName(p.font).name === p.font, "Font unavailable: " + p.font);
            requireOK(rect(p.box) && finite(p.min) && finite(p.max) && p.min > 0 &&
                p.max >= p.min && inside(p.box, q.policy.safe), "Invalid policy: " + name);
            slots[name] = item;
        }
        if (q.op === "patch" || q.op === "preview")
            requireOK(q.expectedState === slotState(slots,ab), "Stale/missing slot state: inspect before editing");
        if (q.op === "patch") {
            requireOK(q.changes && q.changes.length > 0, "Empty changes");
            // Validate the complete request before mutating anything.
            for (i = 0; i < q.changes.length; i++) {
                p = q.changes[i]; item = slots[p.name];
                requireOK(item !== undefined, "Unknown slot: " + p.name);
                for (name in p) if (p.hasOwnProperty(name))
                    requireOK(name === "name" || name === "text" || name === "size" ||
                        name === "color" || name === "xy", "Unknown change field: " + name);
                requireOK(p.text === undefined || typeof p.text === "string", "Invalid text");
                requireOK(p.text === undefined || copyText(p.text) === copyText(q.expectedCopy[p.name]),
                    "Verbatim copy violation: " + p.name);
                requireOK(p.size === undefined || (finite(p.size) && p.size >= rules[p.name].min &&
                    p.size <= rules[p.name].max), "Font size outside policy");
                if (p.color !== undefined) {
                    requireOK(p.color instanceof Array && p.color.length === 3, "RGB array required");
                    for (j=0;j<3;j++) requireOK(finite(p.color[j]) && p.color[j]>=0 && p.color[j]<=255, "Bad RGB");
                }
                if (p.xy !== undefined) requireOK(p.xy instanceof Array && p.xy.length === 2 &&
                    finite(p.xy[0]) && finite(p.xy[1]), "Invalid xy");
            }
            for (i = 0; i < q.changes.length; i++) {
                p = q.changes[i]; item = slots[p.name]; mutated = true;
                if (p.text !== undefined) item.contents = p.text.replace(/\r\n|\n/g, "\r");
                var attrs = item.textRange.characterAttributes;
                if (p.size !== undefined || p.text !== undefined) {
                    // Fit from a deliberate maximum, never below the approved minimum.
                    var s = p.size === undefined ? rules[p.name].max : p.size;
                    for (;;) {
                        attrs.size = s; attrs.autoLeading = false; attrs.leading = s * 1.05;
                        app.redraw();
                        var b = bounds(item, ab);
                        if (b[2] <= rules[p.name].box[2] && b[3] <= rules[p.name].box[3]) break;
                        requireOK(s > rules[p.name].min, "Verbatim copy needs another layout/template: " + p.name);
                        s = Math.max(rules[p.name].min, s - 2);
                    }
                }
                if (p.color !== undefined) {
                    var color = new RGBColor();
                    color.red=p.color[0]; color.green=p.color[1]; color.blue=p.color[2]; attrs.fillColor=color;
                }
                if (p.xy !== undefined || p.text !== undefined || p.size !== undefined) {
                    var xy = p.xy === undefined ? rules[p.name].box : p.xy;
                    var current = bounds(item, ab);
                    item.translate(xy[0]-current[0], current[1]-xy[1]);
                }
            }
        }
        app.redraw();
        var errors = [], metrics = {}, names = [];
        for (name in slots) if (slots.hasOwnProperty(name)) {
            item = slots[name]; var box = bounds(item, ab), smallest = Infinity, largest = 0;
            if (!item.contents.replace(/\s/g,"")) errors.push(name + ": empty text");
            if (copyText(item.contents) !== copyText(q.expectedCopy[name])) errors.push(name + ": verbatim copy mismatch");
            for (i=0;i<item.characters.length;i++) {
                var characterAttrs=item.characters[i].characterAttributes;
                var size = characterAttrs.size;
                if (characterAttrs.textFont.name !== rules[name].font) errors.push(name + ": substituted/unapproved font");
                if (characterAttrs.fillColor.typename !== "RGBColor") errors.push(name + ": non-RGB text fill");
                if (characterAttrs.overprintFill) errors.push(name + ": overprint fill enabled");
                smallest=Math.min(smallest,size); largest=Math.max(largest,size);
            }
            if (smallest === Infinity) smallest=0;
            if (smallest < rules[name].min || largest > rules[name].max) errors.push(name + ": size outside policy");
            if (!inside(box, rules[name].box) || !inside(box,q.policy.safe)) errors.push(name + ": outside slot/safe area");
            metrics[name]={bounds:box,minSize:smallest,maxSize:largest}; names.push(name);
        }
        for (i=0;i<names.length;i++) for (j=i+1;j<names.length;j++) {
            var a=metrics[names[i]].bounds, b2=metrics[names[j]].bounds;
            if (Math.min(a[0]+a[2],b2[0]+b2[2]) > Math.max(a[0],b2[0])+0.5 &&
                Math.min(a[1]+a[3],b2[1]+b2[3]) > Math.max(a[1],b2[1])+0.5)
                errors.push("Text collision: " + names[i] + "/" + names[j]);
        }
        if (metrics.HEADLINE && metrics.BODY && metrics.HEADLINE.minSize < metrics.BODY.maxSize*1.8)
            errors.push("Headline/body hierarchy below 1.8");
        if (q.op === "preview") {
            requireOK(errors.length === 0, "Export blocked: " + errors.join("; "));
            requireOK(q.output && !File(q.output).exists, "Preview path exists or is missing");
            var priorAB=doc.artboards.getActiveArtboardIndex();
            try {
                doc.artboards.setActiveArtboardIndex(q.artboard);
                var options=new ExportOptionsPNG24();
                options.artBoardClipping=true; options.horizontalScale=100; options.verticalScale=100;
                options.transparency=false; options.antiAliasing=true;
                doc.exportFile(File(q.output),ExportType.PNG24,options);
            } finally { doc.artboards.setActiveArtboardIndex(priorAB); }
        }
        return encode({ok:errors.length===0,document:doc.fullName.fsName,width:width,height:height,
            mutated:mutated,errors:errors,slots:metrics,controlledSlotState:slotState(slots,ab),
            visualReviewRequired:true});
    } catch (e) {
        return encode({ok:false,error:String(e),mutated:mutated,
            recovery:mutated ? "Partial edits may remain; inspect before retrying. No save was performed." : "No content edits performed."});
    }
})();
