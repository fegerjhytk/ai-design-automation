// ES3, shared by Node regression tests and After Effects.
var ReadingFlow = (function () {
    function assert(ok, message) { if (!ok) throw new Error(message); }
    function finite(n) { return typeof n === 'number' && isFinite(n); }
    function rank(unit, flow) {
        var n = unit.name.toLowerCase(), x = unit.cx, y = unit.cy;
        if (unit.stage !== undefined) return unit.stage;
        if (flow === 'top-bottom') return 0;
        if (flow === 'left-right') return 0;
        // Geometry wins over misleading old Left_/Bottom_ names.
        if (y >= 0.80) return /ribbon|banner/.test(n) || unit.width > 0.75 ? 5 : 6;
        if (x < 0.45) return /^(?:left_)?(?:logo|christmas|day|title|heading)(?:_|$)/.test(n) || y < 0.28 ? 0 : 1;
        if (/container|frame/.test(n) || (unit.width > 0.30 && unit.height > 0.30)) return 2;
        if (/price|card|flap|\d+_a_head/.test(n)) return 4;
        return 3;
    }
    function plan(units, duration, fps, options) {
        options = options || {};
        assert(finite(duration) && duration > 0 && finite(fps) && fps >= 1 && fps <= 99, 'Invalid duration/FPS');
        var frames = Math.round(duration * fps);
        assert(frames >= 6, 'Duration needs at least six frames');
        // User durations map to the nearest representable frame, never to a fixed 4/5 seconds.
        duration = frames / fps;
        var holdSeconds = options.holdSeconds === undefined ? Math.min(1, duration * 0.1) : options.holdSeconds;
        assert(finite(holdSeconds) && holdSeconds >= 0 && holdSeconds < duration, 'Invalid hold');
        var holdFrames = Math.max(1, Math.ceil(holdSeconds * fps));
        var holdStart = (frames - holdFrames) / fps;
        var end = holdStart - 1 / fps; // fixed 180/-90 shutter sampling margin
        assert(end >= 2 / fps, 'Hold leaves too little motion time');
        var seen = {}, ordered = [], ambient = [], totalLeaves = 0;
        for (var i = 0; i < units.length; i++) {
            var u = units[i], key = '$' + u.name;
            assert(!seen[key], 'Duplicate animation unit: ' + u.name); seen[key] = true;
            assert(finite(u.cx) && finite(u.cy), 'Missing artwork coordinates');
            totalLeaves += u.leaves || 1;
            if (u.background === true) ambient.push(u);
            else ordered.push({unit:u, stage:rank(u, options.flow), order:i});
        }
        ordered.sort(function (a,b) {
            var delta = a.stage - b.stage;
            if (delta) return delta;
            if (a.stage===0) {
                var al=/logo/i.test(a.unit.name),bl=/logo/i.test(b.unit.name);
                if(al!==bl)return al?-1:1;
            }
            if (options.flow === 'left-right' || a.stage === 4)
                return a.unit.cx - b.unit.cx || a.unit.cy - b.unit.cy || a.order - b.order;
            if (a.stage===6) {
                var column=Math.round(a.unit.cx/0.25)-Math.round(b.unit.cx/0.25);
                return column || a.unit.cy-b.unit.cy || a.order-b.order;
            }
            var row=Math.round(a.unit.cy/0.06)-Math.round(b.unit.cy/0.06);
            return row || a.unit.cx - b.unit.cx || a.unit.cy - b.unit.cy || a.order - b.order;
        });
        var start = Math.min(0.12, end * 0.025), beats = [];
        var entrance = Math.min(0.75, (end-start) / Math.max(ordered.length,1) * 1.15);
        for (var i = 0; i < ordered.length; i++) {
            var begin = ordered.length === 1 ? Math.max(0,end-entrance) : start + i * (end - entrance - start) / (ordered.length - 1);
            beats.push({name:ordered[i].unit.name, stage:ordered[i].stage,
                start:begin, end:begin + entrance, protectedAppearance:ordered[i].unit.protectedAppearance === true});
        }
        return {duration:duration, fps:fps, holdStart:holdStart, motionEnd:end, beats:beats,
            ambient:ambient, units:units.length, coveredLeaves:totalLeaves, flow:options.flow || 'columns'};
    }
    return { plan:plan };
}());
if (typeof module !== 'undefined' && module.exports) module.exports = ReadingFlow;
