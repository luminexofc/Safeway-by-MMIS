# Safeway design system

Safeway is a civic road-safety service for people making real travel decisions
across Bangladesh. The interface should feel like a considered field guide:
clear in rain or sun, calm under pressure, and specific to roads and reports.

## Design read

- Audience: residents and riders in Bangladesh, on phones and desktop, using
  English or Bengali.
- Job: check road conditions, compare a route, report waterlogging, and follow
  the report through review.
- Voice: direct, practical, human. State what is known and how it is known.
- Dials: ENERGY 2 / RHYTHM 3 / MOTION 1.

## Structure

- Landing: Map / Diagram. The report-to-review-to-route relationship is the
  composition. Use product states only; no sample incidents or invented totals.
- Resident app: Map / Diagram. The map is the main working surface; route or
  report controls sit beside it on wide screens and in a reachable sheet on
  phones.
- Operator console: decision-led queue. Evidence and the available decision
  stay together; the operations log remains a separate record.
- Forms and history keep their natural task structure. Do not force every route
  into a dashboard, a card grid, or a marketing section sequence.

## Theme

The paper and ink lean toward rain-cooled green and blue. Deep rain-green is the
single action accent. Road-condition colors are functional data: green means
safe, amber means caution, red means danger or blocked. Pair every condition
color with a label and icon. Never use these colors for decoration, account
status, or general success and error states.

The token source is [`shared/design-tokens.css`](shared/design-tokens.css).
Components must use tokens and semantic Tailwind aliases rather than introduce
one-off colors.

## Typography

- Display: Bricolage Grotesque, 650–800, upright. Use for short headings.
- Interface and body: Noto Sans Bengali, 400–700. It covers Bengali and Latin
  UI text and remains legible at map-label sizes.
- Numerals: tabular figures in the interface face. Coordinates and IDs may use
  the system monospace stack only when alignment benefits the reader.
- Body text is at least 14 px; helper text targets 13 px only where necessary.
  Keep prose around 45–75 characters per line.

## Color and states

- Light mode is the default for daylight legibility. Dark and System remain
  available for night use and user preference.
- Teal marks actions, selected navigation, and keyboard focus. Keep it sparse.
- Road risk is communicated by a condition word, a relevant icon, and its
  condition color. Pending review is neutral and must not look like a road
  warning.
- Base surfaces are tinted, not pure white or black. Verify text and control
  contrast against WCAG AA before release.

## Shape and depth

- Controls: 8 px radius. Cards and map sheets: 14 px. Dialogs: 20 px.
- Most surfaces sit flat with a fine border. Use a restrained shadow only for
  menus, dialogs, and panels that overlap the map.
- A route trace and its segment markers are the product motif. They appear only
  when explaining a real route or road state. No decorative grid, glow, or
  ornamental traffic lights.

## Layout and navigation

- Keep a labeled desktop task rail for Map, Find route, Report road, and My
  reports. On mobile, provide the same destinations in a fixed bottom bar with
  safe-area padding and a clear text label for each icon.
- The operator console has its own review-focused navigation and never exposes
  operator actions to public users.
- Maps remain usable at 320 px and never hide essential controls behind a
  selected-report panel. Every map-only fact has a readable text alternative.
- Use the 4 px spacing scale and vary section spacing according to the task.

## Interaction and motion

- MOTION 1: hover, press, focus, and short state transitions only. No reveal on
  scroll, looping animation, or motion that competes with map reading.
- Focus appears immediately with a visible high-contrast ring. Interactive
  targets are at least 44 px where practical.
- Respect `prefers-reduced-motion`. Menus and sheets retain keyboard access,
  Escape behavior, and logical focus order.
- Geolocation is requested only after the person asks to use their location.
  Manual location selection remains available.

## Content and data integrity

- Verified waterlogging reports appear on the safety map. The route planner
  uses OpenStreetMap road geometry and does not automatically reroute around
  these reports. A pending report is clearly labeled and is not shown as a
  verified road condition.
- Do not invent incident pins, counts, testimonials, review-time estimates,
  update times, or claims. Show timestamps only when supplied by the data.
- Traffic and other blockage types are not presented as supported until the
  report model, operator workflow, and route calculation support them.
- Explain sign-in before a protected action. The map remains behind the current
  authentication boundary unless access policy is deliberately changed.
- Loading, empty, permission-denied, no-route, stale-data, and error states name
  the cause and give the next useful action.

## Shared product rules

- The resident client and restricted operator console share tokens, typography,
  theme behavior, and condition semantics.
- Preserve current routes, Appwrite integration, auth, submission, verification,
  audit, and routing behavior during visual redesign.
- English and Bengali copy must fit without clipping or wrapped action labels.
- Do not add a logo, photography, or illustration without a product need and
  approved source.
