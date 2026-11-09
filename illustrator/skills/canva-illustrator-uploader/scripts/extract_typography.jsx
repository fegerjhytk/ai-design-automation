/**
 * extract_typography.jsx
 * Extracts full typography metrics from all text frames in the active Illustrator document.
 */
#target illustrator

function extractTypography() {
    if (app.documents.length === 0) return "ERROR: No active document";
    var doc = app.activeDocument;
    var list = [];

    for (var i = 0; i < doc.textFrames.length; i++) {
        var tf = doc.textFrames[i];
        try {
            var ca = tf.textRange.characterAttributes;
            var fontName = "Unknown";
            try { fontName = ca.textFont.name; } catch(e) {}
            var fontSize = 0;
            try { fontSize = ca.size; } catch(e) {}
            var tracking = 0;
            try { tracking = ca.tracking; } catch(e) {}
            var leading = 0;
            try { leading = ca.leading; } catch(e) {}

            var bounds = [];
            try {
                bounds = [tf.visibleBounds[0], tf.visibleBounds[1], tf.visibleBounds[2], tf.visibleBounds[3]];
            } catch(e) {
                bounds = [tf.geometricBounds[0], tf.geometricBounds[1], tf.geometricBounds[2], tf.geometricBounds[3]];
            }

            // Clean contents of newlines and quotes
            var rawContent = tf.contents;
            var cleanContent = rawContent.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\r/g, "\\n").replace(/\n/g, "\\n");

            var item = "{" +
                "\"index\":" + i + "," +
                "\"contents\":\"" + cleanContent + "\"," +
                "\"fontName\":\"" + fontName + "\"," +
                "\"fontSize\":" + fontSize + "," +
                "\"tracking\":" + tracking + "," +
                "\"leading\":" + leading + "," +
                "\"bounds\":[" + bounds.join(",") + "]" +
            "}";

            list.push(item);
        } catch(err) {
            // Skip non-standard text frames
        }
    }

    return "[" + list.join(",") + "]";
}

extractTypography();
