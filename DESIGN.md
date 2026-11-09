# Safeway DESIGN.md: locked direction for client + admin console

Civic flood-safety tool for Bangladesh. Calm, dense, trustworthy. Light app surfaces;
dark is reserved for night-travel map context and alert contrast (R-21 reason).

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1.
Reading: public-service routing for residents in monsoon season, utilitarian voice.

## Palette (R-29: 2 cores + 1 accent + functional semantics)

- Paper `#EEF2F5`, surface white, ink `#0F172A`, muted `#475569` (body 7.2:1 on paper).
- Primary deep teal `#0F766E`: primary CTAs, active nav pill, links. Reason: high-contrast
  action color distinct from the safety semantics below, so "go" never reads as "safe".
- Safety semantics green `#15803D` / amber `#CA8A04` / red `#DC2626`: road states ONLY,
  never decoration. Reason: they carry the routing algorithm's meaning (×1 / ×1.5–×5 / ×∞).
- Small text never below `#64748b` on white (4.76:1 measured). `#94a3b8` banned for text.

## Typography (R-06 reason)

- Instrument Sans (Roboto, Noto Sans Bengali fallback) for everything. Reason: open
  apertures stay legible at 12–13 px map labels and in sunlight glare; single family
  keeps a civic voice; Bengali fallback covers first-class `bn` locale.
- Small-caps kickers are BANNED except map metadata density (chip labels). Headlines do
  the work. Mono (system stack) only for data (coordinates, endpoint names, IDs),
  never decor. Mono uses tabular-nums.
- Nav active state: teal text + 2 px bottom rule (desktop), teal pill (mobile).
  Brand mark is a teal square with the shield glyph. No dark slate pills.

## Shape and elevation (R-11, R-12, R-13, R-10)

- Radii by role: controls 12 px, surfaces 16 px, overlays 24 px, status badges pill.
- Flat by default. Shadow only on overlays (palette, toasts) and the selected route.
  No glow anywhere. Glass only on palette + toasts; header, nav, chips are solid.

## Motif (identity)

- Tri-color safety rule (green/amber/red segments) under the hero headline and re-used
  sparingly. Product-derived, not decoration. Logo is the wordmark only.

## Icons (R-04 relevance note)

- One Lucide set for the whole tool. Reason: uniform 24 px stroke keeps map-adjacent
  controls legible at small sizes; relevance first (pin, bell, camera), never sparkles
  or orbs. No emoji in UI.

## Motion (MOTION 1)

- Hover/press feedback + state transitions (tab pills, dialog presence) only.
- No endless loops. One static status dot marks position; nothing pulses or marquees.

## Voice

- Verbs, no claims. Numbers appear only from live sources; everything else is cut or
  labeled Sample. No em dashes; no arrow on every button (wizard progression only).
- Dark hero reason: night-travel legibility + alert contrast; app stays light (R-21).

## Two sites, one system

- Public app (`client/`) and verification console (`admin/`) share this file.
  Console uses the same tokens in a denser table layout; no separate identity.
  Both apps ship the Light/Dark/System control with the same behavior.

## Theme (R-21 reason)

- Light is the default. Three modes: Light, Dark, System (follows the device,
  reacts to OS changes live). Picker in the header dropdown plus a segmented
  control in Settings; choice persists in `localStorage`, first visit with no
  saved choice follows the OS, pre-paint script prevents flash.
- Dark surfaces: page `slate-950`, cards `slate-900`, borders `white/10`,
  body text `slate-100`, muted `slate-400` (7:1 measured family).
- Shared components (client): `PageHeader` (title + optional eyebrow/description/actions,
  hairline below), `StatusStamp` (pill, semantic tone, status-only), `EmptyState`
  (dashed border, centered). Reuse before inventing. Admin stays plain React + tokens.
- The map swaps to CARTO dark tiles in dark mode (same OSM data, attribution kept).
- Safety hues stay fixed; only their text lightens (emerald/amber/red-300).
