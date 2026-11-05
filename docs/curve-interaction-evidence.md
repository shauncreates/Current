# Curve handle investigation, 28 October 2026

The locally supplied APK SHA-256 is
`ef3bf2a975665d6934ca6f09dd604185fbd3ed083b288d7bfcdf1a9c5d66f0f3`.
Its manifest reports `5.0.249.1002172`, despite the filename's different version.
Static inspection used REA 6.7.0 and JADX headless 0.7.1 with portable JDK 21.
The APK was not installed or executed. Complete evidence remains in the local
AfterCraft artifacts/analysis-tools directory; no vendor implementation or assets
are distributed in this repository.

Observed declarations and instruction behavior:

- EasingCurveView obtains handles from the selected curve, picks the nearest one,
  and updates its position relative to the pointer-down location. Cancel/release
  ends tracking. Coordinate bounds and overshoot are applied per handle.
- Elastic exposes a timing/decay handle and a separate magnitude handle.
- Bounce exposes a handle combining timing and bounciness.
- Some Elastic method recovery fell back to smali. These are static observations,
  not proof of runtime feel or exact visual equivalence.

Evidence records: touch handling `ev_a79af7bf00a7d24a177d5a3c9221482308668224497239676200329b834e465f`;
Elastic handles `ev_75adce31e67ca3e0821c0b371f4e5d1156176aed119ab2e231f12530d4e025eb`;
Elastic updates `ev_b2b4e1fbdede28c4698ced5ca697d5fa8f968814eb8fbd6ad79b8020f7c83703`;
Bounce handles `ev_102d8b4c36ecf7fb13c0ad3c629808206a91c311ba4d03cc1f249a85be6bab4e`;
Bounce updates `ev_f8fea5ab93f2d56f16140e9693fde3e52b5891c769791af3c3d614c74390325a`.

Current's implementation is original and deliberately retains its existing curve
sampler and serialized parameters. The main handle controls half-cycle length and
normalized damping; the left handle controls amplitude. Both Elastic and Bounce
retain their amplitude field. Relative dragging, a frozen drag scale, pointer
capture and cancellation provide immediate input without host calls. No vendor
formulas were substituted, so existing saved curves keep their meaning.

Preset/mode changes interpolate only the displayed graph for 160 ms. Direct
dragging interrupts this presentation transition. Reduced motion skips it.
Spring and standard easing remain readable, editable and exportable through
legacy lists and the default library; only their mode selector buttons were removed.
