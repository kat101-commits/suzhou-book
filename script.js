/* 蘇州古典園林 · Classical Gardens of Suzhou — flippable thread-bound book.
   Vanilla JS, no modules (so it also runs from file://).

   Model
   -----
   A "face" is one printed side of a leaf. A "leaf" has a front (seen on the
   right while unturned) and a back (seen on the left once turned). Each leaf
   has an angle: 0° = lying on the right, 180° = lying on the left.
   Leaves at rest are drawn flat (one 2D face). A leaf that is moving is
   rebuilt as a chain of nested vertical strips, each rotated a little more
   than its parent (rotateY), so the page bends with the strongest curl at the
   free edge. Light, cast shadows, the gutter, the stack edges and the book's
   drop shadow are all recomputed from the leaf angles every frame.
*/
(function () {
  'use strict';

  var W = 558, H = 810;               // page size in PDF points (= CSS px in design space)
  var STRIPS = 18;                    // ≥14 vertical strips per turning leaf
  var SW = W / STRIPS;
  var OV = 1.2;                       // strip overlap (px) that hides seams
  var T_CLICK = 1050;                 // full turn, ms (900–1200)
  var EDGE_ZONE = 0.3;                // fraction of the page width that acts as a grab/click edge
  var LAZY = 4;                       // render content only within ±4 leaves of the current spread
  var HOLES = [0.107, 0.388, 0.614, 0.895]; // 四眼裝訂 hole positions, measured from the reference photo
  var STITCH_X = 46;                  // distance of the holes from the spine (≈9% of the width, as in the photo)
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- faces in physical order ----------
     0  cover (PDF p2 left: its photos, fan logo and caption on the cloth cover)
     1  PDF p3 right = page 1, printed on the back of the cover (left-hand page)
     2… PDF p4 left, p4 right … p14 left (22) = page 22, on the front of the last leaf
     23 back cover (the back of that leaf)
     Odd pages fall on the left and even pages on the right, so opening the cover
     shows pages 1–2 and, for example, page 15 faces page 16.
     The blank endpapers, inside covers and the blank pages at the end were removed on request. */
  var HALVES = ['3R'];
  for (var p = 4; p <= 13; p++) { HALVES.push(p + 'L'); HALVES.push(p + 'R'); }
  HALVES.push('14L');

  var FACES = [{ type: 'cover' }];
  HALVES.forEach(function (k) { FACES.push({ type: 'page', key: k }); });
  FACES.push({ type: 'backcover' });
  var NF = FACES.length;                              // 24

  var THREAD_INNER = {};  // no inside covers remain; the thread shows on the covers and the spine

  function pageNumber(f) { return f >= 1 && f <= 22 ? f : null; }
  var LAST_PAGE = 22;
  var FACE_NAMES = { 0: ['封面', 'Cover'], 23: ['封底', 'Back cover'] };

  /* ---------- DOM refs */
  var desk = document.getElementById('desk');
  var scaler = document.getElementById('scaler');
  var bookEl = document.getElementById('book');
  var btnFirst = document.getElementById('first');
  var btnPrev = document.getElementById('prev');
  var btnNext = document.getElementById('next');
  var btnLast = document.getElementById('last');
  var indicator = document.getElementById('indicator');
  var live = document.getElementById('live');

  /* ---------- deterministic per-leaf tone (slight warm variation) */
  function rand(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ---------- thread drawing (twisted two-tone strand + shadow, light from upper left) */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function threadSVG(kind) {
    // kind: 'outer' (cover: full stitching) | 'inner' (holes + wraps over the spine edge)
    var s = '<svg class="thread" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    var X = STITCH_X, ys = HOLES.map(function (h) { return (h * H).toFixed(1); });
    var path = '';
    if (kind === 'outer') {
      // raised margin where the thread pulls the cover tight, and the pressed line next to it
      s += '<rect x="0" y="0" width="' + (X + 4) + '" height="' + H + '" fill="url(#raise)"/>';
      s += '<line x1="' + (X + 6) + '" y1="0" x2="' + (X + 6) + '" y2="' + H + '" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>';
      s += '<line x1="' + (X + 7.4) + '" y1="0" x2="' + (X + 7.4) + '" y2="' + H + '" stroke="rgba(230,220,250,.08)" stroke-width="1"/>';
      path = 'M' + X + ' -4V' + (H + 4);
      ys.forEach(function (y) { path += 'M-4 ' + y + 'H' + X; });
    } else {
      // inside: the paper dimples around each hole; the wrap shows at the very spine edge
      s += '<rect x="0" y="0" width="' + (X + 5) + '" height="' + H + '" fill="url(#raise-paper)"/>';
      ys.forEach(function (y) { path += 'M-4 ' + y + 'H' + (X - 30); });
    }
    s += '<g filter="url(#threadShadow)"><path d="' + path + '" fill="none" stroke="rgba(15,10,6,.55)" stroke-width="3.1" stroke-linecap="round" transform="translate(.9 1.3)"/></g>';
    s += '<path d="' + path + '" fill="none" stroke="url(#twist)" stroke-width="2.7" stroke-linecap="round"/>';
    s += '<path d="' + path + '" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".6" transform="translate(-.45 -.55)"/>';
    ys.forEach(function (y) {
      s += '<ellipse cx="' + X + '" cy="' + y + '" rx="2.6" ry="2.3" fill="' + (kind === 'outer' ? '#0b0910' : '#5c5247') + '"/>';
      if (kind === 'outer') s += '<path d="M' + (X - 1.4) + ' ' + (+y - 1.6) + 'l1.4 3.2" stroke="url(#twist)" stroke-width="2.4"/>';
      else s += '<ellipse cx="' + X + '" cy="' + y + '" rx="4.4" ry="4" fill="none" stroke="rgba(90,70,40,.18)" stroke-width="1.5"/>';
    });
    return s + '</svg>';
  }

  /* ---------- face builder */
  function contentFor(f) {
    var spec = FACES[f];
    if (!spec || spec.type !== 'page' || !spec.key) return null;
    var t = document.getElementById('pg-' + spec.key);
    return t ? t.content.cloneNode(true) : null;
  }

  // spineSide: 'l' when the spine is on the face's left (right-hand pages), 'r' otherwise
  function buildFace(f, spineSide, reverseOf) {
    var spec = FACES[f];
    var el = document.createElement('div');
    if (spec.type === 'cover' || spec.type === 'backcover') {
      el.className = 'face cloth sp-' + spineSide;
      if (spec.type === 'cover') {
        var t = document.getElementById('pg-2L');
        var c0 = document.createElement('div');
        c0.className = 'content cover-layout';
        if (t) c0.appendChild(t.content.cloneNode(true));
        el.appendChild(c0);
      }
      el.insertAdjacentHTML('beforeend', threadSVG('outer'));
      if (spineSide === 'r') el.lastChild.style.transform = 'scaleX(-1)';
      return el;
    }
    el.className = 'face paper sp-' + spineSide + (spec.type === 'inside' ? ' cloth inside' : '');
    var tone = rand(Math.floor(f / 2) + 1);
    el.style.setProperty('--tone', (0.015 + tone * 0.06).toFixed(3));
    el.style.setProperty('--tone-a', Math.round(120 + tone * 120) + 'deg');
    // translucency: ghost of the reverse side
    if (reverseOf != null) {
      var rc = contentFor(reverseOf);
      if (rc) {
        var g = document.createElement('div');
        g.className = 'ghost';
        g.appendChild(rc);
        el.appendChild(g);
      }
    }
    var c = document.createElement('div');
    c.className = 'content';
    var cc = contentFor(f);
    if (cc) c.appendChild(cc);
    el.appendChild(c);
    var gut = document.createElement('div'); gut.className = 'gutter'; el.appendChild(gut);
    var fold = document.createElement('div'); fold.className = 'fold'; el.appendChild(fold);
    if (THREAD_INNER[f]) {
      el.insertAdjacentHTML('beforeend', threadSVG('inner'));
      if (spineSide === 'r') el.lastChild.style.transform = 'scaleX(-1)';
    }
    return el;
  }

  /* ---------- book state */
  var mode = null;           // 'double' | 'single'
  var leaves = [];           // {front, back, angle, el, state, strips, ...}
  var L = 0;                 // number of leaves
  var cur = 0;               // number of leaves (logically) turned to the left
  var tweens = [];
  var drag = null;
  var peel = { leaf: -1, a: 0, target: 0 };
  var raf = 0;
  var scale = 1, sOpen = 1, sClosed = 1, openness = 0, cx = 0, cy = 0, tx = 0;
  function applyScale() {
    // eases from the closed-book size to the spread size as the cover opens (and back at the end)
    var o = openness * openness * (3 - 2 * openness);
    scale = sClosed + (sOpen - sClosed) * o;
    scaler.style.transform = 'translate(' + cx + 'px,' + cy + 'px) scale(' + scale + ') translate(' + (-W) + 'px,' + (-H / 2) + 'px)';
  }
  var sheets, castR, castL, bshadow, edgeR, edgeRB, edgeL, edgeLB, spineF, spineB;
  var turnSeq = 0;

  function buildLeaves() {
    leaves = [];
    if (mode === 'double') {
      for (var i = 0; i < NF / 2; i++) leaves.push({ front: 2 * i, back: 2 * i + 1 });
    } else {
      // single page view: every face becomes its own leaf; its back shows the face's own reverse ghost
      for (var j = 0; j < NF; j++) leaves.push({ front: j, back: -1 - j });
    }
    L = leaves.length;
    leaves.forEach(function (lf, i) {
      lf.i = i; lf.angle = 0; lf.state = ''; lf.el = null; lf.strips = null; lf.order = 0;
      lf.curlDir = 1; lf.curl = 0.4;
    });
  }

  function maxCur() { return mode === 'double' ? L : L - 1; }

  function faceEl(f, side) {
    // side: 'r' = shown on the right half (spine on its left), 'l' = left half
    if (f < 0) {
      // back of a single-view leaf: plain paper with the face ghosted through
      var src = -1 - f;
      var el = document.createElement('div');
      el.className = 'face paper sp-r';
      if (FACES[src].type === 'cover' || FACES[src].type === 'backcover') el.className = 'face cloth inside sp-r';
      var rc = contentFor(src);
      if (rc) { var g = document.createElement('div'); g.className = 'ghost'; g.appendChild(rc); el.appendChild(g); }
      return el;
    }
    var spine = side === 'r' ? 'l' : 'r';
    if (mode === 'single') spine = 'l';
    var rev = null;
    if (mode === 'double') { rev = f % 2 === 0 ? f + 1 : f - 1; }
    var rspec = rev != null ? FACES[rev] : null;
    if (rspec && rspec.type !== 'page') rev = null;
    return buildFace(f, spine, rev);
  }

  function setupDOM() {
    bookEl.innerHTML = '';
    bshadow = div('bshadow');
    edgeL = div('edge l'); edgeLB = div('edge lb'); edgeR = div('edge r'); edgeRB = div('edge rb');
    spineF = div('spine f'); spineB = div('spine b');
    var sp = spineSVG();
    spineF.innerHTML = sp; spineB.innerHTML = sp;
    sheets = div('sheets');
    castR = div('cast r'); castL = div('cast l');
    castR.style.zIndex = 900; castL.style.zIndex = 900;
    sheets.appendChild(castR); sheets.appendChild(castL);
    [bshadow, edgeLB, edgeRB, edgeL, edgeR, spineF, spineB, sheets].forEach(function (e) { bookEl.appendChild(e); });
  }

  function spineSVG() {
    var s = '<svg viewBox="0 0 9 ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    HOLES.forEach(function (h) {
      var y = (h * H).toFixed(1);
      s += '<rect x="0" y="' + (y - 1.5) + '" width="9" height="3" fill="rgba(0,0,0,.45)" transform="translate(.6 1)"/>';
      s += '<rect x="0" y="' + (y - 1.35) + '" width="9" height="2.7" fill="url(#twistV)"/>';
    });
    // the leaves pull up slightly where they are sewn
    s += '<rect x="7.4" y="0" width="1.6" height="' + H + '" fill="rgba(255,255,255,.06)"/>';
    return s + '</svg>';
  }

  function div(c) { var d = document.createElement('div'); d.className = c; return d; }

  /* ---------- layout / scaling */
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    // always show the open book as a two-page spread, even in a narrow window
    // (the engine still supports a one-page 'single' view; switch here to re-enable it)
    var want = 'double';
    if (want !== mode) switchMode(want);
    var ctrl = vw < 700 ? 64 : 70;
    var gutter = vw < 700 ? 12 : 36;
    var bookW = mode === 'double' ? 2 * W + 24 : W + 12;
    var bookH = H + 16;
    var availW = vw - 2 * gutter, availH = vh - ctrl - gutter * 1.2;
    sOpen = Math.max(0.2, Math.min(availW / bookW, availH / bookH));
    // a closed book only needs one page width, so it can be shown larger
    sClosed = mode === 'double' ? Math.max(sOpen, Math.min(availW / (W + 24), availH / bookH)) : sOpen;
    cx = vw / 2;
    cy = (vh - ctrl) / 2 + gutter * 0.3;
    applyScale();
    requestRender();
  }

  function switchMode(m) {
    // keep roughly the same place in the book across the switch
    var faceNow = 0;
    if (mode === 'double') faceNow = Math.max(0, 2 * cur - (cur > 0 && cur < L ? 0 : (cur === L ? 1 : 0)));
    else if (mode === 'single') faceNow = cur;
    mode = m;
    tweens = []; drag = null;
    buildLeaves();
    setupDOM();
    if (mode === 'double') cur = Math.min(L, Math.ceil(faceNow / 2));
    else cur = Math.min(L - 1, faceNow);
    leaves.forEach(function (lf, i) { lf.angle = i < cur ? 180 : 0; });
    bookEl.classList.toggle('single', mode === 'single');
  }

  /* ---------- curl geometry */
  function stripAngles(lf, theta, out) {
    // absolute angle of each strip; the free edge leads (or trails) the spine
    var s = Math.sin(theta * Math.PI / 180);
    var C = (22 + 38 * lf.curl) * s * lf.curlDir;
    for (var k = 0; k < STRIPS; k++) {
      var t = (k + 1) / STRIPS;
      var a = theta + C * Math.pow(t, 2.3);
      out[k] = a < 0 ? 0 : a > 180 ? 180 : a;
    }
    return out;
  }
  var tmpA = new Float64Array(STRIPS);

  // projected x (from the spine) of the point at arc length `arc` on the leaf
  function projX(lf, theta, arc) {
    stripAngles(lf, theta, tmpA);
    var x = 0, rem = arc;
    for (var k = 0; k < STRIPS && rem > 0; k++) {
      var seg = Math.min(SW, rem);
      x += seg * Math.cos(tmpA[k] * Math.PI / 180);
      rem -= seg;
    }
    return x;
  }

  function solveTheta(lf, px, arc) {
    var lo = 0, hi = 180;
    if (px >= projX(lf, 0, arc)) return 0;
    if (px <= projX(lf, 180, arc)) return 180;
    for (var n = 0; n < 26; n++) {
      var mid = (lo + hi) / 2;
      if (projX(lf, mid, arc) > px) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ---------- lighting: light from the upper left (−x, −y, toward the viewer) */
  var LX = -0.45, LZ = 0.82;
  function shadeFront(phi) { var r = phi * Math.PI / 180; return -LX * Math.sin(r) + LZ * Math.cos(r) - LZ; }
  function shadeBack(phi) { var r = phi * Math.PI / 180; return LX * Math.sin(r) - LZ * Math.cos(r) - LZ; }
  function shadeCss(v) {
    if (v >= 0) return 'rgba(255,251,240,' + Math.min(0.32, v * 0.95).toFixed(3) + ')';
    return 'rgba(28,18,8,' + Math.min(0.48, -v * 0.42).toFixed(3) + ')';
  }

  /* ---------- per-leaf DOM state */
  function ensureFlat(lf, side) {
    var st = side === 'r' ? 'fr' : 'fl';
    if (lf.state === st) return;
    destroyLeaf(lf);
    var el = div('leaf ' + st);
    el.appendChild(faceEl(side === 'r' ? lf.front : lf.back, side));
    lf.el = el; lf.state = st;
    sheets.appendChild(el);
  }

  function ensureTurn(lf) {
    if (lf.state === 'turn') return;
    destroyLeaf(lf);
    var el = div('leaf turn');
    var front = faceEl(lf.front, 'r');
    var back = faceEl(lf.back, 'l');
    var parent = el;
    lf.strips = [];
    for (var k = 0; k < STRIPS; k++) {
      var st = div('strip');
      st.style.width = SW + 'px';
      st.style.left = (k === 0 ? 0 : SW) + 'px';
      // each strip face overlaps its neighbours by OV px on both sides so no hairline gaps open on the bend
      var sf = div('sface front');
      sf.style.left = (-OV) + 'px';
      sf.style.width = (SW + 2 * OV) + 'px';
      var fc = k === 0 ? front : front.cloneNode(true);
      fc.style.left = (-k * SW + OV) + 'px';
      sf.appendChild(fc);
      var ltf = div('lt'); sf.appendChild(ltf);
      var sb = div('sface back');
      sb.style.left = (-OV) + 'px';
      sb.style.width = (SW + 2 * OV) + 'px';
      var bc = k === 0 ? back : back.cloneNode(true);
      bc.style.left = (-(W - (k + 1) * SW) + OV) + 'px';
      sb.appendChild(bc);
      var ltb = div('lt'); sb.appendChild(ltb);
      st.appendChild(sf); st.appendChild(sb);
      parent.appendChild(st);
      parent = st;
      lf.strips.push({ el: st, lf: ltf, lb: ltb });
    }
    lf.el = el; lf.state = 'turn';
    lf.order = ++turnSeq;
    sheets.appendChild(el);
  }

  function destroyLeaf(lf) {
    if (lf.el && lf.el.parentNode) lf.el.parentNode.removeChild(lf.el);
    lf.el = null; lf.state = ''; lf.strips = null;
  }

  /* ---------- render */
  function requestRender() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    var active = stepTweens(now);
    stepPeel();
    render();
    if (active || drag || Math.abs(peel.a - peel.target) > 0.05) raf = requestAnimationFrame(frame);
  }

  function shownAngle(lf) {
    var a = lf.angle;
    if (peel.leaf === lf.i && peel.a > 0) {
      a = peel.dir > 0 ? Math.max(a, peel.a) : Math.min(a, 180 - peel.a);
    }
    return a;
  }

  function render() {
    if (!sheets) return;
    var topR = -1, topL = -1, i, lf, a;
    var turning = [];
    for (i = 0; i < L; i++) {
      lf = leaves[i];
      a = shownAngle(lf);
      lf.shown = a;
      if (a > 0.01 && a < 179.99) turning.push(lf);
      else if (a <= 0.01) { if (topR < 0) topR = i; }
      else topL = i;
    }
    var center = cur;
    for (i = 0; i < L; i++) {
      lf = leaves[i];
      a = lf.shown;
      var isTurning = a > 0.01 && a < 179.99;
      if (isTurning) {
        ensureTurn(lf);
        drawTurning(lf, a);
        lf.el.style.zIndex = a < 90 ? 1000 - lf.i : 1000 + lf.i;
      } else if (i === topR) {
        ensureFlat(lf, 'r'); lf.el.style.zIndex = 20; lf.el.style.opacity = '';
      } else if (i === topL && mode === 'double') {
        // (the single-page view has no left page: turned leaves leave the screen)
        ensureFlat(lf, 'l'); lf.el.style.zIndex = 20; lf.el.style.opacity = '';
      } else if (Math.abs(i - center) <= LAZY && (i === topR + 1 || (i === topL - 1 && mode === 'double'))) {
        // pre-render the leaf directly underneath each top leaf, hidden, so a turn reveals it instantly
        ensureFlat(lf, a <= 0.01 ? 'r' : 'l'); lf.el.style.zIndex = 10;
      } else if (Math.abs(i - center) > LAZY + 2) {
        destroyLeaf(lf);
      } else if (lf.el && lf.state !== 'turn') {
        lf.el.style.zIndex = 5;
        if (lf.state === 'fr' && a > 0.01 || lf.state === 'fl' && a < 179.99) destroyLeaf(lf);
      } else if (lf.state === 'turn') {
        destroyLeaf(lf);
      }
    }
    // hide (but keep) pre-rendered leaves that are fully covered
    for (i = 0; i < L; i++) {
      lf = leaves[i];
      if (!lf.el || lf.state === 'turn') continue;
      lf.el.style.visibility = (i === topR || (i === topL && mode === 'double')) ? '' : 'hidden';
    }
    drawBookLevel(turning);
  }

  var bA = new Float64Array(STRIPS + 1), bC = new Float64Array(STRIPS + 1);
  function drawTurning(lf, theta) {
    var phis = stripAngles(lf, theta, new Float64Array(STRIPS));
    var prev = 0, k;
    // angle and bend at every strip boundary, so neighbouring strips meet with identical shading
    for (k = 0; k <= STRIPS; k++) {
      var p0 = k === 0 ? phis[0] : phis[k - 1], p1 = k === STRIPS ? phis[STRIPS - 1] : phis[k];
      bA[k] = (p0 + p1) / 2;
      var j = Math.max(1, Math.min(STRIPS - 1, k));   // bend = angle change across this boundary
      bC[k] = Math.abs(phis[j] - phis[j - 1]) / 10;
    }
    for (k = 0; k < STRIPS; k++) {
      var d = phis[k] - prev;
      prev = phis[k];
      lf.strips[k].el.style.transform = 'rotateY(' + (-d).toFixed(3) + 'deg)';
      // front: spine side (boundary k) -> free side (k+1); back face is mirrored, so its left is boundary k+1
      var f0 = shadeFront(bA[k]) - bC[k] * 0.06, f1 = shadeFront(bA[k + 1]) - bC[k + 1] * 0.06;
      var b0 = shadeBack(bA[k + 1]) - bC[k + 1] * 0.05, b1 = shadeBack(bA[k]) - bC[k] * 0.05;
      var g0 = OV + 'px,', g1 = ' ' + (SW + OV).toFixed(2) + 'px)';
      lf.strips[k].lf.style.background = 'linear-gradient(90deg,' + shadeCss(f0) + ' ' + g0 + shadeCss(f1) + g1;
      lf.strips[k].lb.style.background = 'linear-gradient(90deg,' + shadeCss(b0) + ' ' + g0 + shadeCss(b1) + g1;
    }
    if (mode === 'single') lf.el.style.opacity = theta > 110 ? Math.max(0, 1 - (theta - 110) / 60).toFixed(3) : '';
    lf.edgeX = 0; lf.lift = 0;
    for (k = 0; k < STRIPS; k++) {
      lf.edgeX += SW * Math.cos(phis[k] * Math.PI / 180);
      lf.lift += SW * Math.sin(phis[k] * Math.PI / 180);
    }
  }

  function drawBookLevel(turning) {
    var a0 = leaves[0].shown / 180;
    var aL = leaves[L - 1].shown / 180;
    var leftCount = 0;
    for (var i = 0; i < L; i++) leftCount += leaves[i].shown / 180;
    var rightCount = L - leftCount;

    if (mode === 'double') {
      // closed: the cover (right half) is centred; open: the spread is centred; closed at the back: back cover centred
      tx = -W / 2 * (1 - a0) + W / 2 * aL;
      var open = Math.max(0, Math.min(a0, 1 - aL));
      if (Math.abs(open - openness) > 1e-4) { openness = open; applyScale(); }
      bookEl.style.setProperty('--gut', (0.15 + 0.85 * Math.pow(open, 0.7)).toFixed(3));
      // follow the real footprint of the covers: a lifted cover only shadows the desk once past the spine
      var c0 = leaves[0], cL = leaves[L - 1];
      var left = c0.state === 'turn' ? W + Math.min(0, c0.edgeX) : (c0.shown > 90 ? 0 : W);
      var right = cL.state === 'turn' ? W + Math.max(0, cL.edgeX) : (cL.shown > 90 ? W : 2 * W);
      bshadow.style.left = left + 'px';
      bshadow.style.width = Math.max(0, right - left) + 'px';
    } else {
      tx = -W / 2;
      bookEl.style.setProperty('--gut', '0.5');
      bshadow.style.left = W + 'px';
      bshadow.style.width = W + 'px';
      rightCount = L - cur; leftCount = 0;
    }
    bookEl.style.transform = 'translateX(' + tx.toFixed(2) + 'px)';
    // a lifted leaf softens and widens the book's own shadow a little
    var lift = 0;
    turning.forEach(function (lf) { lift = Math.max(lift, Math.sin(lf.shown * Math.PI / 180)); });
    bshadow.style.opacity = (1 - 0.15 * lift).toFixed(3);

    // stack thickness: shrinks on one side and grows on the other as leaves turn
    var unit = 0.42;                  // px of stack thickness per leaf
    var tR = rightCount * unit, tL = leftCount * unit;
    if (mode === 'single') tR = Math.min(8, (L - cur) * 0.25);
    setEdge(edgeR, edgeRB, tR, 'r');
    setEdge(edgeL, edgeLB, mode === 'double' ? tL : 0, 'l');
    var coverOutR = mode === 'double' ? leaves[L - 1].shown < 90 : true;
    var coverOutL = mode === 'double' && leaves[0].shown > 90;
    edgeR.classList.toggle('cov-out', coverOutR); edgeRB.classList.toggle('cov-out', coverOutR);
    edgeL.classList.toggle('cov-out', coverOutL); edgeLB.classList.toggle('cov-out', coverOutL);

    // spine side of the closed book
    spineF.style.opacity = mode === 'double' ? Math.pow(1 - a0, 3).toFixed(3) : '0';
    spineB.style.opacity = mode === 'double' ? Math.pow(aL, 3).toFixed(3) : '0';

    // cast shadows from the most-lifted turning leaf
    var lf = null, best = -1;
    turning.forEach(function (t) { var s = Math.sin(t.shown * Math.PI / 180); if (s > best) { best = s; lf = t; } });
    if (!lf) { castR.style.opacity = 0; castL.style.opacity = 0; return; }
    var th = lf.shown, s = Math.sin(th * Math.PI / 180), xe = lf.edgeX;
    if (xe > 0) {
      var spread = 18 + 120 * s, al = 0.42 * Math.pow(s, 0.6);
      castR.style.background = 'linear-gradient(97deg, rgba(25,15,6,' + (al * 0.6).toFixed(3) + ') 0px, rgba(25,15,6,' + al.toFixed(3) + ') ' + Math.max(0, xe - 1).toFixed(1) + 'px, rgba(25,15,6,0) ' + (xe + spread).toFixed(1) + 'px)';
      castR.style.opacity = 1;
      castL.style.background = 'linear-gradient(270deg, rgba(25,15,6,' + (0.12 * s).toFixed(3) + ') 0px, rgba(25,15,6,0) ' + (30 + 60 * s).toFixed(1) + 'px)';
      castL.style.opacity = mode === 'double' ? 1 : 0;
    } else {
      var sp2 = 40 + 90 * s, a2 = 0.3 * s;
      castR.style.background = 'linear-gradient(90deg, rgba(25,15,6,' + a2.toFixed(3) + ') 0px, rgba(25,15,6,0) ' + sp2.toFixed(1) + 'px)';
      castR.style.opacity = 1;
      var xl = W + xe; // edge position inside the left half
      var sp3 = 10 + 50 * s, a3 = 0.30 * Math.pow(s, 0.8);
      castL.style.background = 'linear-gradient(270deg, rgba(25,15,6,0) 0px, rgba(25,15,6,' + (a3 * 1.2).toFixed(3) + ') ' + Math.max(0, W - xl).toFixed(1) + 'px, rgba(25,15,6,0) ' + (W - xl + sp3).toFixed(1) + 'px)';
      castL.style.opacity = mode === 'double' ? 1 : 0;
    }
  }

  function setEdge(side, bottom, t, which) {
    side.style.width = t.toFixed(2) + 'px';
    bottom.style.height = (t * 0.55).toFixed(2) + 'px';
    if (which === 'r') {
      bottom.style.left = W + 'px';
      bottom.style.width = (W + t).toFixed(2) + 'px';
    } else {
      side.style.left = (-t).toFixed(2) + 'px';
      bottom.style.left = (-t).toFixed(2) + 'px';
      bottom.style.width = (W + t).toFixed(2) + 'px';
    }
    side.style.display = bottom.style.display = t < 0.2 ? 'none' : '';
  }

  /* ---------- tweens: ease-in-out with a slight overshoot that settles */
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function settle(t) {
    // reaches the target at ~80% of the time, lifts back ~2.5% and settles
    var k = 0.8, over = 0.025;
    if (t < k) return easeInOutCubic(t / k) * (1 + over);
    var u = (t - k) / (1 - k);
    return 1 + over * (1 - (1 - Math.pow(1 - u, 3)));
  }
  function reflect(g) { return g > 1 ? 2 - g : g; }

  function startTween(lf, to, dur, delay) {
    tweens = tweens.filter(function (tw) { return tw.lf !== lf; });
    var from = lf.angle;
    if (peel.leaf === lf.i) { from = lf.shown || from; peel.a = 0; peel.target = 0; peel.leaf = -1; }
    lf.curlDir = to > from ? 1 : -1;
    if (reduceMotion) dur = Math.min(dur, 350);
    tweens.push({ lf: lf, from: from, to: to, dur: dur, t0: performance.now() + (delay || 0) });
    requestRender();
  }

  function stepTweens(now) {
    if (!tweens.length) return false;
    var still = [];
    tweens.forEach(function (tw) {
      var t = (now - tw.t0) / tw.dur;
      if (t < 0) { still.push(tw); return; }
      if (t >= 1) { tw.lf.angle = tw.to; return; }
      var g = reflect(settle(t));
      tw.lf.angle = tw.from + (tw.to - tw.from) * g;
      still.push(tw);
    });
    tweens = still;
    if (!tweens.length) { updateUI(); }
    return true;
  }

  /* ---------- hover peel (desktop): the corner lifts a little under the pointer */
  function stepPeel() {
    if (Math.abs(peel.a - peel.target) > 0.05) peel.a += (peel.target - peel.a) * 0.18;
    else peel.a = peel.target;
    if (peel.a === 0 && peel.target === 0) peel.leaf = -1;
  }

  /* ---------- navigation */
  function next(dur) {
    if (cur >= maxCur()) return;
    var lf = leaves[cur];
    lf.curl = 0.45;
    cur++;
    startTween(lf, 180, dur || T_CLICK);
    updateUI();
  }
  function prev(dur) {
    if (cur <= 0) return;
    cur--;
    var lf = leaves[cur];
    lf.curl = 0.45;
    startTween(lf, 0, dur || T_CLICK);
    updateUI();
  }
  function jump(to) {
    to = Math.max(0, Math.min(maxCur(), to));
    var n = 0, i;
    if (to > cur) {
      for (i = cur; i < to; i++, n++) { leaves[i].curl = 0.3; startTween(leaves[i], 180, 720, n * 55); }
    } else {
      for (i = cur - 1; i >= to; i--, n++) { leaves[i].curl = 0.3; startTween(leaves[i], 0, 720, n * 55); }
    }
    cur = to;
    updateUI();
  }

  /* ---------- UI: indicator + buttons */
  function faceLabel(f) {
    var pn = pageNumber(f);
    if (pn) return { n: pn };
    return { name: FACE_NAMES[f] || ['', ''] };
  }
  function updateUI() {
    var zh, en;
    if (mode === 'double') {
      var lf = cur > 0 ? 2 * cur - 1 : -1, rf = cur < L ? 2 * cur : -1;
      var nums = [lf, rf].map(pageNumber).filter(Boolean);
      if (nums.length) {
        var r = nums.length === 2 ? nums[0] + '–' + nums[1] : '' + nums[0];
        zh = '第 ' + r + ' 頁'; en = 'pp. ' + r + ' / ' + LAST_PAGE;
        if (nums.length === 1) en = 'p. ' + r + ' / ' + LAST_PAGE;
      } else {
        var nm = FACE_NAMES[rf >= 0 ? rf : lf] || ['', ''];
        if (cur === 0) nm = FACE_NAMES[0];
        if (cur === L) nm = FACE_NAMES[NF - 1];
        zh = nm[0]; en = nm[1];
      }
    } else {
      var lab = faceLabel(cur);
      if (lab.n) { zh = '第 ' + lab.n + ' 頁'; en = 'p. ' + lab.n + ' / ' + LAST_PAGE; }
      else { zh = lab.name[0]; en = lab.name[1]; }
    }
    indicator.innerHTML = '<span class="zh-i">' + zh + '</span><span class="en-i">' + en + '</span>';
    live.textContent = zh + ' ' + en;
    btnFirst.disabled = btnPrev.disabled = cur <= 0;
    btnLast.disabled = btnNext.disabled = cur >= maxCur();
  }

  /* ---------- pointer input: drag from edges/corners, click edges, swipe */
  function toBook(e) {
    return { x: (e.clientX - cx) / scale - tx + W, y: (e.clientY - cy) / scale + H / 2 };
  }

  // which leaf an edge grab at book point p would pick up: {lf, dir, arc}
  function hitEdge(p, generous) {
    if (p.y < -20 || p.y > H + 20) return null;
    var zone = EDGE_ZONE * W * (generous ? 1.25 : 1);
    var gx = p.x - W; // from the spine; >0 right page
    if (mode === 'double') {
      if (gx > 0 && gx <= W + 14 && cur < L) {
        if (gx >= W - zone || cur === 0) return { lf: leaves[cur], dir: 1, arc: Math.max(gx, 0.62 * W) };
      }
      if (gx < 0 && gx >= -W - 14 && cur > 0) {
        if (-gx >= W - zone || cur === L) return { lf: leaves[cur - 1], dir: -1, arc: Math.max(-gx, 0.62 * W) };
      }
    } else {
      if (gx > 0 && gx <= W + 14) {
        if (gx >= W - zone && cur < L - 1) return { lf: leaves[cur], dir: 1, arc: Math.max(gx, 0.62 * W) };
        if (gx <= 0.22 * W && cur > 0) return { lf: leaves[cur - 1], dir: -1, arc: W };
      }
    }
    return null;
  }

  function cornerFactor(y) { return Math.min(1, Math.abs(y / H - 0.5) * 2); }

  var down = null;
  desk.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target.closest('#controls')) return;
    var p = toBook(e);
    var h = hitEdge(p);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), p: p, hit: h, id: e.pointerId, moved: false };
    try { desk.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  desk.addEventListener('pointermove', function (e) {
    var p = toBook(e);
    if (!down) {
      // hover: grab cursor and a small corner peel
      if (e.pointerType !== 'mouse') return;
      var h = hitEdge(p);
      desk.style.cursor = h ? 'grab' : '';
      var corner = h && cornerFactor(p.y) > 0.72;
      if (corner && !tweens.length) {
        if (peel.leaf !== h.lf.i) { peel.leaf = h.lf.i; peel.a = 0; peel.dir = h.dir; }
        peel.target = 6 + 6 * cornerFactor(p.y);
        h.lf.curl = 0.9; h.lf.curlDir = h.dir;
        requestRender();
      } else if (peel.leaf >= 0) { peel.target = 0; requestRender(); }
      return;
    }
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 6) {
      down.moved = true;
      if (down.hit) beginDrag(down.hit, down.p);
    }
    if (drag) moveDrag(p, e);
  });

  function beginDrag(h, p) {
    var lf = h.lf;
    tweens = tweens.filter(function (tw) { return tw.lf !== lf; });
    if (peel.leaf === lf.i) { lf.angle = lf.shown; peel.leaf = -1; peel.a = peel.target = 0; }
    lf.curlDir = h.dir;
    lf.curl = 0.35 + 0.65 * cornerFactor(p.y);
    drag = { lf: lf, dir: h.dir, arc: h.arc, samples: [{ x: p.x, t: performance.now() }], startGx: p.x - W };
    desk.style.cursor = 'grabbing';
    requestRender();
  }

  function moveDrag(p) {
    var now = performance.now();
    drag.samples.push({ x: p.x, t: now });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 120) drag.samples.shift();
    var px = p.x - W;
    var theta;
    if (mode === 'single' && drag.dir < 0) {
      // single view: the previous leaf lies off-screen, so map the pull across the page linearly
      var u = (px - drag.startGx) / (W * 0.85 - drag.startGx);
      theta = 180 * (1 - Math.max(0, Math.min(1, u)));
    } else {
      // the grabbed point of the leaf follows the pointer exactly (inverse of the curl projection)
      theta = solveTheta(drag.lf, px, drag.arc);
    }
    drag.lf.angle = theta;
    requestRender();
  }

  function endPointer(e, cancelled) {
    if (!down) return;
    var d = down; down = null;
    desk.style.cursor = '';
    if (drag) {
      // release velocity (book px / ms) over the last ~120 ms; a pause before letting go means no fling
      var sm = drag.samples, now = performance.now(), vx = 0;
      if (sm.length > 1 && now - sm[sm.length - 1].t < 100) {
        vx = (sm[sm.length - 1].x - sm[0].x) / Math.max(16, sm[sm.length - 1].t - sm[0].t);
      }
      var lf = drag.lf, a = lf.angle;
      var goLeft = drag.dir > 0 ? (vx < -0.35 || (a > 90 && vx < 0.35)) : !(vx > 0.35 || (a < 90 && vx > -0.35));
      var to = goLeft ? 180 : 0;
      var dur = 260 + 640 * Math.abs(to - a) / 180;
      drag = null;
      if (goLeft && lf.i === cur) cur++;
      else if (!goLeft && lf.i === cur - 1) cur--;
      cur = Math.max(0, Math.min(maxCur(), cur));
      startTween(lf, to, dur);
      updateUI();
      return;
    }
    if (cancelled) return;
    var dx = e.clientX - d.x, dt = performance.now() - d.t;
    if (d.moved) {
      // swipe anywhere
      if (Math.abs(dx) > 40 && dt < 600 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
        if (dx < 0) next(); else prev();
      }
      return;
    }
    // click: edges (or anywhere on a closed cover)
    var h = hitEdge(d.p, true);
    if (h) { if (h.dir > 0) next(); else prev(); }
  }
  desk.addEventListener('pointerup', function (e) { endPointer(e, false); });
  desk.addEventListener('pointercancel', function (e) { endPointer(e, true); });
  desk.addEventListener('pointerleave', function () {
    if (!down && peel.leaf >= 0) { peel.target = 0; requestRender(); }
  });

  /* ---------- keyboard + buttons */
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': next(); break;
      case 'ArrowLeft': case 'PageUp': prev(); break;
      case 'Home': jump(0); break;
      case 'End': jump(maxCur()); break;
      default: return;
    }
    e.preventDefault();
  });
  btnNext.addEventListener('click', function () { next(); });
  btnPrev.addEventListener('click', function () { prev(); });
  btnFirst.addEventListener('click', function () { jump(0); });
  btnLast.addEventListener('click', function () { jump(maxCur()); });

  /* ---------- preload all images so turns never reveal a blank photo */
  function preload() {
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('template'), function (t) {
      Array.prototype.forEach.call(t.content.querySelectorAll('img'), function (img) {
        var src = img.getAttribute('src');
        if (seen[src]) return;
        seen[src] = 1;
        var im = new Image();
        im.decoding = 'async';
        im.src = src;
      });
    });
  }

  window.addEventListener('resize', layout);
  preload();
  layout();
  updateUI();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRender);

  // small debug/testing hook (read-only state + navigation)
  window.suzhouBook = {
    next: next, prev: prev, jump: jump,
    goto: function (n) { tweens = []; cur = Math.max(0, Math.min(maxCur(), n)); leaves.forEach(function (l, i) { l.angle = i < cur ? 180 : 0; }); updateUI(); requestRender(); },
    state: function () { return { mode: mode, cur: cur, leaves: L, angles: leaves.map(function (l) { return Math.round(l.angle); }) }; },
    setAngle: function (i, a, curl) { leaves[i].angle = a; if (curl != null) leaves[i].curl = curl; requestRender(); }
  };
})();
