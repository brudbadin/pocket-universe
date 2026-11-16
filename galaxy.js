// Pocket Universe - a spiral galaxy you can touch.
//
// The idea in one paragraph: every star has a "home" on a spiral arm, and the
// homes slowly rotate around the centre. Each star is tied to its home by an
// invisible spring. A finger pushes nearby stars away and sideways; when the
// finger leaves, the springs pull the stars back into the spiral.

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Settings - change these numbers to change how the galaxy looks and feels
  // ---------------------------------------------------------------------
  var ARMS = 2;                // number of spiral arms
  var TWIST = Math.PI * 2.1;   // how tightly the arms wind (bigger = tighter)
  var ROTATION_SPEED = 0.05;   // how fast the galaxy turns (radians per second)
  var SPRING = 16;             // how strongly a star is pulled back home
  var DAMPING = 3;             // how quickly a star's wobble dies down
  var PUSH = 3400;             // how hard a finger pushes stars away
  var SWIRL = 0.9;             // how much of that push goes sideways (the swirl)

  // Star colours from the warm centre to the cool edge, as [red, green, blue].
  var COLOURS = [
    [255, 236, 200],  // warm white
    [255, 208, 150],  // gold
    [255, 255, 255],  // white
    [170, 200, 255],  // pale blue
    [120, 150, 255],  // blue
    [190, 140, 255],  // violet
    [255, 130, 190]   // pink (scattered through the arms)
  ];

  var canvas = document.getElementById("galaxy");
  var ctx = canvas.getContext("2d");
  var hint = document.getElementById("hint");

  var width = 0, height = 0;     // screen size in CSS pixels
  var centreX = 0, centreY = 0;  // middle of the galaxy
  var galaxyRadius = 0;          // how far the arms reach, in pixels
  var touchRadius = 0;           // how far a finger's influence reaches
  var coreGlow = null;           // the soft light in the middle

  // ---------------------------------------------------------------------
  // The stars. Each array holds one number per star (star 0, star 1, ...).
  // Typed arrays like Float32Array are just fast lists of numbers.
  // ---------------------------------------------------------------------
  var count = 0;
  var homeDistance, homeAngle, turnSpeed;   // where the star's home is
  var offsetX, offsetY, speedX, speedY;     // how far it has been knocked away
  var size, colour, brightness, twinkle;    // how it looks

  // Small pre-drawn pictures of one glowing dot, one per colour.
  // Stamping a picture is much faster than drawing a fresh glow every time.
  var sprites = COLOURS.map(makeSprite);

  function makeSprite(rgb) {
    var s = document.createElement("canvas");
    s.width = s.height = 32;
    var c = s.getContext("2d");
    var g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    var tint = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",";
    g.addColorStop(0, "rgba(255,255,255,1)");  // bright white heart
    g.addColorStop(0.2, tint + "0.85)");
    g.addColorStop(0.5, tint + "0.22)");
    g.addColorStop(1, tint + "0)");            // fades to nothing
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return s;
  }

  function createStars() {
    // More stars on big screens, fewer on small ones, to stay smooth.
    count = Math.round(Math.min(5000, Math.max(2500, (width * height) / 110)));

    homeDistance = new Float32Array(count);
    homeAngle = new Float32Array(count);
    turnSpeed = new Float32Array(count);
    offsetX = new Float32Array(count);
    offsetY = new Float32Array(count);
    speedX = new Float32Array(count);
    speedY = new Float32Array(count);
    size = new Float32Array(count);
    colour = new Uint8Array(count);
    brightness = new Float32Array(count);
    twinkle = new Float32Array(count);

    for (var i = 0; i < count; i++) {
      // Distance from the centre, 0 to 1. The power crowds stars inward.
      var d = 0.02 + 0.98 * Math.pow(Math.random(), 1.5);
      var inArm = Math.random() < 0.75;

      if (inArm) {
        // Pick an arm, then twist further round the further out we go.
        var arm = Math.floor(Math.random() * ARMS);
        // Two randoms subtracted cluster near zero: most stars hug the arm.
        var scatter = (Math.random() - Math.random()) * (0.8 - 0.3 * d);
        homeAngle[i] = (arm / ARMS) * Math.PI * 2 + d * TWIST + scatter;
        // Arm stars all turn together so the spiral keeps its shape.
        turnSpeed[i] = ROTATION_SPEED;
      } else {
        // Loose "dust" stars anywhere in the disc. These can drift at their
        // own pace (inner ones faster) because they have no shape to keep.
        homeAngle[i] = Math.random() * Math.PI * 2;
        turnSpeed[i] = ROTATION_SPEED * (0.5 + 0.6 / (0.25 + d));
      }
      homeDistance[i] = d;

      // Mostly tiny stars, with a few big bright ones.
      var big = Math.random() < 0.03;
      size[i] = big ? 6 + Math.random() * 6 : 1.8 + Math.random() * 2.6;
      brightness[i] = big ? 0.9 : 0.35 + Math.random() * 0.55;
      twinkle[i] = Math.random() * Math.PI * 2;

      // Colour follows distance (warm centre, cool edge) with some mixing.
      if (inArm && Math.random() < 0.06) {
        colour[i] = 6;
      } else {
        var c = Math.floor((d + (Math.random() - 0.5) * 0.35) * 6);
        colour[i] = Math.max(0, Math.min(5, c));
      }

      // Start every star at the centre so the galaxy bursts open on load.
      offsetX[i] = -Math.cos(homeAngle[i]) * d * galaxyRadius;
      offsetY[i] = -Math.sin(homeAngle[i]) * d * galaxyRadius;
    }
  }

  // ---------------------------------------------------------------------
  // Fitting the screen
  // ---------------------------------------------------------------------
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    // Sharp drawing on high-resolution phone screens. Capped at 2 because
    // going higher costs a lot of speed for very little visible gain.
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    centreX = width / 2;
    centreY = height / 2;
    var small = Math.min(width, height), large = Math.max(width, height);
    galaxyRadius = small * 0.48 + large * 0.06;
    touchRadius = Math.max(90, small * 0.24);

    coreGlow = ctx.createRadialGradient(centreX, centreY, 0, centreX, centreY, galaxyRadius * 0.45);
    coreGlow.addColorStop(0, "rgba(255,235,200,0.55)");
    coreGlow.addColorStop(0.25, "rgba(255,200,150,0.18)");
    coreGlow.addColorStop(1, "rgba(120,120,255,0)");
  }

  // ---------------------------------------------------------------------
  // Fingers and the mouse. "Pointer events" cover both with one set of code.
  // We remember each finger currently on the screen by its id.
  // ---------------------------------------------------------------------
  var pointers = {};   // id -> { x, y }

  function setPointer(e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    hint.classList.add("hidden");
  }

  function removePointer(e) {
    delete pointers[e.pointerId];
  }

  canvas.addEventListener("pointerdown", setPointer);
  canvas.addEventListener("pointermove", function (e) {
    // A mouse reacts just by hovering; a finger only while it is touching.
    if (e.pointerType === "mouse" || pointers[e.pointerId]) setPointer(e);
  });
  canvas.addEventListener("pointerup", function (e) {
    if (e.pointerType !== "mouse") removePointer(e);
  });
  canvas.addEventListener("pointercancel", removePointer);
  canvas.addEventListener("pointerleave", removePointer);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------------
  // The animation loop: runs about 60 times a second
  // ---------------------------------------------------------------------
  var lastTime = 0;

  function frame(now) {
    // dt = seconds since the last frame. Capped so that coming back to the
    // tab after a pause does not fling the stars across the screen.
    var dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    var time = now / 1000;

    // Collect the active fingers into simple lists for the inner loop.
    var px = [], py = [];
    for (var id in pointers) {
      px.push(pointers[id].x);
      py.push(pointers[id].y);
    }
    var pointerCount = px.length;
    var reach2 = touchRadius * touchRadius;

    // Wipe the last frame, then switch to "lighter" so overlapping stars
    // add their light together. That is what makes the glow.
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, width, height);

    for (var i = 0; i < count; i++) {
      // 1. Rotate the star's home around the centre.
      var angle = (homeAngle[i] += turnSpeed[i] * dt);
      var dist = homeDistance[i] * galaxyRadius;
      var x = centreX + Math.cos(angle) * dist + offsetX[i];
      var y = centreY + Math.sin(angle) * dist + offsetY[i];

      // 2. The spring pulls the star home; damping calms it down.
      var ax = -SPRING * offsetX[i] - DAMPING * speedX[i];
      var ay = -SPRING * offsetY[i] - DAMPING * speedY[i];

      // 3. Each finger pushes nearby stars away and a little sideways.
      for (var p = 0; p < pointerCount; p++) {
        var dx = x - px[p];
        var dy = y - py[p];
        var d2 = dx * dx + dy * dy;
        if (d2 < reach2) {
          var d = Math.sqrt(d2) + 0.001;
          var closeness = 1 - d / touchRadius;         // 1 under the finger, 0 at the edge
          var force = PUSH * closeness * closeness / d;
          ax += (dx - dy * SWIRL) * force;
          ay += (dy + dx * SWIRL) * force;
        }
      }

      // 4. Move the star.
      speedX[i] += ax * dt;
      speedY[i] += ay * dt;
      offsetX[i] += speedX[i] * dt;
      offsetY[i] += speedY[i] * dt;

      // 5. Draw it, with a gentle twinkle.
      var s = size[i];
      ctx.globalAlpha = brightness[i] * (0.75 + 0.25 * Math.sin(time * 2 + twinkle[i]));
      ctx.drawImage(sprites[colour[i]], x - s, y - s, s * 2, s * 2);
    }

    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------
  window.addEventListener("resize", resize);
  resize();
  createStars();
  requestAnimationFrame(function (now) {
    lastTime = now;
    requestAnimationFrame(frame);
  });
})();
