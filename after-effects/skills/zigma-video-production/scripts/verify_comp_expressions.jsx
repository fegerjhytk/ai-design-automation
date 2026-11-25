// Verify All Expressions in Active Composition
// Scans every layer and property for expression errors

(function() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        for (var i = 1; i <= app.project.items.length; i++) {
            if (app.project.items[i] instanceof CompItem && app.project.items[i].name.indexOf("Promo_9-16") !== -1) {
                comp = app.project.items[i];
                break;
            }
        }
    }

    if (!comp) {
        alert("Please select or open the commercial composition.");
        return;
    }

    var errors = [];
    var activeExpressions = 0;

    function checkProperty(prop, layerName, propPath) {
        if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.canSetExpression && prop.expression !== "") {
                activeExpressions++;
                if (prop.expressionError !== "") {
                    errors.push(layerName + " -> " + propPath + ": " + prop.expressionError);
                }
            }
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
            for (var p = 1; p <= prop.numProperties; p++) {
                checkProperty(prop.property(p), layerName, propPath + "/" + prop.property(p).name);
            }
        }
    }

    for (var j = 1; j <= comp.numLayers; j++) {
        var l = comp.layer(j);
        for (var k = 1; k <= l.numProperties; k++) {
            checkProperty(l.property(k), "#" + j + " [" + l.name + "]", l.property(k).name);
        }
    }

    var msg = "Comp: " + comp.name + "\nTotal Active Expressions: " + activeExpressions + "\n";
    if (errors.length > 0) {
        msg += "ERRORS FOUND (" + errors.length + "):\n" + errors.join("\n");
    } else {
        msg += "STATUS: PERFECT! All expressions evaluated with 0 errors.";
    }

    alert(msg);
})();
