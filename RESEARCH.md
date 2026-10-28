# CEP investigation and reconstruction

Question: package Current as a CEP panel and remove ScriptUI drag work from After Effects' UI thread.

Observed: installed Flow manifest declares an AEFT CEP Panel, HTML entrypoint, JSX bridge and separate resources. Its extension bundle contains panel HTML/CSS/JS. REA focused static evidence `ev_25f1c241b72e4d53f7149b49190beb0d65644b9fccb566617fadcd7be3952655` analyzed the HTML and panel bundle. Static graph coverage is partial due to obfuscation/dynamic relationships and bounded semantic retention; this did not observe Flow executing or recover all behavior. The earlier broad attempt timed out with retained partial evidence `ev_33d19b6f20cedb8ffb9b843ca53d2129d6955443bd7bd0357346bb5cdcff83e9`.

Observed in the superseded Current source: every mousemove synchronously updates ScriptUI fields and requests graph drawing, which performs many Bezier samples. This is a plausible contributor to the reported freeze, not a proven crash root cause.

Design: original SVG editor, pointer capture/cancellation, one requestAnimationFrame draw per browser frame, fixed drag coordinate range, no host calls or localStorage writes on mousemove, explicit Apply commands over CEP evalScript. No vendor implementation code/assets were copied.

Verified: browser repeated drag suite and host model suites pass. Actual AE 26.5 public-host smoke test applied vertical Bezier with notice and Spring with 29 generated keys. Native CEP panel opening/dragging remains a separate live test.

Live result: installed CEP 12 page completed 20 handle drags and both Bezier and Spring Apply in AE 26.5. The superseded ScriptUI panel produced an observed blocking error: Function graph.notify is undefined at line 602. The installed legacy file was disabled with a backup rename. The new CEP core loads headlessly and never opens ScriptUI.
