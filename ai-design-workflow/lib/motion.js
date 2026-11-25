/**
 * Kinetic Motion & Audio-Sync Timeline Engine
 * Calculates word-level cadence, GSAP keyframe schedules, and easing curves for HyperFrames/After Effects.
 */

export function generateMotionSyncTimeline(options) {
  const {
    text = "HOW TO DESIGN A BRAND THAT DOES NOT SUCK",
    bpm = 120,
    durationSeconds = 6.0,
    style = "kinetic_typography",
    easing = "power3.out"
  } = options;

  if (typeof text !== "string") throw new Error("text must be a string.");
  const words = text.split(/\s+/).filter(Boolean);
  const frameRate = 50;
  const beatInterval = 60 / bpm;
  const totalFrames = Math.floor(durationSeconds * frameRate + 1e-9);
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(beatInterval) || beatInterval === 0) {
    throw new Error("bpm must be a finite positive number.");
  }
  if (!Number.isFinite(durationSeconds) || !Number.isSafeInteger(totalFrames) || totalFrames < words.length) {
    throw new Error("duration_seconds must allow at least one frame per word.");
  }
  if (words.length === 0) throw new Error("text must include at least one word.");
  if (typeof easing !== "string" || !easing.trim()) throw new Error("easing must be a nonempty string.");

  const actualDuration = totalFrames / frameRate;
  const timePerWord = actualDuration / words.length;
  const subdivision = 2 ** Math.max(0, Math.ceil(Math.log2(beatInterval) - Math.log2(timePerWord)));
  const gridInterval = beatInterval / subdivision;
  if (gridInterval < Number.MIN_VALUE || !Number.isFinite(actualDuration / gridInterval)) {
    throw new Error("bpm and duration_seconds exceed the supported timing range.");
  }
  const gridSteps = words.map((_, index) => Math.round(index * timePerWord / gridInterval));
  const startFrames = [];
  for (const [index, step] of gridSteps.entries()) {
    const preferredFrame = Math.round(step * gridInterval * frameRate);
    const earliestFrame = index === 0 ? 0 : startFrames[index - 1] + 1;
    const latestFrame = totalFrames - (words.length - index);
    startFrames.push(Math.min(latestFrame, Math.max(earliestFrame, preferredFrame)));
  }

  const timelineKeyframes = words.map((word, index) => {
    const startTime = startFrames[index] / frameRate;
    const endTime = (startFrames[index + 1] ?? totalFrames) / frameRate;
    const tweenFrames = Math.max(1, Math.floor((endTime - startTime) * frameRate * 0.8));

    return {
      index: index,
      word: word,
      start_time_s: startTime,
      end_time_s: endTime,
      beat_marker: Math.floor(gridSteps[index] / subdivision),
      gsap_tween: {
        from: { opacity: 0, y: 35, scale: 0.94, filter: "blur(8px)" },
        to: { opacity: 1, y: 0, scale: 1.0, filter: "blur(0px)", duration: tweenFrames / frameRate, ease: easing }
      }
    };
  });

  return {
    style: style,
    total_words: words.length,
    duration_s: actualDuration,
    bpm: bpm,
    recommended_framerate: frameRate,
    beat_subdivision: subdivision,
    gsap_timeline_schedule: timelineKeyframes,
    after_effects_jsx: buildAfterEffectsScript(timelineKeyframes, actualDuration, frameRate),
    hyperframes_code_snippet: `
// GSAP Kinetic Motion Sequence for HyperFrames
const tl = gsap.timeline({ defaults: { ease: ${JSON.stringify(easing)} } });
${timelineKeyframes.map(kf => `tl.fromTo("#word-${kf.index}", ${JSON.stringify(kf.gsap_tween.from)}, ${JSON.stringify(kf.gsap_tween.to)}, ${kf.start_time_s});`).join("\n")}
`
  };
}

function buildAfterEffectsScript(keyframes, duration, frameRate) {
  const words = keyframes.map(frame => [
    frame.word, frame.start_time_s, frame.end_time_s, frame.gsap_tween.to.duration
  ]);
  const scriptData = JSON.stringify(words)
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  return `#target aftereffects
(function () {
    var words = ${scriptData};
    app.beginUndoGroup("Build Brand Motion");
    try {
        var comp = app.project.items.addComp("Brand Motion", 1920, 1080, 1, ${duration}, ${frameRate});
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            var layer = comp.layers.addText(word[0]);
            var source = layer.property("ADBE Text Properties").property("ADBE Text Document");
            var style = source.value;
            style.fontSize = 140;
            style.justification = ParagraphJustification.CENTER_JUSTIFY;
            style.applyFill = true;
            style.fillColor = [1, 1, 1];
            source.setValue(style);
            layer.inPoint = word[1];
            layer.outPoint = word[2];
            var bounds = layer.sourceRectAtTime(word[1], false);
            var transform = layer.property("ADBE Transform Group");
            transform.property("ADBE Anchor Point").setValue([
                bounds.left + bounds.width / 2, bounds.top + bounds.height / 2
            ]);
            var transitionEnd = Math.min(word[1] + word[3], word[2] - 0.5 / ${frameRate});
            var position = transform.property("ADBE Position");
            var opacity = transform.property("ADBE Opacity");
            if (word[2] - word[1] > 1.5 / ${frameRate}) {
                position.setValueAtTime(word[1], [960, 575]);
                position.setValueAtTime(transitionEnd, [960, 540]);
                opacity.setValueAtTime(word[1], 0);
                opacity.setValueAtTime(transitionEnd, 100);
            } else {
                position.setValue([960, 540]);
            }
        }
    } finally {
        app.endUndoGroup();
    }
}());`;
}
