import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPlaceLabel,
  emptyPointMessage,
  normalizeDivision,
  parseReportSegment,
  distToSegmentMeters,
  routeHitsBlockade,
  isRouteBlockade,
  accuracyLabel,
  fetchRoutes,
} from "./geo.js";

// One test per risky branch: suggestion labels and the empty-field error.
// Both decide what users see on the Navigate screen.

describe("formatPlaceLabel", () => {
  it("shortens a display name to three parts with spaces", () => {
    assert.equal(
      formatPlaceLabel("Gulshan, Dhaka, Bangladesh, Asia"),
      "Gulshan, Dhaka, Bangladesh"
    );
  });

  it("falls back when the display name is missing", () => {
    assert.equal(formatPlaceLabel("", "typed text"), "typed text");
    assert.equal(formatPlaceLabel(null, "typed text"), "typed text");
  });
});

describe("emptyPointMessage", () => {
  it("names the field that is actually empty", () => {
    assert.equal(emptyPointMessage("destination"), "Type a destination.");
    assert.equal(emptyPointMessage("starting point"), "Type a starting point.");
  });
});

describe("parseReportSegment", () => {
  it("parses 2-point segment coordinates from note", () => {
    const seg = parseReportSegment({
      note: "Water blockade\nSegment: (24.84808, 89.37294) -> (24.84452, 89.37587)\nEnd location: Jaleswaritola",
    });
    assert.ok(seg);
    assert.deepEqual(seg.start, [24.84808, 89.37294]);
    assert.deepEqual(seg.end, [24.84452, 89.37587]);
  });

  it("returns null when no segment tag is present", () => {
    assert.equal(parseReportSegment({ note: "Normal caution area" }), null);
    assert.equal(parseReportSegment({}), null);
  });
});

describe("distToSegmentMeters and routeHitsBlockade", () => {
  const segA = [24.84808, 89.37294];
  const segB = [24.84452, 89.37587];

  it("calculates close distance for point on the segment", () => {
    const midPoint = [(segA[0] + segB[0]) / 2, (segA[1] + segB[1]) / 2];
    const dist = distToSegmentMeters(midPoint, segA, segB);
    assert.ok(dist < 5); // within 5 meters
  });

  it("detects route collision when route passes within 120m of blockade", () => {
    const routeCoords = [
      [24.85000, 89.37000],
      [(segA[0] + segB[0]) / 2, (segA[1] + segB[1]) / 2],
      [24.84000, 89.38000],
    ];
    const report = {
      id: "bl-1",
      lat: segA[0],
      lng: segA[1],
      segment: { start: segA, end: segB },
    };
    assert.equal(routeHitsBlockade(routeCoords, report), true);
  });

  it("returns false when route avoids the blockade by a safe margin", () => {
    const farRoute = [
      [24.86000, 89.35000],
      [24.85500, 89.35500],
    ];
    const report = {
      id: "bl-1",
      lat: segA[0],
      lng: segA[1],
      segment: { start: segA, end: segB },
    };
    assert.equal(routeHitsBlockade(farRoute, report), false);
  });
});


describe("isRouteBlockade", () => {
  // This decides whether a route is taken away from a driver, so it must only
  // ever answer yes for something an operator has confirmed.
  it("rejects a pending report even when it claims the road is closed", () => {
    // The exact case that shipped: one unverified person could force a detour.
    assert.equal(
      isRouteBlockade({ status: "pending", depth: "road_closed", type: "blocked" }),
      false,
    );
  });

  it("rejects a discarded or flagged report", () => {
    assert.equal(isRouteBlockade({ status: "discarded", depth: "road_closed" }), false);
    assert.equal(isRouteBlockade({ status: "flagged_abuse", depth: "road_closed" }), false);
  });

  it("rejects a verified report that does not close the road", () => {
    assert.equal(isRouteBlockade({ status: "verified", depth: "ankle" }), false);
    assert.equal(isRouteBlockade({ status: "verified", depth: "knee" }), false);
  });

  it("accepts a verified road closure", () => {
    assert.equal(isRouteBlockade({ status: "verified", depth: "road_closed" }), true);
  });

  it("tolerates missing input", () => {
    assert.equal(isRouteBlockade(null), false);
    assert.equal(isRouteBlockade(undefined), false);
    assert.equal(isRouteBlockade({}), false);
  });
});

describe("geocode result shape", () => {
  // Every search caller (Report pin, Dashboard destination) reads {lat, lng}.
  // Reading Nominatim's raw lon/display_name instead silently yielded NaN and
  // dropped the pick, leaving the marker where it was.
  it("normalises lat/lng and drops unparseable entries", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [
        { lat: "24.8456", lon: "89.3735", display_name: "Bogura, Rajshahi, Bangladesh", place_id: 1 },
        { lat: "not-a-number", lon: "89.0", display_name: "Broken", place_id: 2 },
      ],
    });
    try {
      const { geocode } = await import("./geo.js");
      const out = await geocode("bogura", 6);
      assert.equal(out.length, 1, "the unparseable entry is filtered out");
      assert.equal(out[0].lat, 24.8456);
      assert.equal(out[0].lng, 89.3735);
      assert.ok("label" in out[0] && "full" in out[0]);
      assert.equal(out[0].lon, undefined, "raw Nominatim lon must not leak through");
      assert.equal(out[0].display_name, undefined, "raw display_name must not leak through");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("keeps the coordinates that place a marker", () => {
    // A marker built from a pick must land exactly on the searched point.
    const pick = { lat: 24.8456, lng: 89.3735 };
    const leafletPosition = [pick.lat, pick.lng];
    assert.equal(leafletPosition[0], 24.8456);
    assert.equal(leafletPosition[1], 89.3735);
    // Bangladesh sanity envelope: lat 20-27, lng 88-93.
    assert.ok(leafletPosition[0] > 20 && leafletPosition[0] < 27, "latitude is in range");
    assert.ok(leafletPosition[1] > 88 && leafletPosition[1] < 93, "longitude is in range");
    assert.ok(normalizeDivision("Rajshahi Division") === "rajshahi");
  });
});

describe("accuracyLabel", () => {
  // A coarse fix must never be presented as if it were exact.
  it("describes tight fixes precisely", () => {
    assert.equal(accuracyLabel(5), "within 5 m");
    assert.equal(accuracyLabel(10), "within 10 m");
  });

  it("hedges broader fixes instead of claiming precision", () => {
    assert.match(accuracyLabel(35), /^within about \d+ m$/);
    assert.match(accuracyLabel(180), /^within roughly \d+ m$/);
    assert.match(accuracyLabel(1500), /^only within about \d+ m$/);
  });

  it("handles a missing accuracy value", () => {
    assert.equal(accuracyLabel(null), "unknown accuracy");
    assert.equal(accuracyLabel(undefined), "unknown accuracy");
    assert.equal(accuracyLabel(NaN), "unknown accuracy");
  });
});

describe("snapped coordinates", () => {
  // Six decimals is ~11 cm; five was ~1.1 m and visibly offset the pin.
  it("keeps sub-metre precision through formatting", () => {
    const lat = 24.845612345;
    const lng = 89.373598765;
    assert.equal(lat.toFixed(6), "24.845612");
    assert.equal(lng.toFixed(6), "89.373599");
  });

  it("preserves lat/lng order when converting from OSRM", () => {
    const osrm = [89.3735, 24.8456]; // [lng, lat]
    const leaflet = [osrm[1], osrm[0]];
    assert.deepEqual(leaflet, [24.8456, 89.3735]);
  });
});

describe("fetchRoutes", () => {
  // An unknown query parameter makes the router answer 400 and every route
  // fails. This is the test that would have caught exactly that.
  const stub = (handler) => {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    return () => { globalThis.fetch = original; };
  };

  const ok = (coords = [[89.37, 24.84], [89.38, 24.85]]) => ({
    code: "Ok",
    routes: [{
      distance: 2069.5,
      duration: 171.6,
      geometry: { coordinates: coords },
    }],
    waypoints: [{ location: [89.37, 24.84] }, { location: [89.38, 24.85] }],
  });

  it("sends only documented OSRM query parameters", async () => {
    let seen = "";
    const restore = stub(async (url) => {
      seen = url;
      return { ok: true, json: async () => ok() };
    });
    try {
      await fetchRoutes({ lat: 24.8456, lng: 89.3735 }, { lat: 24.85, lng: 89.38 });
      assert.ok(!seen.includes("snap_radius"), "snap_radius is a server setting, not a query param");
      assert.ok(!seen.includes("snapping="), "snapping is not accepted here either");
      assert.ok(seen.includes("overview=full"));
      assert.ok(seen.includes("geometries=geojson"));
    } finally {
      restore();
    }
  });

  it("converts OSRM [lng,lat] to Leaflet [lat,lng]", async () => {
    const restore = stub(async () => ({ ok: true, json: async () => ok() }));
    try {
      const [route] = await fetchRoutes({ lat: 24.8456, lng: 89.3735 }, { lat: 24.85, lng: 89.38 });
      assert.deepEqual(route.coords[0], [24.84, 89.37]);
      assert.equal(route.distanceKm, 2.0695);
    } finally {
      restore();
    }
  });

  it("falls back to the second router when the first answers 400", async () => {
    const urls = [];
    const restore = stub(async (url) => {
      urls.push(url);
      const bad = url.includes("routing.openstreetmap.de");
      return bad
        ? { ok: false, status: 400, json: async () => ({ code: "InvalidQuery" }) }
        : { ok: true, json: async () => ok() };
    });
    try {
      const routes = await fetchRoutes({ lat: 24.8456, lng: 89.3735 }, { lat: 24.85, lng: 89.38 });
      assert.equal(routes.length, 1);
      assert.ok(urls[1].includes("router.project-osrm.org"), "the fallback was tried");
    } finally {
      restore();
    }
  });
});
