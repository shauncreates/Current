# Current

Current is an independent curve editor. **The After Effects interface is a CEP HTML/CSS panel.** The old ScriptUI preview is superseded for After Effects.

## Install in After Effects (Windows)

Download the **Current CEP Setup** from [Releases](https://github.com/shauncreates/Current/releases). Close After Effects, run Setup and approve Windows' administrator prompt. It installs into:

`C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.shauncreates.current`

This development preview is unsigned. The installer offers an explicit option to enable unsigned CEP panels for your Windows account (CSXS 10–12 PlayerDebugMode). It does not alter Flow. If unsigned panels are already enabled, leave that option unchecked. Restart After Effects, then open **Window > Extensions > Current**. Close the old **Current.jsx** ScriptUI panel to avoid confusing the two editions.

The installed CEP folder contains the HTML/CSS/SVG editor and a small ExtendScript host bridge. Curves are drawn in Chromium; dragging does not call After Effects or write keyframes. Only **Apply to keys** performs an undoable edit.

Select two adjacent keys on a numeric property, choose or edit a curve, then Apply. Separate Position dimensions for physics curves. Expressions, locked layers and unsupported value types are reported rather than overwritten. Each application is an Undo group.

## Curves and libraries

The mode selector offers Bezier, Elastic and Bounce. Standard Ease/Quad/Cubic/Quart/Quint/Sine/Expo/Circ/Back presets and saved Spring curves remain supported. Elastic and Bounce have direct graph handles for timing, decay and magnitude. The motion preview changes no project data. Defaults are read-only. Create named custom tabs and save your graphs there.

Preset and mode changes animate briefly; direct dragging responds immediately. Reduced-motion preferences are respected. The graph resizes with the panel while handles, strokes and toolbar icons retain their shape and size.

Each `.current` export includes one complete list, including physics and standard curves. Import creates a new tab named after the file; duplicate names get numbered suffixes. `.flow` import supports Bezier libraries. Flow export skips unsupported curves and reports them. It writes nothing if the list contains no Bezier graphs.

Bezier coordinates remain exact when saved or exported. Where After Effects cannot represent vertical endpoint handles, Apply makes a small temporary approximation and displays a notice.

## EffectCraft

Normal EffectCraft does not currently host CEP panels. `Current.jsx` and `Install-Current.ps1` remain a legacy ScriptUI compatibility route for that host. [AfterCraft](https://github.com/shauncreates/AfterCraft) provides a built-in native panel and an experimental floating CEP host: choose **Window > Open CEP Panel…** and select Current's installed extension folder. This is partial CEP compatibility, not docked Adobe CEP. The CEP browser UI can also be previewed outside AE, but Apply requires a host bridge.

## Development and verification

Run `node build-cep.cjs`, `node test-current.cjs`, and `node test-host.cjs`. For browser interaction checks, install Playwright and run `node test-cep.cjs` and `node test-resize.cjs` (`BROWSER_CHANNEL=chrome` uses an installed Chrome). Build the Windows installer with Inno Setup using `packaging/Current-CEP.iss`.

The browser regression covers repeated drags, no host calls during drag, apply dispatch, modes, list import, reduced motion and resizing. Public host tests cover cold core loading, undo-group creation, refinement, endpoint approximation, hostile input and file interchange. Preview 4 was tested live in After Effects 26.5 / CEP 12: 20 repeated drags, a cold core load, Bezier Apply, Elastic and Bounce baking (29 generated keys each), and Undo restoring the original keys. Wide, tall, narrow and compact panel checks verified circular handles and fixed-size icons while preserving libraries. This does not establish compatibility with every AE version or property type.

Current is original work under MIT OR Apache-2.0. Flow packaging/interchange was inspected with REA to establish compatibility; its implementation, assets and presets are not included. This is an independent project.

