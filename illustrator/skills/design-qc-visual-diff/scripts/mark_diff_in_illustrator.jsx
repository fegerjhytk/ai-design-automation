// In-Canvas Illustrator Visual Diff Marker Tool
// Draws non-printing highlight boxes and callout pins over changed/flagged elements
#target illustrator
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

function markDiffsOnCanvas(markerDataList) {
    if (app.documents.length === 0) return "No active document.";
    var doc = app.activeDocument;
    
    // Check if layer already exists; remove old layer to refresh
    var layerName = "[QC_DIFF_MARKERS]";
    try {
        var oldLayer = doc.layers.getByName(layerName);
        oldLayer.remove();
    } catch(e) {}

    // Create fresh non-printing marker layer
    var markerLayer = doc.layers.add();
    markerLayer.name = layerName;
    markerLayer.printable = false; // NEVER prints or exports to PDF!
    
    // Color definitions
    var redStroke = new RGBColor();
    redStroke.red = 255; redStroke.green = 30; redStroke.blue = 80;

    var redFill = new RGBColor();
    redFill.red = 255; redFill.green = 30; redFill.blue = 80;

    var whiteColor = new RGBColor();
    whiteColor.red = 255; whiteColor.green = 255; whiteColor.blue = 255;

    var count = 0;
    for (var i = 0; i < markerDataList.length; i++) {
        var m = markerDataList[i];
        var bounds = m.bounds; // [left, top, right, bottom]
        if (!bounds || bounds.length !== 4) continue;

        var l = bounds[0] - 6;
        var t = bounds[1] + 6;
        var r = bounds[2] + 6;
        var b = bounds[3] - 6;
        var w = r - l;
        var h = t - b;

        // 1. Draw Red Outline Frame
        var rect = markerLayer.pathItems.rectangle(t, l, w, h);
        rect.filled = false;
        rect.stroked = true;
        rect.strokeColor = redStroke;
        rect.strokeWidth = 3;

        // 2. Draw Numbered Badge Pin
        var pinRadius = 12;
        var pinX = l + pinRadius;
        var pinY = t + pinRadius;
        var pin = markerLayer.pathItems.ellipse(pinY, pinX - pinRadius, pinRadius * 2, pinRadius * 2);
        pin.filled = true;
        pin.fillColor = redFill;
        pin.stroked = true;
        pin.strokeColor = whiteColor;
        pin.strokeWidth = 1.5;

        // 3. Pin Label
        var label = markerLayer.textFrames.pointText([pinX - 4, pinY - 16]);
        label.contents = "" + (i + 1);
        label.textRanges[0].characterAttributes.size = 11;
        label.textRanges[0].characterAttributes.fillColor = whiteColor;

        count++;
    }

    return "Created [QC_DIFF_MARKERS] with " + count + " annotations.";
}

// Read markers from temp file if available
var f = new File("/tmp/qc_markers_to_draw.json");
var markers = [];
if (f.exists) {
    f.open("r");
    var str = f.read();
    f.close();
    try {
        markers = eval("(" + str + ")");
    } catch(e) {}
}

markDiffsOnCanvas(markers);
