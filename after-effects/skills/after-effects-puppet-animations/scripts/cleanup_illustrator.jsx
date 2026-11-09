// ExtendScript for Adobe Illustrator (ES3)
// Safely closes the prepared artwork document ONLY when After Effects
// has completed and there are no other user documents open.
function cleanupIllustratorDoc(preparedPath) {
    var prepFile = new File(preparedPath);
    // User Rule: "close the Illustrator file if there are no other files open"
    if (app.documents.length <= 1) {
        for (var i = 0; i < app.documents.length; i++) {
            var doc = app.documents[i];
            var full = null;
            try { full = doc.fullName; } catch (e) {}
            if (full && full.fsName === prepFile.fsName) {
                doc.close(SaveOptions.DONOTSAVECHANGES);
                return { closed: true, message: "AE finished: closed prepared file as no other documents were open." };
            }
        }
    }
    return { closed: false, message: "Other documents open or already closed; preserved user workspace." };
}
