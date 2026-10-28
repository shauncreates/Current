// Current CEP host bridge. Original work, MIT OR Apache-2.0.
// evalScript calls are explicit commands; graph dragging never calls this bridge.
var CurrentCEP = (function () {
  var busy = false, recipe = null, hostDirectory = File($.fileName).parent;
  function core() {
    if (typeof AfterCraftCurrentExtension === "undefined") {
      var old = $.global.__CurrentHeadless;
      try {
        $.global.__CurrentHeadless = true;
        var source = File(hostDirectory.parent.fsName + "/Current.jsx");
        if (!source.exists) throw new Error("Current's host engine is missing. Reinstall the complete CEP package.");
        $.evalFile(source);
      } finally { $.global.__CurrentHeadless = old; }
    }
    return AfterCraftCurrentExtension;
  }
  function fail(message) { throw new Error(message); }
  function exact(value, allowed) {
    if (!value || typeof value !== "object" || value instanceof Array) fail("Expected a command object.");
    for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key) && !Object.prototype.hasOwnProperty.call(allowed, key)) fail("Unknown command field: " + key);
  }
  function selection() {
    var comp = app.project && app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return { composition: null, properties: 0, intervals: 0 };
    var props = comp.selectedProperties, count = 0, intervals = 0;
    if (props.length > 512) fail("Select at most 512 properties.");
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (prop.propertyType !== PropertyType.PROPERTY) continue;
      var keys = prop.selectedKeys;
      if (keys.length > 16384) fail("Too many selected keys.");
      if (keys.length >= 2) count++;
      for (var j = 1; j < keys.length; j++) if (keys[j] === keys[j - 1] + 1) intervals++;
    }
    return { composition: String(comp.name || "Composition"), properties: count, intervals: intervals };
  }
  function exportList(api, request) {
    if (request.format !== "current" && request.format !== "flow") fail("Choose Current or Flow export.");
    var doc = api.validateDocument({ format: "current.graph-lists", version: 1, lists: [request.list] });
    var output = request.format === "flow" ? api.flowExport(doc.lists[0]) : { text: api.encodeCurrent(doc), skipped: [] };
    var file = File.saveDialog("Export selected graph list", request.format === "flow" ? "Flow library:*.flow" : "Current graph list:*.current");
    if (!file) return { cancelled: true };
    var suffix = "." + request.format;
    if (file.fsName.toLowerCase().slice(-suffix.length) !== suffix) file = File(file.fsName + suffix);
    if (file.exists) fail("Choose a new filename. Current preserves existing files.");
    file.encoding = "UTF-8";
    if (!file.open("w")) fail("Cannot write this file. Check After Effects' scripting file-write permission.");
    try { if (file.write(output.text) === false) fail("The export could not be written completely."); }
    finally { if (file.close() === false) fail("The export file could not be closed."); }
    return { path: file.fsName, skipped: output.skipped, exported: doc.lists[0].graphs.length - output.skipped.length };
  }
  function importList(api) {
    var file = File.openDialog("Import one Current or Flow graph list", "Graph lists:*.current;*.flow;*.json");
    if (!file) return { cancelled: true };
    if (!file.exists || file.length < 1 || file.length > 2097152) fail("Choose an existing graph list no larger than 2 MiB.");
    file.encoding = "UTF-8";
    if (!file.open("r")) fail("The selected graph list cannot be read.");
    var text;
    try { text = file.read(2097153); } finally { file.close(); }
    var doc = api.decodeGraphFile(text);
    if (doc.lists.length !== 1) fail("Choose a file containing one graph list.");
    doc.lists[0].name = decodeURI(file.name).replace(/\.(current|flow|json)$/i, "");
    return { document: api.validateDocument(doc), path: file.fsName };
  }
  function dispatch(text) {
    var api;
    try {
      api = core();
      if (busy) fail("Current is finishing another command. Try again shortly.");
      if (typeof text !== "string" || text.length > 65536) fail("Invalid or oversized Current command.");
      var request = api.parseJSON(text);
      exact(request, { op: 1, action: 1, config: 1, refine: 1, format: 1, list: 1 });
      if (request.op && request.action && request.op !== request.action) fail("Conflicting command names.");
      var op = request.op || request.action, result;
      if (typeof op !== "string") fail("Choose a Current command.");
      busy = true;
      try {
        if (op === "ping") result = { version: api.version, host: String(app.version), type: "cep", canRefine: recipe !== null };
        else if (op === "selection") result = selection();
        else if (op === "reset") { recipe = null; result = { canRefine: false }; }
        else if (op === "apply") {
          if (request.refine !== undefined && typeof request.refine !== "boolean") fail("Refine must be true or false.");
          if (request.refine && !recipe) fail("Apply a motion curve before refining it.");
          var applied = api.apply(app, api.config(request.config), request.refine ? recipe : null);
          recipe = applied.plans ? applied : null;
          result = { generatedKeys: applied.generatedKeys, properties: applied.properties, canRefine: recipe !== null,
            approximated: applied.approximated, notice: applied.approximated ? "Applied with a small endpoint approximation. Your saved curve is unchanged." : "" };
        } else if (op === "export") result = exportList(api, request);
        else if (op === "import") result = importList(api);
        else fail("Unknown Current command: " + op);
      } finally { busy = false; }
      return api.stringifyJSON({ ok: true, result: result });
    } catch (error) {
      var message = String(error && error.message || error);
      if (message.length > 2000) message = message.slice(0, 2000);
      if (api) return api.stringifyJSON({ ok: false, error: message });
      return '{"ok":false,"error":"Current host engine could not load. Reinstall the complete CEP package."}';
    }
  }
  return { dispatch: dispatch };
})();
