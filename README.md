# Current

Current is an independent curve editor. **The After Effects interface is a CEP HTML/CSS panel.** The old ScriptUI preview is superseded for After Effects.

## Install in After Effects (Windows)

Download the **Current CEP Setup** from [Releases](https://github.com/shauncreates/Current/releases). Close After Effects, run Setup and approve Windows' administrator prompt. It installs into:

`C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.shauncreates.current`

This development preview is unsigned. The installer offers an explicit option to enable unsigned CEP panels for your Windows account (CSXS 10–12 PlayerDebugMode). It does not alter Flow. If unsigned panels are already enabled, leave that option unchecked. Restart After Effects, then open **Window > Extensions > Current**. Close the old **Current.jsx** ScriptUI panel to avoid confusing the two editions.

The installed CEP folder contains the HTML/CSS/SVG editor and a small ExtendScript host bridge. Curves are drawn in Chromium; dragging does not call After Effects or write keyframes. Only **Apply to keys** performs an undoable edit.

Select two adjacent keys on a numeric property, choose or edit a curve, then Apply. Separate Position dimensions for physics curves. Expressions, locked layers and unsupported value types are reported rather than overwritten. Each application is an Undo group.

## Curves and libraries

Bezier, standard Ease/Quad/Cubic/Quart/Quint/Sine/Expo/Circ/Back families, Spring, Elastic and Bounce are available. The motion preview changes no project data. Defaults are read-only. Create named custom tabs and save your graphs there.

Each `.current` export includes one complete list, including physics and standard curves. Import creates a new tab named after the file; duplicate names get numbered suffixes. `.flow` import supports Bezier libraries. Flow export skips unsupported curves and reports them. It writes nothing if the list contains no Bezier graphs.

Bezier coordinates remain exact when saved or exported. Where After Effects cannot represent vertical endpoint handles, Apply makes a small temporary approximation and displays a notice.

## EffectCraft

Normal EffectCraft does not currently host CEP panels. `Current.jsx` and `Install-Current.ps1` remain a legacy ScriptUI compatibility route for that host; the new CEP edition is for After Effects. The built-in native panel is available in [AfterCraft](https://github.com/shauncreates/AfterCraft). The CEP browser UI can also be previewed outside AE, but Apply requires a host bridge.

## Development and verification

Run `node build-cep.cjs`, `node test-current.cjs`, and `node test-host.cjs`. For browser interaction checks, install Playwright and run `node test-cep.cjs` (`BROWSER_CHANNEL=chrome` uses an installed Chrome). Build the Windows installer with Inno Setup using `packaging/Current-CEP.iss`.

The browser regression covers repeated drags, no host calls during drag, apply dispatch, modes, list import and narrow layouts. Public host tests cover undo-group creation, refinement, endpoint approximation, hostile input and file interchange. Actual AE 26.5 host smoke testing applied Bezier and Spring to a temporary composition successfully. Live CEP 12 testing inside After Effects 26.5 also completed 20 repeated handle drags, followed by successful Bezier and Spring applications. This does not establish compatibility with every AE version or property type.

Current is original work under MIT OR Apache-2.0. Flow packaging/interchange was inspected with REA to establish compatibility; its implementation, assets and presets are not included. This is an independent project.

