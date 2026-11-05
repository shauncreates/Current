/* Current CEP panel. Original work, MIT OR Apache-2.0. No vendor implementation. */
(function () {
  'use strict';
  var core = window.AfterCraftCurrentExtension;
  var hostName = window.__aftercraftCEP ? 'AfterCraft' : 'After Effects';
  var KEY = 'current.cep.graph-lists.v1', doc = { format: 'current.graph-lists', version: 1, lists: [] };
  var state = core.config(), selectedList = -1, selectedGraph = '', defaults = core.presets();
  var curveTransition = null, renderedPoints = null, reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var frame = 0, drag = null, previewFrame = 0, previewStarted = 0, busy = false, damaged = false;
  var bridgeReady = false;
  var graph = document.getElementById('graph'), status = document.getElementById('status');
  var plot = { left: 20, top: 16, width: 260, height: 141, bottom: 157 };
  function el(id) { return document.getElementById(id); }
  function message(text, error) { status.textContent = text; status.className = error ? 'error' : ''; }
  function guard(fn) { return function (event) { try { return fn(event); } catch (error) { message(error.message || String(error), true); } }; }
  function cleanName(name) { name = String(name).trim(); if (!name || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Use a name of 1–80 characters.'); return name; }
  function activeList() { return selectedList < 0 ? { name: 'Defaults Copy', graphs: defaults } : doc.lists[selectedList]; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function uniqueName(name) {
    var base = name, suffix = 2;
    function exists(n) { return n.toLowerCase() === 'defaults' || doc.lists.some(function (list) { return list.name.toLowerCase() === n.toLowerCase(); }); }
    while (exists(name)) { var tail = ' (' + suffix++ + ')'; name = base.slice(0, 80 - tail.length) + tail; }
    return name;
  }
  function commit(next) {
    if (damaged) throw new Error('Saved libraries could not be read. Export your current work before repairing the saved data.');
    var text = core.encodeCurrent(next); // Validate completely before writing or replacing state.
    localStorage.setItem(KEY, text); doc = core.decodeCurrent(text);
  }
  try { var saved = localStorage.getItem(KEY); if (saved) doc = core.decodeCurrent(saved); }
  catch (error) { damaged = true; message('Saved libraries could not be read and were preserved: ' + error.message, true); }
  function bounds(config) {
    var low = 0, high = 1;
    for (var i = 0; i <= 80; i++) { var y = core.sample(config, i / 80); low = Math.min(low, y); high = Math.max(high, y); }
    if (config.mode === 'bezier') { low = Math.min(low, config.curve[1], config.curve[3]); high = Math.max(high, config.curve[1], config.curve[3]); }
    if (config.mode === 'elastic' || config.mode === 'bounce') high = Math.max(high, config.amplitude);
    return { low: low, high: high };
  }
  function point(x, y, extent) { return [plot.left + x * plot.width, plot.bottom - (y - extent.low) / (extent.high - extent.low) * plot.height]; }
  function pair(p) { return p[0].toFixed(3) + ',' + p[1].toFixed(3); }
  function physicsHandles() { return state.mode === 'elastic' || state.mode === 'bounce'; }
  function handlePosition(index) {
    if (!physicsHandles()) return [state.curve[index], state.curve[index + 1]];
    return index === 0 ? [0.5 / state.frequency, (state.damping - 0.1) / 19.9] : [0, state.amplitude];
  }
  function path(config, width, height) {
    var extent = bounds(config), parts = [];
    for (var i = 0; i <= 64; i++) { var t = i / 64, y = core.sample(config, t); parts.push((i ? 'L' : 'M') + (2 + t * (width - 4)).toFixed(2) + ',' + (height - 2 - (y - extent.low) / (extent.high - extent.low) * (height - 4)).toFixed(2)); }
    return parts.join('');
  }
  function draw() {
    frame = 0;
    // Use screen-sized SVG coordinates. Curves expand with the plot; handles and
    // strokes keep their physical shape instead of inheriting an anisotropic scale.
    var width = Math.max(1, graph.clientWidth), height = Math.max(1, graph.clientHeight);
    graph.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    plot = { left: 20, top: 16, width: Math.max(1, width - 40), height: Math.max(1, height - 39), bottom: height - 23 };
    var gridRect = el('graph-grid');
    gridRect.setAttribute('width', plot.width); gridRect.setAttribute('height', plot.height);
    el('grid').setAttribute('width', plot.width / 10); el('grid').setAttribute('height', plot.height / 6);
    el('grid-line').setAttribute('d', 'M' + plot.width / 10 + ' 0H0V' + plot.height / 6);
    var extent = drag ? drag.extent : bounds(state), parts = [], i;
    var target = [], elapsed = curveTransition ? Math.min(1, (performance.now() - curveTransition.start) / 160) : 1;
    var mix = 1 - Math.pow(1 - elapsed, 4);
    for (i = 0; i <= 80; i++) { var dest = point(i / 80, core.sample(state, i / 80), extent), old = curveTransition && curveTransition.from[i]; target.push(old ? [old[0] + (dest[0]-old[0])*mix, old[1] + (dest[1]-old[1])*mix] : dest); parts.push((i ? 'L' : 'M') + pair(target[i])); }
    renderedPoints = target; if (curveTransition && elapsed < 1) requestDraw(); else curveTransition = null;
    el('curve').setAttribute('d', parts.join(''));
    var start = point(0, 0, extent), end = point(1, 1, extent);
    el('baseline').setAttribute('d', 'M' + pair(start) + 'L' + pair(end));
    el('start').setAttribute('cx', start[0]); el('start').setAttribute('cy', start[1]);
    el('end').setAttribute('cx', end[0]); el('end').setAttribute('cy', end[1]);
    var bezier = state.mode === 'bezier', handles = bezier || physicsHandles(), first = handlePosition(0), second = handlePosition(2), a = point(first[0], first[1], extent), b = point(second[0], second[1], extent);
    el('handles').setAttribute('d', bezier ? 'M' + pair(start) + 'L' + pair(a) + 'M' + pair(end) + 'L' + pair(b) : handles ? 'M' + pair(point(first[0], 0, extent)) + 'L' + pair(a) + 'M' + pair(b) + 'L' + pair(point(1, second[1], extent)) : '');
    ['h0', 'hit0', 'h2', 'hit2'].forEach(function (id) { var target = el(id), p = /0$/.test(id) ? a : b; target.style.display = handles ? '' : 'none'; target.setAttribute('cx', p[0]); target.setAttribute('cy', p[1]); });
    el('curve-label').textContent = bezier ? state.curve.map(function (n) { return n.toFixed(3); }).join(', ') : state.mode === 'standard' ? state.family + ' ' + state.direction : state.mode + ' · drag timing / decay or amplitude';
    el('curve-label').title = el('curve-label').textContent;
    ['hit0', 'hit2'].forEach(function (id, i) { el(id).setAttribute('aria-label', bezier ? (i ? 'Incoming' : 'Outgoing') + ' Bezier handle' : i ? 'Amplitude handle' : 'Timing and decay handle'); });
  }
  function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }
  function syncFields() {
    ['x1', 'y1', 'x2', 'y2'].forEach(function (id, i) { el(id).value = +state.curve[i].toFixed(4); });
    ['frequency', 'damping', 'amplitude', 'density', 'family', 'direction'].forEach(function (id) { el(id).value = state[id]; });
  }
  function update(animate) {
    if (animate && !reduceMotion.matches && renderedPoints && !drag) curveTransition = { from: renderedPoints, start: performance.now() };
    else curveTransition = null;
    document.querySelectorAll('[data-mode]').forEach(function (button) { button.setAttribute('aria-selected', String(button.dataset.mode === state.mode)); });
    el('bezier-controls').hidden = state.mode !== 'bezier'; el('standard-controls').hidden = state.mode !== 'standard';
    el('physics-controls').hidden = state.mode === 'bezier' || state.mode === 'standard'; el('density-label').hidden = state.mode === 'bezier';
    syncFields(); requestDraw();
  }
  function selectConfig(graphData) { state = core.config(graphData.config); selectedGraph = graphData.name; el('graph-name').value = graphData.name; update(true); renderCards(); }
  function renderTabs() {
    var tabs = el('tabs'); tabs.textContent = '';
    ['Defaults'].concat(doc.lists.map(function (list) { return list.name; })).forEach(function (name, i) {
      var button = document.createElement('button'); button.textContent = name; button.title = name; button.className = selectedList === i - 1 ? 'active' : '';
      button.setAttribute('aria-current', String(selectedList === i - 1));
      button.onclick = function () { deleteArmed = false; selectedList = i - 1; selectedGraph = ''; el('search').value = ''; renderLibrary(); }; tabs.appendChild(button);
    });
    ['save', 'delete-graph', 'rename-list', 'delete-list'].forEach(function (id) { el(id).disabled = selectedList < 0 || damaged; });
  }
  function renderCards() {
    var cards = el('cards'), filter = el('search').value.toLowerCase(); cards.textContent = '';
    activeList().graphs.forEach(function (data) {
      if (data.name.toLowerCase().indexOf(filter) < 0) return;
      var button = document.createElement('button'); button.className = 'card' + (selectedGraph === data.name ? ' active' : ''); button.title = data.name;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 65 32'); svg.setAttribute('aria-hidden', 'true');
      var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path'); curve.setAttribute('d', path(data.config, 65, 32)); svg.appendChild(curve);
      var label = document.createElement('span'); label.textContent = data.name; button.appendChild(svg); button.appendChild(label); button.onclick = function () { selectConfig(data); }; cards.appendChild(button);
    });
    if (!cards.children.length) { var empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = filter ? 'No matching curves.' : 'Save a curve to this list.'; cards.appendChild(empty); }
  }
  function renderLibrary() { renderTabs(); renderCards(); }
  document.querySelectorAll('[data-mode]').forEach(function (button) { button.onclick = function () { state.mode = button.dataset.mode; selectedGraph = ''; update(true); renderCards(); }; });
  ['x1', 'y1', 'x2', 'y2'].forEach(function (id, i) { el(id).onchange = guard(function () { var next = clone(state); next.curve[i] = Number(el(id).value); state = core.config(next); selectedGraph = ''; update(); }); });
  ['frequency', 'damping', 'amplitude', 'density', 'family', 'direction'].forEach(function (id) { el(id).onchange = guard(function () { var next = clone(state); next[id] = id === 'family' || id === 'direction' ? el(id).value : Number(el(id).value); state = core.config(next); update(); }); });
  el('reverse').onclick = function () { var c = state.curve; state.curve = [1 - c[2], 1 - c[3], 1 - c[0], 1 - c[1]]; update(); };
  function pointerPosition(event) {
    var matrix = graph.getScreenCTM(); if (!matrix) return null;
    var p = graph.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; return p.matrixTransform(matrix.inverse());
  }
  function startDrag(event) {
    if ((!physicsHandles() && state.mode !== 'bezier') || event.button !== 0) return;
    var index = event.target.getAttribute('data-handle'); if (index === null) return;
    var pointer = pointerPosition(event); if (!pointer) return;
    event.preventDefault(); curveTransition = null; drag = { index: Number(index), extent: bounds(state), pointerId: event.pointerId, pointer: pointer, origin: handlePosition(Number(index)) };
    selectedGraph = '';
    graph.classList.add('dragging');
    if (graph.setPointerCapture && event.pointerId !== undefined) graph.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    if (!drag || (drag.pointerId !== undefined && event.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
    event.preventDefault(); var p = pointerPosition(event); if (!p) return;
    var x = drag.origin[0] + (p.x - drag.pointer.x) / plot.width, y = drag.origin[1] - (p.y - drag.pointer.y) / plot.height * (drag.extent.high - drag.extent.low);
    if (event.shiftKey) { x = Math.round(x * 20) / 20; y = Math.round(y * 20) / 20; }
    if (physicsHandles()) {
      if (drag.index === 0) { state.frequency = Math.max(0.5, Math.min(12, 0.5 / Math.max(1 / 24, x))); state.damping = Math.max(0.1, Math.min(20, 0.1 + y * 19.9)); }
      else state.amplitude = Math.max(0, Math.min(3, y));
    } else {
      state.curve[drag.index] = Math.max(0, Math.min(1, x)); state.curve[drag.index + 1] = Math.max(-9, Math.min(10, y));
      if (event.altKey) { var other = drag.index === 0 ? 2 : 0; state.curve[other] = 1 - state.curve[drag.index]; state.curve[other + 1] = 1 - state.curve[drag.index + 1]; }
    }
    syncFields(); requestDraw(); // No host calls, layout rebuilds or disk writes during dragging.
  }
  function stopDrag() { if (!drag) return; var id = drag.pointerId; drag = null; graph.classList.remove('dragging'); if (graph.releasePointerCapture && id !== undefined && graph.hasPointerCapture(id)) graph.releasePointerCapture(id); requestDraw(); }
  if (window.PointerEvent) { graph.addEventListener('pointerdown', startDrag); graph.addEventListener('pointermove', moveDrag); graph.addEventListener('pointerup', stopDrag); graph.addEventListener('pointercancel', stopDrag); graph.addEventListener('lostpointercapture', stopDrag); }
  else { graph.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', stopDrag); }
  window.addEventListener('blur', stopDrag);
  function resizeGraph() { curveTransition = null; requestDraw(); }
  window.addEventListener('resize', resizeGraph);
  var graphObserver = window.ResizeObserver ? new ResizeObserver(resizeGraph) : null;
  if (graphObserver) graphObserver.observe(graph);
  el('compact').onclick = function () { el('current').classList.toggle('compact'); resizeGraph(); };
  function hostRequest(request, callback) {
    if (!window.__adobe_cep__ || !window.__adobe_cep__.evalScript) { callback({ ok: false, error: 'Open Current in After Effects to apply keyframes. Curve editing and libraries work in this preview.' }); return; }
    var root = window.__adobe_cep__.getSystemPath ? window.__adobe_cep__.getSystemPath('extension') : '';
    var boot = !bridgeReady && root ? '$.evalFile(File(' + JSON.stringify(root + '/host/current-host.jsx') + '));' : '';
    window.__adobe_cep__.evalScript(boot + 'CurrentCEP.dispatch(' + JSON.stringify(JSON.stringify(request)) + ',' + JSON.stringify(root) + ')', function (response) {
      try { var parsed = JSON.parse(response); bridgeReady = true; callback(parsed); } catch (error) { callback({ ok: false, error: hostName + ' did not return a valid response. Reopen the panel and try again.' }); }
    });
  }
  el('apply').onclick = guard(function () {
    if (busy) return; busy = true; el('apply').disabled = true; message('Applying curve…');
    hostRequest({ action: 'apply', config: core.config(state) }, function (response) { busy = false; el('apply').disabled = false; if (!response.ok) { message(response.error || 'Could not apply this curve.', true); return; } var result = response.result || {}; message(result.approximated ? 'Applied with a small endpoint approximation. Saved coordinates are unchanged.' : result.generatedKeys ? 'Baked ' + result.generatedKeys + ' motion keys. Undo restores the previous motion.' : 'Easing applied. Undo restores the previous easing.'); });
  });
  el('search').oninput = renderCards;
  el('save').onclick = guard(function () {
    if (selectedList < 0) throw new Error('Create or select a custom list first.'); var next = clone(doc), list = next.lists[selectedList], name = cleanName(el('graph-name').value), found = -1;
    list.graphs.forEach(function (g, i) { if (g.name.toLowerCase() === name.toLowerCase()) found = i; });
    var data = { name: name, config: core.config(state) }; if (found < 0) list.graphs.push(data); else list.graphs[found] = data;
    commit(next); selectedGraph = name; renderCards(); message('Saved in ' + list.name + '.');
  });
  el('delete-graph').onclick = guard(function () {
    if (selectedList < 0 || !selectedGraph) throw new Error('Select a saved curve first.'); var next = clone(doc); next.lists[selectedList].graphs = next.lists[selectedList].graphs.filter(function (g) { return g.name !== selectedGraph; }); commit(next); selectedGraph = ''; renderCards(); message('Curve deleted.');
  });
  el('new-list').onclick = guard(function () { var next = clone(doc), name = uniqueName(cleanName(el('list-name').value)); next.lists.push({ name: name, graphs: [] }); commit(next); selectedList = doc.lists.length - 1; selectedGraph = ''; renderLibrary(); message('Created ' + name + '.'); });
  el('rename-list').onclick = guard(function () { if (selectedList < 0) throw new Error('Defaults cannot be renamed.'); var name = cleanName(el('list-name').value); if (doc.lists.some(function (l, i) { return i !== selectedList && l.name.toLowerCase() === name.toLowerCase(); }) || name.toLowerCase() === 'defaults') throw new Error('That list name is already used.'); var next = clone(doc); next.lists[selectedList].name = name; commit(next); renderTabs(); message('List renamed.'); });
  var deleteArmed = false;
  el('delete-list').onclick = guard(function () { if (selectedList < 0) return; if (deleteArmed !== activeList().name) { deleteArmed = activeList().name; message('Click Delete list again to delete ' + activeList().name + ' and its graphs.'); setTimeout(function () { deleteArmed = false; }, 4000); return; } deleteArmed = false; var next = clone(doc); next.lists.splice(selectedList, 1); commit(next); selectedList = -1; selectedGraph = ''; renderLibrary(); message('List deleted.'); });
  el('import').onclick = function () { el('import-file').click(); };
  el('import-file').onchange = guard(function () {
    var file = el('import-file').files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) throw new Error('Choose a graph file no larger than 2 MiB.');
    var reader = new FileReader(); reader.onerror = function () { message('Could not read the graph file.', true); };
    reader.onload = guard(function () { var incoming = core.decodeGraphFile(reader.result); if (incoming.lists.length !== 1) throw new Error('Choose a file containing one graph list.'); var list = incoming.lists[0]; list.name = uniqueName(cleanName(file.name.replace(/\.(current|flow|json)$/i, ''))); var next = clone(doc); next.lists.push(list); commit(next); selectedList = doc.lists.length - 1; selectedGraph = ''; renderLibrary(); message('Imported ' + list.graphs.length + ' graphs into ' + list.name + '.'); }); reader.readAsText(file); el('import-file').value = '';
  });
  el('export').onclick = guard(function () {
    var list = clone(activeList()), format = el('export-format').value, output = format === 'flow' ? core.flowExport(list) : { text: core.encodeCurrent({ format: 'current.graph-lists', version: 1, lists: [list] }), skipped: [] };
    if (window.__aftercraftCEP && window.cep && window.cep.fs) {
      var filesystem = window.cep.fs, choice = filesystem.showSaveDialogEx('Export selected graph list', '', [format], list.name.replace(/[<>:"/\\|?*]/g, '_') + '.' + format);
      if (choice.err) throw new Error(choice.error || 'Could not open the export dialog.');
      if (!choice.data || !choice.data.length) { message('Export cancelled.'); return; }
      var filename = choice.data[0], suffix = '.' + format;
      if (filename.toLowerCase().slice(-suffix.length) !== suffix) filename += suffix;
      var existing = filesystem.stat(filename);
      if (!existing.err) throw new Error('Choose a new filename. Current preserves existing files.');
      if (existing.err !== 3) throw new Error(existing.error || 'Could not check the export destination.');
      var written = filesystem.writeFile(filename, output.text, 'UTF8');
      if (written.err) throw new Error(written.error || 'Could not save the graph list.');
      message(output.skipped.length ? 'Exported Bezier curves. Skipped ' + output.skipped.length + ': ' + output.skipped.join(', ') : 'Graph list exported.'); return;
    }
    if (window.__adobe_cep__) { hostRequest({ action: 'export', format: format, list: list }, function (response) { if (!response.ok) { message(response.error || 'Export failed.', true); return; } if (response.result && response.result.cancelled) { message('Export cancelled.'); return; } message(output.skipped.length ? 'Exported Bezier curves. Skipped ' + output.skipped.length + ': ' + output.skipped.join(', ') : 'Graph list exported.'); }); return; }
    var link = document.createElement('a'), url = URL.createObjectURL(new Blob([output.text], { type: 'application/json' })); link.href = url; link.download = list.name + '.' + format; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); message(output.skipped.length ? 'Exported Bezier curves. Skipped ' + output.skipped.length + ': ' + output.skipped.join(', ') : 'Graph list exported.');
  });
  function previewTick(now) {
    var elapsed = (now - previewStarted) / 1000, t = (elapsed % 1.8) / 1.8;
    el('preview-dot').style.left = (core.sample(state, t) * 100) + '%'; previewFrame = requestAnimationFrame(previewTick);
  }
  function previewIcon(playing) { el('play-icon').style.display = playing ? 'none' : ''; el('pause-icon').style.display = playing ? '' : 'none'; el('preview').setAttribute('aria-label', playing ? 'Stop motion preview' : 'Preview motion'); }
  el('preview').onclick = function () { if (previewFrame) { cancelAnimationFrame(previewFrame); previewFrame = 0; } else { previewStarted = performance.now(); previewFrame = requestAnimationFrame(previewTick); } previewIcon(!!previewFrame); };
  document.addEventListener('visibilitychange', function () { if (document.hidden && previewFrame) { cancelAnimationFrame(previewFrame); previewFrame = 0; previewIcon(false); } });
  window.addEventListener('beforeunload', function () { if (frame) cancelAnimationFrame(frame); if (previewFrame) cancelAnimationFrame(previewFrame); if (graphObserver) graphObserver.disconnect(); });
  if (window.__adobe_cep__) el('host-label').textContent = hostName;
  else message('Browser preview · Apply becomes available inside After Effects.');
  renderLibrary(); update();
  // Small read-only diagnostic surface for automated interaction checks.
  window.CurrentPanel = { getConfig: function () { return clone(state); }, getDocument: function () { return clone(doc); }, isDragging: function () { return !!drag; } };
})();
