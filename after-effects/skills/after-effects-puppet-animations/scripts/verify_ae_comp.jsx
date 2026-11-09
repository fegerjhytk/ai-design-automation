#include "vendor/json2.js"
#include "puppet_core.jsx"

function verifyComp(reportOutputPath, comp, holdStart) {
    Puppet.assert(comp instanceof CompItem, "Verifier requires the exact target CompItem");
    var report = Puppet.audit(comp, holdStart);
    if (reportOutputPath) Puppet.write(reportOutputPath, report);
    Puppet.assert(!report.violations.length, "Verification failed: " + report.violations.join("; "));
    return report;
}
