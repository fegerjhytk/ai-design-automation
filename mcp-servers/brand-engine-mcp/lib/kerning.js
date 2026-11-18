/**
 * Typographic Kerning & Tracking Auditor
 * Detects optical gap traps and returns calibrated tracking offsets for Illustrator.
 */

const TRAP_PAIRS = {
  "RA": { severity: "high", reason: "Diagonal leg of R pushes into open left counter of A, leaving excess negative space.", suggested_tracking_delta: -25 },
  "AV": { severity: "critical", reason: "Opposing diagonal strokes create an optical chasm.", suggested_tracking_delta: -35 },
  "VA": { severity: "critical", reason: "Opposing diagonal strokes create an optical chasm.", suggested_tracking_delta: -35 },
  "TO": { severity: "high", reason: "T crossbar leaves empty void above rounded O bowl.", suggested_tracking_delta: -30 },
  "LT": { severity: "high", reason: "L baseline leaves void beneath T crossbar.", suggested_tracking_delta: -20 },
  "WA": { severity: "high", reason: "Interlocking diagonal ascenders require negative tracking.", suggested_tracking_delta: -25 },
  "YO": { severity: "medium", reason: "Y diagonal arm leaves void above O.", suggested_tracking_delta: -20 },
  "FA": { severity: "medium", reason: "F crossbar overhangs open A apex.", suggested_tracking_delta: -20 },
  "PA": { severity: "medium", reason: "P closed bowl hangs over open A counter.", suggested_tracking_delta: -15 }
};

export function auditTypographicKerning(wordmark, fontName = "Display-Serif") {
  const upper = wordmark.toUpperCase().trim();
  const findings = [];
  let cumulativeRecommendedTracking = -15; // default optical pull for display titles

  for (let i = 0; i < upper.length - 1; i++) {
    const pair = upper.substring(i, i + 2);
    if (TRAP_PAIRS[pair]) {
      const trap = TRAP_PAIRS[pair];
      findings.push({
        position: i,
        pair: pair,
        severity: trap.severity,
        reason: trap.reason,
        tracking_delta: trap.suggested_tracking_delta
      });
      cumulativeRecommendedTracking = Math.min(cumulativeRecommendedTracking, trap.suggested_tracking_delta);
    }
  }

  return {
    wordmark: wordmark,
    font_name: fontName,
    character_count: wordmark.length,
    traps_detected: findings.length,
    findings: findings,
    recommended_global_tracking: cumulativeRecommendedTracking,
    extendscript_snippet: `// Apply optical tracking in Adobe Illustrator\nselectedTextFrame.textRange.characterAttributes.tracking = ${cumulativeRecommendedTracking};\n`
  };
}
