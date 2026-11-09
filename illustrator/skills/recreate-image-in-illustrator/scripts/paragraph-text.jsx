/* Include in an Illustrator ExtendScript. Dimensions are artboard-relative pt.
   spec: {id,text,x,y,width,height,font,size,leading,tracking?,rgb?,align?,artboard?}
   Creates one fixed-size editable paragraph frame; no autofit or copy mutation. */
function makeParagraph(doc, layer, spec) {
    if (!spec.id || typeof spec.text !== "string") throw Error("Missing paragraph ID or exact text");
    if (!(spec.width > 0 && spec.height > 0 && spec.size > 0 && spec.leading > 0))
        throw Error("Invalid paragraph dimensions or typography: " + spec.id);
    var font = app.textFonts.getByName(spec.font);
    var ab = doc.artboards[spec.artboard === undefined ? 0 : spec.artboard].artboardRect;
    var box = layer.pathItems.rectangle(ab[1] - spec.y, ab[0] + spec.x, spec.width, spec.height);
    box.stroked = false;
    box.filled = false;
    var frame = layer.textFrames.areaText(box);
    frame.name = spec.id;
    frame.contents = spec.text.replace(/\r\n|\n/g, "\r");
    var ca = frame.textRange.characterAttributes;
    ca.textFont = font;
    ca.size = spec.size;
    ca.autoLeading = false;
    ca.leading = spec.leading;
    ca.tracking = spec.tracking === undefined ? 0 : spec.tracking;
    var rgb = spec.rgb || [0, 0, 0];
    var color = new RGBColor();
    color.red = rgb[0]; color.green = rgb[1]; color.blue = rgb[2];
    ca.fillColor = color;
    var pa = frame.textRange.paragraphAttributes;
    pa.justification = spec.align === "center" ? Justification.CENTER :
        spec.align === "right" ? Justification.RIGHT : Justification.LEFT;
    pa.hyphenation = false;
    pa.spaceBefore = 0;
    pa.spaceAfter = 0;
    frame.note = "Reference paragraph: " + spec.id + "; fixed box " + spec.width + " x " + spec.height + " pt";
    return frame;
}

function verifyParagraph(frame, spec) {
    function normalized(s) { return s.replace(/\r\n|\r/g, "\n"); }
    var errors = [];
    if (frame.kind !== TextType.AREATEXT) errors.push("not area text");
    if (normalized(frame.contents) !== normalized(spec.text)) errors.push("copy differs");
    if (Math.abs(frame.textPath.width - spec.width) > 0.1 ||
        Math.abs(frame.textPath.height - spec.height) > 0.1) errors.push("box dimensions differ");
    return errors;
}
