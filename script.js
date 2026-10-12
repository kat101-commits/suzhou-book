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

  /* ---------- leaves in physical order (data-driven) ----------
     "Page N" = the Nth single page, PDF p3 right ("pinnacle" page) = page 1.
     Spreads read odd | even: page 1 is printed on the back of the cover, so opening the book
     shows pages 1–2 and, for example, page 15 faces page 16 (requested twice; this wins over
     the odd-right sheet pairing in the die-cut/tracing spec). Each sheet therefore holds an
     even/odd pair: (cover,1), (2,3), (4,5) … (20,21), (22,back cover).
     Five unnumbered leaves are inserted; they never shift a page number:
       DIE-CUT right after the cover (so opening the book shows page 1 | the lattice window,
       with page 2 seen through it) · TRACING-1 after page 7 · TRACING-2 after 13 ·
       TRACING-3 between pages 15 and 16 (as requested, even though it splits that spread) ·
       TRACING-4 after 21. With this pairing a leaf can only sit between an odd page and the
       next even page, because each even/odd pair (2,3), (4,5) … are two sides of one sheet.   */
  var HALVES = ['3R'];
  for (var p = 4; p <= 13; p++) { HALVES.push(p + 'L'); HALVES.push(p + 'R'); }
  HALVES.push('14L');                                  // HALVES[n-1] = template of page n
  var LAST_PAGE = 22;
  var GREEN = '#5c913f', RED = '#a31f21';             // the book's two heading colours

  var LEAF_SPEC = [{ type: 'cover' }];
  var INSERT_AFTER = { 1: { type: 'diecut' }, 7: { type: 'tracing', ref: 1, ink: RED },
                       13: { type: 'tracing', ref: 2, ink: GREEN }, 15: { type: 'tracing', ref: 3, ink: GREEN, photo: true },
                       21: { type: 'tracing', ref: 4, ink: GREEN } };
  if (INSERT_AFTER[1]) LEAF_SPEC.push(INSERT_AFTER[1]);   // the cover's back is page 1
  for (var n = 2; n < LAST_PAGE; n += 2) {
    LEAF_SPEC.push({ type: 'page', pages: [n, n + 1] });
    if (INSERT_AFTER[n + 1]) LEAF_SPEC.push(INSERT_AFTER[n + 1]);
  }
  LEAF_SPEC.push({ type: 'backcover' });

  // faces: leaf i -> front 2i, back 2i+1
  var FACES = [];
  function pageFace(pn, i) { return { type: 'page', key: HALVES[pn - 1], n: pn, leaf: i }; }
  LEAF_SPEC.forEach(function (ls, i) {
    if (ls.type === 'cover') { FACES.push({ type: 'cover', leaf: i }); FACES.push(pageFace(1, i)); }
    else if (ls.type === 'backcover') { FACES.push(pageFace(LAST_PAGE, i)); FACES.push({ type: 'backcover', leaf: i }); }
    else if (ls.type === 'page') ls.pages.forEach(function (pn) { FACES.push(pageFace(pn, i)); });
    else ['front', 'back'].forEach(function (sd) { FACES.push({ type: ls.type, side: sd, ref: ls.ref, ink: ls.ink, photo: ls.photo, leaf: i }); });
  });
  var NF = FACES.length;                               // 34 faces, 17 leaves

  function isNewLeaf(f) { var t = FACES[f] && FACES[f].type; return t === 'diecut' || t === 'tracing'; }
  // the spine thread shows on the inside covers and on every inserted leaf (sewn through the same holes)
  function threadInner(f) { var t = FACES[f].type; return t === 'inside' || t === 'diecut' || t === 'tracing'; }

  function pageNumber(f) { return FACES[f] && FACES[f].n || null; }
  var FACE_NAMES = { cover: ['封面', 'Cover'], inside: ['封裡', 'Inside cover'], backcover: ['封底', 'Back cover'] };

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

  /* ---------- die-cut lattice window (花窗) ----------
     The cover's fan logo (vector paths from the PDF, in the #fan symbol) is turned 90° so it
     runs vertically, its long side = 80% of the page height (10% margin top and bottom),
     centred on x = 316, so its gutter-side edge sits at x ≈ 110 (≈20% of the width, clear of
     the stitching at x = 46) and the fore-edge side ≈ 37pt inside the page.
     JUDGMENT CALL: rotated +90° so the fan's wide arc faces the fore-edge and the narrow end
     points to the spine, like a fan's pivot.
     Only the openings are cut: the fan silhouette is removed except the frame stroke and the
     lattice bars, which stay as paper bridges (all bars meet the frame, so nothing floats). */
  var DC = { cx: 316, cy: H / 2, len: H * 0.8 };
  var dcCache = {};
  function fanPaths() {
    var ps = document.querySelectorAll('#fan path');
    return { outer: ps[0].getAttribute('d'), bars: ps[1].getAttribute('d') };
  }
  function svgURI(svg) { return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")'; }
  // mirror = true for the reverse face, so the holes line up from both sides
  function dcAssets(mirror) {
    var key = mirror ? 'b' : 'f';
    if (dcCache[key]) return dcCache[key];
    var fp = fanPaths(), S = DC.len / 145;
    var g = 'translate(' + DC.cx + ' ' + DC.cy + ') rotate(90) scale(' + S.toFixed(4) + ') translate(-72.5 -46)';
    if (mirror) g = 'translate(' + W + ' 0) scale(-1 1) ' + g;
    var R = 'x="-20" y="-20" width="' + (W + 40) + '" height="' + (H + 40) + '"';
    var defs = '<mask id="m" maskUnits="userSpaceOnUse" ' + R + '><rect ' + R + ' fill="#fff"/>' +
      '<g transform="' + g + '"><path d="' + fp.outer + '" fill="#000"/>' +
      '<path d="' + fp.outer + '" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="miter"/>' +
      '<path d="' + fp.bars + '" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="square"/></g></mask>';
    var paper = '<rect ' + R + ' fill="#000" mask="url(#m)"/>';
    var head = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    // rim shadow cast into the openings onto the page below: 3px down-right, 6px blur, 25%
    var shadow = head + '<defs>' + defs + '<filter id="s" filterUnits="userSpaceOnUse" ' + R + '>' +
      '<feOffset in="SourceAlpha" dx="3" dy="3" result="o"/><feGaussianBlur in="o" stdDeviation="3" result="b"/>' +
      '<feFlood flood-color="#2a0f08" flood-opacity=".25"/><feComposite in2="b" operator="in" result="sh"/>' +
      '<feComposite in="sh" in2="SourceAlpha" operator="out"/></filter></defs><g filter="url(#s)">' + paper + '</g></svg>';
    // 1px bevels on the cut edges: lit where the cut faces the upper-left light, darker where it faces away
    var bevel = head + '<defs>' + defs + '<filter id="v" filterUnits="userSpaceOnUse" ' + R + '>' +
      '<feOffset in="SourceAlpha" dx="1" dy="1" result="o1"/><feComposite in="SourceAlpha" in2="o1" operator="out" result="la"/>' +
      '<feFlood flood-color="#FFF5F0" flood-opacity=".7"/><feComposite in2="la" operator="in" result="lit"/>' +
      '<feOffset in="SourceAlpha" dx="-1" dy="-1" result="o2"/><feComposite in="SourceAlpha" in2="o2" operator="out" result="da"/>' +
      '<feFlood flood-color="#B86F64" flood-opacity=".4"/><feComposite in2="da" operator="in" result="dark"/>' +
      '<feMerge><feMergeNode in="lit"/><feMergeNode in="dark"/></feMerge></filter></defs><g filter="url(#v)">' + paper + '</g></svg>';
    dcCache[key] = { mask: svgURI(head + '<defs>' + defs + '</defs>' + paper + '</svg>'), shadow: svgURI(shadow), bevel: svgURI(bevel) };
    return dcCache[key];
  }
  function setMask(el, uri, x) {
    el.style.webkitMaskImage = el.style.maskImage = uri;
    el.style.webkitMaskSize = el.style.maskSize = W + 'px ' + H + 'px';
    el.style.webkitMaskRepeat = el.style.maskRepeat = 'no-repeat';
    el.style.webkitMaskPosition = el.style.maskPosition = (x || 0) + 'px 0px';
  }

  /* ---------- tracing / mulberry paper ----------
     Artwork: the quatrefoil windows and hairline from the reference images "page 1–4.png" (red on
     TRACING-1 in the red section, the green heading colour on TRACING-2–4 in the green section),
     measured with a component scan and redrawn as vectors. The references are 513×792, so
     they are scaled uniformly to the page height (×1.0227) and centred (+16.7pt). */
  var TRACE_ART = {"1":{"q":[[466.7,73.6],[466.7,121.7],[466.7,169.8],[419.6,204.5],[144.5,577.8],[89.3,625.9],[89.3,674.0],[144.5,674.0],[89.3,722.0]],"l":[[466.7,221.9,466.7,569.7]]},"2":{"q":[[89.3,83.9],[137.4,83.9],[220.2,130.9],[466.7,642.3],[411.4,690.3],[411.4,738.4],[466.7,738.4]],"l":[[466.7,250.6,466.7,598.3]]},"3":{"q":[[214.1,355.9],[262.1,355.9],[214.1,411.1],[310.2,411.1],[310.2,472.5],[466.7,599.3],[310.2,733.3]],"l":[[466.7,66.5,466.7,414.2]]},"4":{"q":[[469.7,67.5],[90.3,405.0],[481.0,568.6],[445.2,650.5],[481.0,694.4],[336.8,742.5],[481.0,742.5]],"l":[[180.3,67.5,427.8,67.5]]}};
  function traceArtSVG(ref, ink) {
    ink = ink || RED;
    var a = TRACE_ART[ref], qd = document.querySelector('#quatrefoil path').getAttribute('d');
    var q = 1.955; // reference quatrefoil is 38px; the booklet mark is 19.9 units with its stroke
    var s = '<svg class="trace-art" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    a.q.forEach(function (c) {
      s += '<path d="' + qd + '" fill="none" stroke="' + ink + '" stroke-width="1.57" transform="translate(' + (c[0] - 8.94 * q).toFixed(1) + ' ' + (c[1] - 8.54 * q).toFixed(1) + ') scale(' + q + ')"/>';
    });
    a.l.forEach(function (l) {
      s += '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '" stroke="' + ink + '" stroke-width="1.1" opacity=".85"/>';
      s += '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="2.6" fill="' + ink + '"/><circle cx="' + l[2] + '" cy="' + l[3] + '" r="2.6" fill="' + ink + '"/>';
    });
    return s + '</svg>';
  }
  // long kozo fibres: deterministic random strands, a few of them thicker
  var fibreURI = null;
  function kozoURI() {
    if (fibreURI) return fibreURI;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><g fill="none" stroke-linecap="round">';
    for (var i = 0; i < 70; i++) {
      var x = rand(i * 3.1) * W, y = rand(i * 7.7) * H, len = 60 + rand(i * 1.3) * 260, ang = (rand(i * 5.9) - 0.5) * 1.4;
      var thick = i % 11 === 0, dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
      var c1x = x + dx * 0.33 + (rand(i * 2.2) - 0.5) * 40, c1y = y + dy * 0.33 + (rand(i * 4.4) - 0.5) * 40;
      var c2x = x + dx * 0.66 + (rand(i * 6.6) - 0.5) * 40, c2y = y + dy * 0.66 + (rand(i * 8.8) - 0.5) * 40;
      s += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + (x + dx).toFixed(1) + ' ' + (y + dy).toFixed(1) +
        '" stroke="rgba(' + (thick ? '205,190,160,.55' : '215,202,175,.32') + ')" stroke-width="' + (thick ? 1.6 + rand(i) : 0.35 + rand(i * 9.1) * 0.6).toFixed(2) + '"/>';
    }
    fibreURI = svgURI(s + '</g></svg>');
    return fibreURI;
  }

  /* ---------- face builder */
  function contentFor(f) {
    var spec = FACES[f];
    if (!spec) return null;
    if (spec.type === 'tracing' && spec.side === 'front') {
      var d = document.createElement('div'); d.innerHTML = traceArtSVG(spec.ref, spec.ink);
      var fr = document.createDocumentFragment(); fr.appendChild(d.firstChild);
      if (spec.photo) {
        // black-and-white photo at 50% opacity in the bottom fore-edge corner, on the book's margins:
        // right edge x = 469.6 like the photos on right-hand pages, bottom y = 742 like the lowest text.
        // The pavilion and lotus pond from page 14 (p10l-37.jpg), cropped square (object-fit: cover)
        // at 3× the earlier 86pt width = 258pt. It sits *under* the quatrefoils and hairline, so where
        // they overlap the marks read as drawn on top of the print rather than being covered by it.
        var im = document.createElement('img');
        im.className = 'ph trace-photo';
        im.src = 'assets/img/p10l-37.jpg';
        im.alt = '';
        im.style.cssText = 'left:211.6px;top:484px;width:258px;height:258px';
        fr.insertBefore(im, fr.firstChild);
      }
      return fr;
    }
    if (spec.type !== 'page' || !spec.key) return null;
    var t = document.getElementById('pg-' + spec.key);
    return t ? t.content.cloneNode(true) : null;
  }

  function addThread(el, f, spineSide) {
    if (!threadInner(f)) return;
    el.insertAdjacentHTML('beforeend', threadSVG('inner'));
    if (spineSide === 'r') el.lastChild.style.transform = 'scaleX(-1)';
  }

  // spineSide: 'l' when the spine is on the face's left (right-hand pages), 'r' otherwise
  function buildFace(f, spineSide, reverseOf) {
    var spec = FACES[f];
    var el = document.createElement('div');
    var tone = rand(spec.leaf + 1);
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
    if (spec.type === 'diecut') {
      // wrapper: the masked red paper + the rim shadow that falls through the openings
      var A = dcAssets(spineSide === 'r');
      el.className = 'face dcw sp-' + spineSide;
      var pp = document.createElement('div');
      pp.className = 'face paper diecut sp-' + spineSide;
      pp.style.setProperty('--tone', (0.02 + tone * 0.05).toFixed(3));
      pp.style.setProperty('--tone-a', Math.round(120 + tone * 120) + 'deg');
      pp.innerHTML = '<div class="dc-vig"></div><div class="dc-bevel"></div><div class="gutter"></div><div class="fold"></div>';
      pp.querySelector('.dc-bevel').style.backgroundImage = A.bevel;
      addThread(pp, f, spineSide);
      setMask(pp, A.mask, 0);
      var sh = document.createElement('div');
      sh.className = 'dc-shadow';
      sh.style.backgroundImage = A.shadow;
      el.appendChild(sh);
      el.appendChild(pp);
      el._mask = A.mask;
      return el;
    }
    el.className = 'face paper sp-' + spineSide + (spec.type === 'inside' ? ' cloth inside' : '') + (spec.type === 'tracing' ? ' tracing' : '');
    el.style.setProperty('--tone', (0.015 + tone * 0.06).toFixed(3));
    el.style.setProperty('--tone-a', Math.round(120 + tone * 120) + 'deg');
    if (spec.type === 'tracing') {
      el.insertAdjacentHTML('beforeend', '<div class="tr-fibres"></div><div class="tr-cockle"></div>');
      el.querySelector('.tr-fibres').style.backgroundImage = kozoURI();
      if (spec.side === 'back') reverseOf = f - 1;    // the front's art shows through the thin paper
    }
    // translucency: ghost of the reverse side (5% on paper, ~28% on tracing paper via CSS)
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
    addThread(el, f, spineSide);
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
      LEAF_SPEC.forEach(function (ls, i) { leaves.push({ front: 2 * i, back: 2 * i + 1, type: ls.type }); });
    } else {
      // single page view: every face becomes its own leaf; its back shows the face's own reverse ghost.
      // Die-cut and tracing faces keep their real reverse, so holes and fibres line up while turning.
      for (var j = 0; j < NF; j++) {
        var ft = FACES[j].type;
        leaves.push({ front: j, back: isNewLeaf(j) ? (j ^ 1) : -1 - j, type: ft === 'diecut' || ft === 'tracing' ? ft : 'page' });
      }
    }
    L = leaves.length;
    leaves.forEach(function (lf, i) {
      lf.i = i; lf.angle = 0; lf.state = ''; lf.el = null; lf.strips = null; lf.order = 0;
      lf.curlDir = 1; lf.curl = 0.4;
      lf.thick = lf.type === 'tracing' ? 0.22 : 0.42;   // px of stack thickness this leaf adds
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
    if (mode === 'single') spine = side === 'l' && isNewLeaf(f) ? 'r' : 'l';
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
    // two-page spread everywhere except a narrow portrait phone screen (< 480px), where one page
    // is shown at a time. JUDGMENT CALL: the 530px preview pane stays two-page, as asked earlier.
    // ?view=single or ?view=double forces a mode (useful for testing).
    var q = /[?&]view=(single|double)/.exec(location.search);
    var want = q ? q[1] : (vw < 480 && vh > vw ? 'single' : 'double');
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
    var ov = OV;
    var cw = SW + 2 * ov, cc = 2.5;
    var chamfer = 'polygon(0 ' + cc + 'px,' + (2 * ov) + 'px 0,' + (cw - 2 * ov) + 'px 0,' + cw + 'px ' + cc + 'px,' + cw + 'px ' + (H - cc) + 'px,' + (cw - 2 * ov) + 'px ' + H + 'px,' + (2 * ov) + 'px ' + H + 'px,0 ' + (H - cc) + 'px)';
    lf.ov = ov;
    lf.strips = [];
    for (var k = 0; k < STRIPS; k++) {
      var st = div('strip');
      st.style.width = SW + 'px';
      st.style.left = (k === 0 ? 0 : SW) + 'px';
      // each strip face overlaps its neighbours by ov px on both sides so no hairline gaps open on the bend.
      // Translucent tracing paper would show a doubled overlap as faint lines, so on tracing leaves the
      // overlaps cross-fade (each strip fades out exactly where its neighbour fades in).
      // The overlap corners are chamfered so they never poke out as a sawtooth along the top/bottom edge.
      var sf = div('sface front');
      sf.style.left = (-ov) + 'px';
      sf.style.width = (SW + 2 * ov) + 'px';
      var fc = k === 0 ? front : front.cloneNode(true);
      fc.style.left = (-k * SW + ov) + 'px';
      sf.appendChild(fc);
      sf.style.clipPath = chamfer;
      var ltf = div('lt'); sf.appendChild(ltf);
      // the face clone carries its own full-size mask; the light overlay gets the same mask at -stripX
      if (front._mask) setMask(ltf, front._mask, -k * SW + ov);
      var sb = div('sface back');
      sb.style.left = (-ov) + 'px';
      sb.style.width = (SW + 2 * ov) + 'px';
      var bc = k === 0 ? back : back.cloneNode(true);
      bc.style.left = (-(W - (k + 1) * SW) + ov) + 'px';
      sb.appendChild(bc);
      sb.style.clipPath = chamfer;
      if (lf.type === 'tracing') { xfade(sf, k, false); xfade(sb, k, true); }
      var ltb = div('lt'); sb.appendChild(ltb);
      if (back._mask) setMask(ltb, back._mask, -(W - (k + 1) * SW) + ov);
      st.appendChild(sf); st.appendChild(sb);
      parent.appendChild(st);
      parent = st;
      lf.strips.push({ el: st, lf: ltf, lb: ltb });
    }
    lf.el = el; lf.state = 'turn';
    lf.order = ++turnSeq;
    sheets.appendChild(el);
  }

  function xfade(el, k, isBack) {
    var cw = SW + 2 * OV, a = k > 0, b = k < STRIPS - 1;   // no fade at the spine or the free edge
    if (isBack) { var t = a; a = b; b = t; }                // the back face is mirrored
    var g = 'linear-gradient(90deg,' + (a ? 'transparent 0px,#000 ' + 2 * OV + 'px,' : '#000 0px,') +
      (b ? '#000 ' + (cw - 2 * OV) + 'px,transparent ' + cw + 'px)' : '#000 ' + cw + 'px)');
    el.style.webkitMaskImage = el.style.maskImage = g;
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
    // leaves under a die-cut or tracing leaf stay visible down to the first opaque one (in the
    // one-page view a see-through leaf's own reverse is a separate leaf right beneath it)
    var under = {}, j, guard;
    if (topR >= 0) for (j = topR, guard = 0; j < L - 1 && seeThrough(leaves[j]) && guard < 3; j++, guard++) {
      if (leaves[j + 1].shown > 0.01) break;
      ensureFlat(leaves[j + 1], 'r'); under[j + 1] = leaves[topR].type === 'tracing' || leaves[j].type === 'tracing';
    }
    if (topL >= 0 && mode === 'double') for (j = topL, guard = 0; j > 0 && seeThrough(leaves[j]) && guard < 3; j--, guard++) {
      if (leaves[j - 1].shown < 179.99) break;
      ensureFlat(leaves[j - 1], 'l'); under[j - 1] = leaves[j].type === 'tracing';
    }
    // hide (but keep) pre-rendered leaves that are fully covered
    for (i = 0; i < L; i++) {
      lf = leaves[i];
      if (!lf.el || lf.state === 'turn') continue;
      var isUnder = Object.prototype.hasOwnProperty.call(under, i);
      var vis = i === topR || (i === topL && mode === 'double') || isUnder;
      lf.el.style.visibility = vis ? '' : 'hidden';
      if (isUnder) lf.el.style.zIndex = 15 - Math.abs(i - (i > topR && topR >= 0 ? topR : topL));
      // stand-in for "a blurred copy clipped inside the leaf": the page under a flat tracing leaf
      // is entirely covered by it, so blurring that page itself looks the same
      lf.el.style.filter = isUnder && under[i] && !seeThrough(lf) ? 'blur(1.2px)' : '';
    }
    drawBookLevel(turning);
  }

  function seeThrough(lf) { return lf.type === 'diecut' || lf.type === 'tracing'; }

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
      if (lf.type === 'tracing') {
        // thin paper: a narrower shading range, and it glows when backlit mid-turn
        var bl = 0.17 * Math.sin(theta * Math.PI / 180);
        f0 = f0 * 0.45 + bl; f1 = f1 * 0.45 + bl; b0 = b0 * 0.45 + bl; b1 = b1 * 0.45 + bl;
      }
      var g0 = lf.ov + 'px,', g1 = ' ' + (SW + lf.ov).toFixed(2) + 'px)';
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
    // stack thickness per side, weighted by each leaf's own thickness (tracing paper is thinner)
    var leftCount = 0, total = 0;
    for (var i = 0; i < L; i++) { leftCount += leaves[i].thick * leaves[i].shown / 180; total += leaves[i].thick; }
    var rightCount = total - leftCount;

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
      rightCount = 0; for (var k2 = cur; k2 < L; k2++) rightCount += leaves[k2].thick; leftCount = 0;
    }
    bookEl.style.transform = 'translateX(' + tx.toFixed(2) + 'px)';
    // a lifted leaf softens and widens the book's own shadow a little
    var lift = 0;
    turning.forEach(function (lf) { lift = Math.max(lift, Math.sin(lf.shown * Math.PI / 180)); });
    bshadow.style.opacity = (1 - 0.15 * lift).toFixed(3);

    // stack thickness: shrinks on one side and grows on the other as leaves turn
    var tR = rightCount, tL = leftCount;
    if (mode === 'single') tR = Math.min(8, rightCount * 0.6);
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
    if (lf.type === 'tracing') s *= 0.3;   // translucent: about 12% cast shadow instead of ~42%
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
  // a face's label: its page number, '–' for the unnumbered die-cut and tracing leaves, or a name
  function faceLabel(f) {
    if (f < 0 || f >= NF) return null;
    if (pageNumber(f)) return { n: pageNumber(f) };
    if (isNewLeaf(f)) return { dash: true };
    return { name: FACE_NAMES[FACES[f].type] };
  }
  function updateUI() {
    var zh, en, labs;
    if (mode === 'double') labs = cur === 0 ? [faceLabel(0)] : cur === L ? [faceLabel(NF - 1)] : [faceLabel(2 * cur - 1), faceLabel(2 * cur)];
    else labs = [faceLabel(cur)];
    var nums = labs.filter(function (l) { return l && l.n; }).map(function (l) { return l.n; });
    var dash = labs.some(function (l) { return l && l.dash; });
    if (nums.length === 2) { zh = '第 ' + nums[0] + '–' + nums[1] + ' 頁'; en = 'pp. ' + nums[0] + '–' + nums[1] + ' / ' + LAST_PAGE; }
    else if (nums.length === 1) {
      // keep the dash on the side of the spread where the unnumbered leaf is
      var dashLeft = dash && labs[0] && labs[0].dash;
      zh = (dashLeft ? '– · ' : '') + '第 ' + nums[0] + ' 頁' + (dash && !dashLeft ? ' · –' : '');
      en = (dashLeft ? '– · ' : '') + 'p. ' + nums[0] + (dash && !dashLeft ? ' · –' : '') + ' / ' + LAST_PAGE;
    } else if (dash) { zh = '–'; en = '– / ' + LAST_PAGE; }
    else { var nm = labs[0] && labs[0].name || ['', '']; zh = nm[0]; en = nm[1]; }
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
    state: function () { return { mode: mode, cur: cur, leaves: L, angles: leaves.map(function (l) { return Math.round(l.angle); }), indicator: indicator.textContent }; },
    order: function () { return leaves.map(function (l) { var a = FACES[l.front], b = FACES[l.back] || {}; return l.type + (a.n ? '(' + a.n + ',' + b.n + ')' : a.ref ? '#' + a.ref : ''); }); },
    setAngle: function (i, a, curl) { leaves[i].angle = a; if (curl != null) leaves[i].curl = curl; requestRender(); }
  };
})();
