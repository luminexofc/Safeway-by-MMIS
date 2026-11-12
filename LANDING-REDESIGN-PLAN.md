/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 */

# Safeway landing page — Colmez-inspired direction

## Intent

Create a dynamic, visually memorable public front door for Safeway that borrows the *editorial rhythm and product storytelling* the user likes in [Colmez](https://www.colmez.com/), while expressing Safeway's own road-safety purpose. This is a fresh creative direction, not a continuation of the previous restrained redesign proposal. The page should feel alive through real map imagery, layered composition, and purposeful movement, while remaining understandable, trustworthy, usable in English and Bengali, and functional in both themes.

## Reference reading: what to learn from Colmez

The live page presents a strong declarative headline and direct CTA, then moves through a large, distinctive image and a flowing band of domain-specific terms. It follows with a clear problem narrative, numbered editorial sections, large product-interface demonstrations, trust/security information, team credibility, and a closing CTA/footer. The product visuals carry much of the explanation; the page does not rely on a stack of generic feature cards. The design DNA worth adapting:

- Confident, concise headline with a clear primary action.
- Visual material that belongs to the product domain and carries narrative weight.
- A repeated motif that connects sections (Colmez's moving waste stream; Safeway can use a route trace/report signal).
- Editorially paced sections with varied image/text proportions and numbered wayfinding used sparingly.
- Product evidence shown in context, rather than abstract claims or a generic icon grid.
- A complete story that ends with a clear action and purposeful footer.

Do **not** copy Colmez's exact dark industrial/gold palette, waste imagery, wording, section layouts, interface screenshots, animation timing, or brand assets. Safeway should translate the underlying confidence and motion into a Bangladesh road-map visual language. Awwwards MCP lookup for a `colmez-com` listing returned 404, so the direct public website is the inspected reference. The page text confirms the narrative sequence above; its visual rhythm is informed by the user's preference and must be checked against the live page during implementation because text extraction cannot fully establish motion or spacing.

## Product and brand constraints (binding)

Use root `DESIGN.md` and `shared/design-tokens.css` as the product truth. The mood may become more dynamic, but these constraints remain:

- Audience: residents and riders in Bangladesh, using phones or desktop and English or Bengali.
- Core job: check road conditions, compare a route, report waterlogging, and track review.
- Brand: rain-cooled green/blue paper and ink; deep rain-green is the action/focus accent. Existing light, dark, and system theme behavior stays intact.
- Type: existing Bricolage Grotesque display and Noto Sans Bengali interface/body, with proper Bengali shaping and fit.
- Real service facts only. No invented report pins, live counts, travel-time savings, testimonials, review-time promises, partner logos, or freshness claims.
- Verified waterlogging reports can appear on the map. Pending reports remain visibly pending and do not masquerade as road conditions. Existing route planning uses OpenStreetMap geometry and does not automatically reroute around reports.
- Geolocation only after a user asks. Preserve auth boundaries, routes, Appwrite behavior, report submission/review, and operator separation.
- Use existing tokens and semantic condition colors with labels/icons. Road condition colors are not decoration or generic status colors.

## Creative concept: “A living map of the journey”

The landing page opens like a large editorial map plate: a confident headline sits beside or overlaps a custom map composition of Bangladesh road geometry. A restrained route trace travels through the page and changes meaning as it passes through the real report lifecycle: a submitted location, a neutral review checkpoint, and a verified road condition. The map serves as a visual explanation, not a claim that the visitor is seeing current operational data.

The visual should feel dynamic and atmospheric, with layered map fragments, elevation/contour hints, route-line drawing, subtle map tile/parallax movement, and selective scroll-linked transitions. Keep the strongest motion to the opening map/route composition and one lifecycle transition. Content remains still and readable; motion never hides facts or gates access.

### Map visual truth

Preferred order:

1. Use a real, approved Safeway map capture or a generated map illustration based on real, properly licensed OpenStreetMap geometry, with attribution where required. Clearly label it “Illustrative map” if it is not connected to live data.
2. If no approved asset is available, create a custom SVG/CSS schematic of Bangladesh's outline and abstract road topology. It must not contain plausible fake incident pins, district-level claims, fake street names, or route ETA data.
3. Never scrape or embed third-party map tiles without checking licensing, attribution, caching, and production usage requirements. Never make an illustrative visual look like live service data.

## Proposed landing-page narrative

Create a distinctive long-form page with varied section compositions. Avoid the default “hero + three cards + testimonials + FAQ” SaaS recipe.

1. **Header: compact and useful**
   - Safeway brand, route/map entry, report entry, language toggle, theme toggle, and sign-in/account action as appropriate to session state.
   - The mobile header may simplify links, but route and report access must remain obvious and reachable. Do not add dead navigation or expose operator-console links publicly.

2. **Hero: headline against a living map**
   - Headline direction: “Know the road before you go.” (English) with a natural, concise Bengali equivalent reviewed for meaning and fit.
   - Supporting copy: verified waterlogging information, route planning, and community reporting in one short explanation.
   - Primary CTA: “Check a route”; secondary: “Report waterlogging”. Signed-out visitors should be told that an account is required before following either protected action; preserve current `/login` handling.
   - Composition: oversized but controlled type; custom map image/illustration occupies a significant part of the hero and crosses or frames the text area. Avoid putting text over busy map detail unless contrast is guaranteed.
   - Add one slim moving route/report motif only if it communicates the journey and can be paused/respected under reduced motion. Do not use a status dot or “live” label for an illustrative map.

3. **Moving route ribbon / map legend**
   - A horizontal or curved route trace may connect a small set of labels such as “Report”, “Operator review”, “Verified on map”. This is content, not decorative ticker text. Keep it static or slow/one-shot; no infinite marquee that harms reading.
   - Include a compact legend that distinguishes “Under review” (neutral) from real road condition states. Explain the meaning in text and icon, not color alone.

4. **Problem and purpose: why the information is trustworthy**
   - Brief editorial section explaining that a community report does not become a road condition until reviewed. Use one high-impact map/detail visual or a crop of the lifecycle illustration; avoid repeated feature cards.
   - Explain the difference between a report and a verified condition, and avoid claims about speed/completeness of review.

5. **Product story: three varied chapters, not three equal cards**
   - **Find a route:** origin/destination route planning using OpenStreetMap road geometry. Use a real product screenshot or authentic UI capture when approved. Never simulate a working planner with fake route results.
   - **Report a waterlogged road:** show the actual report flow (location, water depth, optional photo) with sensitive/personal data removed. Make clear a photo is optional if the current UI allows it.
   - **Follow the review:** show actual status semantics from the user report flow; connect verified outcomes to the map. Do not imply automatic rerouting or real-time guarantees.
   - Vary each chapter: one wide map image with side copy, one compact text/diagram composition, one full-width status sequence. Feature hierarchy should reflect user value, not identical card dimensions.

6. **Route/map feature entry**
   - A prominent visual section that makes the core map/route task easy to enter. If live user data is not available on the public page, show an explicitly illustrative map visual, not a fabricated live map state.
   - State clearly that map access requires sign-in if that remains the product boundary.

7. **Closing action**
   - Calm, direct closing prompt to check a route or contribute a report. Keep both actions available, with route check as primary when consistent with product goals.

8. **Footer: real destinations only**
   - Route planner/map (`/navigate` or current established route), report (`/report`), signed-in report tracking (`/my-reports`), Privacy (`/privacy`), account entry, and a short service-purpose statement.
   - Avoid the generic four-column marketing footer. Confirm routes in `client/src/App.jsx` and preserve protected navigation behavior.

## Art direction and motion guidance

- **Palette:** use current shared tokens. Build visual contrast through scale, map texture, crop, depth, and paper/ink shifts. The reference's dark palette is not a reason to force Safeway dark. Support the existing light/dark toggle; check the map art in both modes (alternate assets or tokenized SVG styling if appropriate).
- **Map character:** road geometry and route lines form the signature motif. Use real, approved geometry or clearly diagrammatic abstraction. No stock map screenshots, decorative dot grid, generic AI orb, or unrelated illustration.
- **Image treatment:** use cropped map panels, topographic layers, and actual product captures with captions/alt text. Avoid fake browser/device frames. Product captures should be real UI, not invented dashboard data.
- **Motion:** richer than the previous plan but with purpose: route line draws to show direction; map layers drift/parallax slightly to establish depth; sections reveal through restrained opacity/transform; report status transitions once to explain review. No endless float/pulse, rapid ticker, scroll-jacking, pinned long-scroll takeover, or movement required to read content.
- **Accessibility:** offer a reduced-motion equivalent; avoid flashing and excessive parallax; maintain clear reading order and contrast regardless of background imagery. Keyboard/focus remains visible and immediate.
- **Density:** maintain calm reading zones between visual chapters. Motion/imagery must not make the product purpose harder to understand.

## Reference inventory from `DESIGN.md`

Inspect selectively; this is not an instruction to use every resource or dependency.

- **Page-level inspiration:** Curated.design, Httpster, Dark Mode Design. Search for editorial map storytelling, animated cartography, and thoughtful light/dark treatment. Do not copy page compositions wholesale.
- **Footer and CTA:** Footer.design and CTA.gallery. Select compact real-link structure and direct CTA hierarchy; avoid generic template columns.
- **Component patterns:** React Bits, Rare UI, Spell UI, Cult UI, useLayouts, beUI, Astryx, Libraries.dev, Originkit, 21st.dev, Shadcn Blocks, Allcomps. Use only if a specific pattern fits map/lifecycle storytelling and can be built accessibly with existing project tools.
- **Motion references:** Motion and Transitions.dev for simple route drawing/section transitions. ThreeUI and Glass3D are poor default fits; avoid adding 3D/glass dependencies unless an implementation proof demonstrates a real user benefit and acceptable mobile performance.
- Record which resources were actually inspected and what specific design idea was adapted. Do not cite a resource as inspiration if it was not opened.

## Implementation plan for OpenCode

### Phase 1 — inspect and prepare assets

1. Read `DESIGN.md`, this plan, `shared/design-tokens.css`, current `client/src/pages/Landing.jsx`, `landing.css`, copy, route table, app shell, theme/language utilities, and relevant image/asset conventions.
2. Inspect current router destinations and authentication gates before changing CTA logic. Keep route planner `/navigate`, report `/report`, report tracking `/my-reports`, privacy `/privacy`, and session-aware account paths aligned with the actual router.
3. Inspect the listed inspiration resources selectively. Inspect the live Colmez page beyond extracted text when possible to validate image scale, composition, and motion character. Extract structure and principles only; never copy its assets or detailed layout.
4. Identify available approved map assets. If none exist, prepare a clearly schematic map illustration with no factual incident/route claims; use asset attribution as required.
5. State exact files to edit before implementation. Expected scope: `client/src/pages/Landing.jsx`, `client/src/pages/landing.css`, and possibly landing-owned copy/assets. Do not alter shared routing/auth/data logic or operator UI.

### Phase 2 — implement structure and visuals

1. Refactor the landing page into the narrative above, preserving session-aware links, EN/BN switch, theme toggle, and privacy/account destinations.
2. Keep all user-visible copy localized in both English and Bengali. Bengali must be reviewed for natural meaning, not machine-shaped transliteration. Preserve `lang` semantics and test actual font shaping.
3. Create the map-led hero and connected report-to-verification story using approved/clearly illustrative assets. Give images useful alt text; mark purely decorative layers hidden from assistive technology.
4. Use existing token variables and Tailwind aliases. Any new map-specific visual token must be added to the existing shared source only if necessary and approved within landing scope; avoid inline arbitrary colors.
5. Implement motion with existing dependencies first. Use CSS/SVG transforms and opacity where possible. `prefers-reduced-motion` must remove parallax, line-draw, scroll reveal, and continuous movement while preserving all content.
6. Ensure the page's animated/illustrative map is explicitly described as illustrative and is never mistaken for current report data.

### Phase 3 — review and report

1. Review at widths 320, 375, 414, 768, and desktop. Check no horizontal scroll, Bengali clipping, wrapped tap labels, obscured content, or unreachable actions.
2. Review light, dark, and system themes; verify text, controls, focus, condition labels, and map art retain contrast and meaning.
3. Check keyboard order/focus, reduced motion, alt text, semantic headings, all navigation destinations, and signed-in/signed-out actions.
4. Check performance: avoid loading huge unoptimized map images, blocking animation libraries, and heavy WebGL on mobile. Lazy-load below-fold imagery and respect reduced data/performance where practical.
5. Report modified files, references actually consulted, asset provenance, behavior preserved, and any acceptance criteria not verified.

## Acceptance criteria

- The first viewport communicates Safeway's road-safety purpose and presents clear route/report actions.
- The page feels dynamic through a purposeful map-led visual system and controlled motion, not decorative effects alone.
- The report → review → verified map story is accurate and understandable without animation or color.
- Map imagery is approved/attributed or clearly schematic and explicitly illustrative; no fabricated incidents, counts, live status, route ETAs, or customer proof.
- English and Bengali versions are complete, natural, and readable at mobile sizes.
- Light and dark themes remain usable; motion respects reduced-motion and does not block reading.
- All links work, authentication requirements are clear, and existing routes, theme/language behavior, routing, and report workflows remain unchanged.
- No dead links, fake UI chrome, stock illustration, unnecessary dependency, generic bento mosaic, or unbounded motion is added.

## OpenCode execution brief

Implement this plan in the existing Safeway React app. The user explicitly wants a more dynamic, Colmez-inspired landing-page direction with map imagery/animation. Do not fall back to the earlier minimal redesign concept. Read root `DESIGN.md` and this entire plan first. Inspect actual routes, tokens, theme, language behavior, and asset provenance. Before edits, list files you will change. Use the reference for editorial energy and visual storytelling, not as a template. Preserve every existing product/auth/data behavior. Make the page work in English/Bengali, light/dark/system, mobile/desktop, keyboard navigation, and reduced motion. Then provide a concise implementation report and verification evidence.
