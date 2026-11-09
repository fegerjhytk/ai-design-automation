/* Run inside an installed Photoshop UXP plugin, NOT Node or Illustrator.
 * Supply an Image Size descriptor recorded from the exact supported PS build
 * with Preserve Details 2.0 selected. Keep it versioned as a build fixture.
 */
const { app, core, action } = require("photoshop");

async function resizeWithRecordedPD2(documentId, widthPx, recordedDescriptor) {
    if (!Number.isInteger(widthPx) || widthPx <= 0) throw Error("Invalid pixel width");
    if (!recordedDescriptor || recordedDescriptor._obj !== "imageSize") {
        throw Error("Record Image Size with Preserve Details 2.0 on this Photoshop build first");
    }
    return core.executeAsModal(async () => {
        const doc = Array.from(app.documents).find(d => d.id === documentId);
        if (!doc) throw Error("Target document closed");
        const before = { width: doc.width, height: doc.height };
        if (widthPx <= before.width) throw Error("Upscale helper only; use a separate downsample step");
        const expectedHeight = Math.round(before.height * widthPx / before.width);
        const descriptor = JSON.parse(JSON.stringify(recordedDescriptor));
        // Retain the recorded interpolation/noise settings; replace size fields only.
        delete descriptor._target;
        delete descriptor.resolution;
        delete descriptor.scale;
        descriptor.width = { _unit: "pixelsUnit", _value: widthPx };
        descriptor.height = { _unit: "pixelsUnit", _value: expectedHeight };
        descriptor.constrainProportions = true;
        descriptor._options = { dialogOptions: "dontDisplay" };
        const selected = await action.batchPlay([{
            _obj: "select", _target: [{ _ref: "document", _id: documentId }],
            _options: { dialogOptions: "dontDisplay" }
        }], {});
        if (selected.some(r => r._obj === "error")) throw Error(JSON.stringify(selected));
        const result = await action.batchPlay([descriptor], {});
        if (result.some(r => r._obj === "error")) throw Error(JSON.stringify(result));
        if (Math.abs(doc.width-widthPx)>1 || Math.abs(doc.height-expectedHeight)>1) {
            throw Error("Unexpected output size; inspect document before retrying");
        }
        return {documentId, width: doc.width, height: doc.height};
    }, { commandName: "Preprocess image: Preserve Details 2.0" });
}
module.exports = { resizeWithRecordedPD2 };
