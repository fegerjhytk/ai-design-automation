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

  const words = text.split(/\s+/).filter(Boolean);
  const beatInterval = 60 / bpm;
  const timePerWord = durationSeconds / words.length;

  const timelineKeyframes = words.map((word, index) => {
    const startTime = (index * timePerWord).toFixed(3);
    const endTime = ((index + 1) * timePerWord).toFixed(3);
    const beatIndex = Math.floor(parseFloat(startTime) / beatInterval);

    return {
      index: index,
      word: word,
      start_time_s: parseFloat(startTime),
      end_time_s: parseFloat(endTime),
      beat_marker: beatIndex,
      gsap_tween: {
        from: { opacity: 0, y: 35, scale: 0.94, filter: "blur(8px)" },
        to: { opacity: 1, y: 0, scale: 1.0, filter: "blur(0px)", duration: (timePerWord * 0.8).toFixed(3), ease: easing }
      }
    };
  });

  return {
    style: style,
    total_words: words.length,
    duration_s: durationSeconds,
    bpm: bpm,
    recommended_framerate: 50, // Harmonic 50 FPS for butter-smooth GIF/video
    gsap_timeline_schedule: timelineKeyframes,
    hyperframes_code_snippet: `
// GSAP Kinetic Motion Sequence for HyperFrames
const tl = gsap.timeline({ defaults: { ease: "${easing}" } });
${timelineKeyframes.map(kf => `tl.fromTo("#word-${kf.index}", ${JSON.stringify(kf.gsap_tween.from)}, ${JSON.stringify(kf.gsap_tween.to)}, ${kf.start_time_s});`).join("\n")}
`
  };
}
