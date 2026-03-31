// Gif1PhoneReveal.jsx — After Effects ExtendScript
// Run: File → Scripts → Run Script File...
//
// Animation phases:
//   0–25f   Phone springs up from bottom
//   25–75f  6 thumbnails orbit around "Распознаем трек"
//   75–90f  Thumbnails collapse inward
//   90–120f Result screen fades in

(function () {
  var FPS      = 30;
  var DURATION = 120 / FPS; // 4 seconds
  var CW = 800, CH = 900;
  var CX = CW / 2, CY = CH / 2;

  // ── Create comp ───────────────────────────────────────────────────────────
  var comp = app.project.items.addComp("Gif1PhoneReveal", CW, CH, 1, DURATION, FPS);
  comp.bgColor = [0.067, 0.067, 0.118];

  // ── Import iPhone frame ───────────────────────────────────────────────────
  var publicDir = "/Users/ll1pa/tangem-animation/public/";
  var iphoneFile = new File(publicDir + "iphone-frame.png");
  var iphoneFootage = null;
  if (iphoneFile.exists) {
    var io = new ImportOptions(iphoneFile);
    io.importAs = ImportAsType.FOOTAGE;
    iphoneFootage = app.project.importFile(io);
  }

  // ── Helper: add rounded rect to a shape layer ─────────────────────────────
  // IMPORTANT: sub-contents inside a vector group use "ADBE Vectors Group", not "Contents"
  function addRoundedRect(shapeLayer, w, h, roundness, color) {
    var root    = shapeLayer.property("ADBE Root Vectors Group");
    var grp     = root.addProperty("ADBE Vector Group");
    var gc      = grp.property("ADBE Vectors Group");
    var rect    = gc.addProperty("ADBE Vector Shape - Rect");
    rect.property("ADBE Vector Rect Size").setValue([w, h]);
    rect.property("ADBE Vector Rect Roundness").setValue(roundness);
    var fill    = gc.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(color);
  }

  // ── Helper: style a text layer (TextDocument must come from .value, never new TextDocument()) ──
  function styleText(layer, size, color, justify) {
    var prop = layer.property("ADBE Text Properties").property("ADBE Text Document");
    var doc  = prop.value;
    doc.fontSize  = size;
    doc.fillColor = color;
    if (justify !== undefined) doc.justification = justify;
    prop.setValue(doc);
  }

  // ── Helper: ease a keyframe ───────────────────────────────────────────────
  function ease(prop, idx) {
    var e = new KeyframeEase(0, 50);
    prop.setTemporalEaseAtKey(idx, [e], [e]);
  }

  // ── Background solid ──────────────────────────────────────────────────────
  comp.layers.addSolid([0.067, 0.067, 0.118], "BG", CW, CH, 1);

  // ── Phone null — drives entrance animation for all children ───────────────
  var phoneNull = comp.layers.addNull(DURATION);
  phoneNull.name = "Phone_Root";

  // Position: slide up from CY+280 to CY over frames 0–25
  var nullPos = phoneNull.property("ADBE Transform Group").property("ADBE Position");
  nullPos.setValueAtTime(0,       [CX, CY + 280]);
  nullPos.setValueAtTime(25/FPS, [CX, CY]);
  nullPos.setTemporalEaseAtKey(1, [new KeyframeEase(0, 40)], [new KeyframeEase(0, 80)]);
  nullPos.setTemporalEaseAtKey(2, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 40)]);

  // Fade in frames 0–8
  var nullOp = phoneNull.property("ADBE Transform Group").property("ADBE Opacity");
  nullOp.setValueAtTime(0,      0);
  nullOp.setValueAtTime(8/FPS, 100);
  ease(nullOp, 1);
  ease(nullOp, 2);

  // ── iPhone frame image ────────────────────────────────────────────────────
  if (iphoneFootage) {
    var iphoneLayer = comp.layers.add(iphoneFootage);
    iphoneLayer.name = "iPhone_Frame";
    // Scale to 260px wide; original PNG is 1490px wide
    var sc = (260 / 1490) * 100;
    iphoneLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
    iphoneLayer.parent = phoneNull;
    iphoneLayer.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
  }

  // ── Black screen solid (inside phone) ────────────────────────────────────
  var screenSolid = comp.layers.addSolid([0, 0, 0], "Screen", 234, 495, 1);
  screenSolid.parent = phoneNull;
  screenSolid.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);

  // Fade in with screen content
  var scrOp = screenSolid.property("ADBE Transform Group").property("ADBE Opacity");
  scrOp.setValueAtTime(22/FPS, 0);
  scrOp.setValueAtTime(32/FPS, 100);
  ease(scrOp, 1); ease(scrOp, 2);

  // ── Status bar text ───────────────────────────────────────────────────────
  var statusBar = comp.layers.addText("9:41");
  statusBar.name = "StatusBar";
  styleText(statusBar, 11, [1, 1, 1]);
  statusBar.parent = phoneNull;
  statusBar.property("ADBE Transform Group").property("ADBE Position").setValue([-85, -220]);
  statusBar.property("ADBE Transform Group").property("ADBE Opacity").setValue(70);

  // ── "Распознаем трек" center label ────────────────────────────────────────
  var centerText = comp.layers.addText("Распознаем трек");
  centerText.name = "Listening_Label";
  styleText(centerText, 13, [1, 1, 1], ParagraphJustification.CENTER_JUSTIFY);
  centerText.parent = phoneNull;
  centerText.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);

  var ctOp = centerText.property("ADBE Transform Group").property("ADBE Opacity");
  ctOp.setValueAtTime(22/FPS, 0);
  ctOp.setValueAtTime(32/FPS, 100);
  ctOp.setValueAtTime(88/FPS, 100);
  ctOp.setValueAtTime(90/FPS, 0);
  ease(ctOp, 1); ease(ctOp, 2); ease(ctOp, 3); ease(ctOp, 4);

  // ── 6 Album thumbnails — orbit via expression ─────────────────────────────
  var COLORS = [
    [0.91, 0.30, 0.24],
    [0.20, 0.60, 0.86],
    [0.18, 0.80, 0.44],
    [0.95, 0.61, 0.07],
    [0.61, 0.35, 0.71],
    [0.10, 0.74, 0.61],
  ];

  for (var i = 0; i < 6; i++) {
    var thumb = comp.layers.addShape();
    thumb.name = "Thumb_" + (i + 1);
    addRoundedRect(thumb, 36, 36, 8, COLORS[i]);
    thumb.parent = phoneNull;

    var baseAngle  = (i / 6) * 360;
    var enterDelay = 28 + i * 3;

    // Position expression: orbits [0,0] (phone null center = screen center)
    var posExpr = [
      "var f = time * 30;",
      "var delay = " + enterDelay + ";",
      "var base  = " + baseAngle  + ";",
      "// Ease-in enter over 15f",
      "var er = Math.min(Math.max((f - delay) / 15, 0), 1);",
      "var enter = er < 0.5 ? 2*er*er : -1 + (4 - 2*er)*er;",
      "// Orbit: 360deg over frames 28-75",
      "var orbit = Math.min(Math.max((f - 28) / 47, 0), 1) * 360;",
      "var ang = (base + orbit) * Math.PI / 180;",
      "// Collapse: frames 75-90",
      "var cp = Math.min(Math.max((f - 75) / 15, 0), 1);",
      "cp = cp * cp;",
      "var r = 62 * (1 - cp) * enter;",
      "[r * Math.cos(ang), r * Math.sin(ang)]",
    ].join("\n");

    thumb.property("ADBE Transform Group").property("ADBE Position").expression = posExpr;

    var opExpr = [
      "var f = time * 30;",
      "var delay = " + enterDelay + ";",
      "var enter = Math.min(Math.max((f - delay) / 15, 0), 1);",
      "var cp = Math.min(Math.max((f - 75) / 15, 0), 1);",
      "cp = cp * cp;",
      "enter * (1 - cp) * 100",
    ].join("\n");

    thumb.property("ADBE Transform Group").property("ADBE Opacity").expression = opExpr;
  }

  // ── Result screen background ──────────────────────────────────────────────
  var resultBg = comp.layers.addSolid([0.10, 0.02, 0.20], "Result_BG", 234, 495, 1);
  resultBg.parent = phoneNull;
  resultBg.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
  var rbOp = resultBg.property("ADBE Transform Group").property("ADBE Opacity");
  rbOp.setValueAtTime(88/FPS, 0);
  rbOp.setValueAtTime(90/FPS, 100);
  ease(rbOp, 1); ease(rbOp, 2);

  // ── Album art (purple rounded rect) ──────────────────────────────────────
  var albumArt = comp.layers.addShape();
  albumArt.name = "AlbumArt";
  addRoundedRect(albumArt, 70, 70, 12, [0.42, 0.36, 0.91]);
  albumArt.parent = phoneNull;

  var aaPos = albumArt.property("ADBE Transform Group").property("ADBE Position");
  aaPos.setValueAtTime(88/FPS,  [0, -40]);
  aaPos.setValueAtTime(104/FPS, [0, -55]);
  ease(aaPos, 1); ease(aaPos, 2);

  var aaOp = albumArt.property("ADBE Transform Group").property("ADBE Opacity");
  aaOp.setValueAtTime(88/FPS,  0);
  aaOp.setValueAtTime(104/FPS, 100);
  ease(aaOp, 1); ease(aaOp, 2);

  // ── Track title ───────────────────────────────────────────────────────────
  var trackTitle = comp.layers.addText("Blinding Lights");
  trackTitle.name = "Track_Title";
  styleText(trackTitle, 13, [1, 1, 1], ParagraphJustification.CENTER_JUSTIFY);
  trackTitle.parent = phoneNull;

  var ttPos = trackTitle.property("ADBE Transform Group").property("ADBE Position");
  ttPos.setValueAtTime(88/FPS,  [0, 18]);
  ttPos.setValueAtTime(104/FPS, [0, 10]);
  ease(ttPos, 1); ease(ttPos, 2);

  var ttOp = trackTitle.property("ADBE Transform Group").property("ADBE Opacity");
  ttOp.setValueAtTime(88/FPS,  0);
  ttOp.setValueAtTime(104/FPS, 100);
  ease(ttOp, 1); ease(ttOp, 2);

  // ── Artist name ───────────────────────────────────────────────────────────
  var artistText = comp.layers.addText("The Weeknd");
  artistText.name = "Artist_Name";
  styleText(artistText, 11, [0.55, 0.55, 0.55], ParagraphJustification.CENTER_JUSTIFY);
  artistText.parent = phoneNull;

  var atPos = artistText.property("ADBE Transform Group").property("ADBE Position");
  atPos.setValueAtTime(88/FPS,  [0, 42]);
  atPos.setValueAtTime(104/FPS, [0, 34]);
  ease(atPos, 1); ease(atPos, 2);

  var atOp = artistText.property("ADBE Transform Group").property("ADBE Opacity");
  atOp.setValueAtTime(88/FPS,  0);
  atOp.setValueAtTime(104/FPS, 100);
  ease(atOp, 1); ease(atOp, 2);

  // ── Open and done ─────────────────────────────────────────────────────────
  comp.openInViewer();
  alert("Done — " + comp.numLayers + " layers created.\n\nNote: iPhone frame imported from public/iphone-frame.png\nThumbnails use expressions — edit Thumb_N > Transform > Position expression to adjust orbit.");

}());
