// setup_carousel_starting_point.jsx
// Clean Design Starting Point Template — Adobe Illustrator ExtendScript
// Rules:
// 1. Clips every full-bleed proportionally scaled image to its 1080x1350 artboard rect so images never overlap.
// 2. Uses the brief heading strictly as the saved .ai file name (not placed as text on Artboard 1).
// 3. Divides each slide's copy into Sub-Font (Inter-Regular, 28pt) and Main Font (PlayfairDisplay-Bold, 46pt) after the full stop with zero repetition.
// 4. Keeps SUB_FONT_SIZE (28pt) and MAIN_FONT_SIZE (46pt) consistent across all 6 slides.
// 5. Uses White (#FFFFFF) text over full-bleed photo slides and Black (#000000) text on plain white artboards for immediate visibility.

#target illustrator

(function main() {
    var W = 1080;
    var H = 1350;
    var GAP = 100;
    var NUM_SLIDES = 6;
    var FILE_TITLE = "SHINE A LIGHT - World Children's Day (Nov 20)";

    var SUB_FONT_SIZE   = 28;
    var SUB_LEADING     = 38;
    var MAIN_FONT_SIZE  = 46;
    var MAIN_LEADING    = 58;

    for (var d = app.documents.length - 1; d >= 0; d--) {
        var dName = app.documents[d].name;
        if (dName.indexOf("Shine_A_Light") !== -1 || dName.indexOf("SHINE A LIGHT") !== -1 || dName.indexOf("Untitled") !== -1) {
            app.documents[d].close(SaveOptions.DONOTSAVECHANGES);
        }
    }

    var colBlack = new RGBColor();
    colBlack.red = 0; colBlack.green = 0; colBlack.blue = 0;

    var colWhite = new RGBColor();
    colWhite.red = 255; colWhite.green = 255; colWhite.blue = 255;

    var fontSub  = app.textFonts.getByName("Inter-Regular");
    var fontMain = app.textFonts.getByName("PlayfairDisplay-Bold");

    var downloadsDir = Folder("~").fsName + "/Downloads";
    var desktopDir   = Folder("~").fsName + "/Desktop";

    var slides = [
        {
            name: "Slide_1_Hook",
            image: downloadsDir + "/image-12.jpg",
            part1: "Behind your eyeshadow, your lipstick, your toothpaste, your phone —",
            part2: "some of it was mined by kids as young as five."
        },
        {
            name: "Slide_2",
            image: null,
            part1: "In Jharkhand, India, I rode on the back of a dirt bike down jungle roads barely passable by car,",
            part2: "to reach a desolate rocky moonscape pockmarked by dozens of open pits."
        },
        {
            name: "Slide_3",
            image: downloadsDir + "/image-11.jpg",
            part1: "Whole families work there. Buckets, plastic sifters, primitive picks.",
            part2: "Some kids barefoot. None with gloves or masks."
        },
        {
            name: "Slide_4",
            image: downloadsDir + "/image-10.jpg",
            part1: "The children made me think of my own kids with their buckets and spades at the beach, having fun.",
            part2: "These kids weren't playing. There's no joy here."
        },
        {
            name: "Slide_5",
            image: null,
            part1: "A Thomson Reuters Foundation report found that in Jharkhand, on average, ten kids die each month in these mines.",
            part2: "Less than 10% of those deaths are ever reported."
        },
        {
            name: "Slide_6_CTA",
            image: downloadsDir + "/image-13.jpg",
            part1: "What struck me most was how ordinary it all seemed.",
            part2: "I just wish it weren't."
        }
    ];

    var doc = app.documents.add(DocumentColorSpace.RGB, W, H, NUM_SLIDES, DocumentArtboardLayout.Row, GAP, NUM_SLIDES);

    var layerImages = doc.layers[0];
    layerImages.name = "Images";

    var layerText = doc.layers.add();
    layerText.name = "Text";

    for (var i = 0; i < NUM_SLIDES; i++) {
        var s = slides[i];
        var ab = doc.artboards[i];
        ab.name = s.name;

        var rect = ab.artboardRect;
        var abLeft = rect[0];
        var abTop  = rect[1];

        if (s.image) {
            var imgFile = new File(s.image);
            if (imgFile.exists) {
                var clipGroup = layerImages.groupItems.add();
                clipGroup.name = s.name + "_ClippedImage";

                var pItem = clipGroup.placedItems.add();
                pItem.file = imgFile;
                pItem.name = s.name + "_Photo";

                var origW = pItem.width;
                var origH = pItem.height;
                var scale = Math.max(W / origW, H / origH);
                var newW = origW * scale;
                var newH = origH * scale;

                pItem.width  = newW;
                pItem.height = newH;
                pItem.left   = abLeft + (W - newW) / 2;
                pItem.top    = abTop - (H - newH) / 2;

                var clipMask = clipGroup.pathItems.rectangle(abTop, abLeft, W, H);
                clipMask.filled = false;
                clipMask.stroked = false;
                clipMask.clipping = true;
                clipGroup.clipped = true;
            }
        }

        var textColor = s.image ? colWhite : colBlack;

        var part1Top = s.image ? (abTop - 830) : (abTop - 420);
        var part1H   = 150;
        var path1 = layerText.pathItems.rectangle(part1Top, abLeft + 80, W - 160, part1H);
        var tf1 = layerText.textFrames.areaText(path1);
        tf1.name = s.name + "_SubText";
        tf1.contents = s.part1;

        var ca1 = tf1.textRange.characterAttributes;
        ca1.textFont = fontSub;
        ca1.size = SUB_FONT_SIZE;
        ca1.autoLeading = false;
        ca1.leading = SUB_LEADING;
        ca1.fillColor = textColor;

        var part2Top = part1Top - 165;
        var part2H   = 260;
        var path2 = layerText.pathItems.rectangle(part2Top, abLeft + 80, W - 160, part2H);
        var tf2 = layerText.textFrames.areaText(path2);
        tf2.name = s.name + "_MainHighlight";
        tf2.contents = s.part2;

        var ca2 = tf2.textRange.characterAttributes;
        ca2.textFont = fontMain;
        ca2.size = MAIN_FONT_SIZE;
        ca2.autoLeading = false;
        ca2.leading = MAIN_LEADING;
        ca2.fillColor = textColor;
    }

    var saveFile = new File(desktopDir + "/" + FILE_TITLE + ".ai");
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = true;
    doc.saveAs(saveFile, saveOpts);
})();
