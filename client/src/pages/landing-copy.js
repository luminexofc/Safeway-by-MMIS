// Landing page data. Routes and copy live here so the page component stays
// about layout. Every link points at a route that exists; there are no
// placeholder destinations.

/* ---------- ROUTES (edit these to match your router) ---------- */
// Normal links are used on purpose, so this file works with any router
// setup and needs no extra imports. Replace the paths with your real ones.
export const landingRoutes = {
  home: "/",
  login: "/login",
  register: "/signup",
  map: "/navigate",
  report: "/report",
  alerts: "/dashboard", // verified alerts live on the map
  trackReport: "/my-reports",
  thresholds: "/settings",
  communityReports: "/dashboard",
};

export const navLinks = [
  { label: "Home", href: landingRoutes.home, active: true },
  { label: "Track Report", href: landingRoutes.trackReport },
  { label: "Thresholds", href: landingRoutes.thresholds },
];

export const featureCards = [
  {
    id: "map",
    title: "Interactive road map",
    color: "blue",
    icon: "map",
    href: landingRoutes.map,
    text: "Plan a route across Bangladesh with live open map data and types. Waterlogged segments stay visible, never hidden.",
  },
  {
    id: "report",
    title: "Report in three steps",
    color: "teal",
    icon: "bell",
    href: landingRoutes.report,
    text: "Drop a pin, add a photo and depth, and submit. Every report goes to the verification team before it updates anyone's map.",
  },
  {
    id: "alerts",
    title: "Verified alerts",
    color: "red",
    icon: "shield",
    href: landingRoutes.alerts,
    text: "Roads turn yellow or red only when a report is verified. Unverified reports never change routing.",
  },
];

/* ---------- How a report moves (real process, not sample data) ---------- */
export const processSteps = [
  {
    id: "step-1",
    n: "1",
    title: "Drop the pin",
    text: "The pin starts at your GPS position. Drag it to the exact spot if you need to.",
    href: landingRoutes.report,
  },
  {
    id: "step-2",
    n: "2",
    title: "Add depth and a photo",
    text: "Pick ankle-deep, knee-deep, waist-deep or road closed. A photo against a landmark verifies fastest.",
    href: landingRoutes.report,
  },
  {
    id: "step-3",
    n: "3",
    title: "Verification moves the map",
    text: "The team reviews in the order received. Verified roads turn yellow or red on every rider's map.",
    href: landingRoutes.alerts,
  },
];

export const quickLinks = [
  { label: "Home", href: landingRoutes.home },
  { label: "Track Report", href: landingRoutes.trackReport },
  { label: "Thresholds", href: landingRoutes.thresholds },
  { label: "Verified Alerts", href: landingRoutes.alerts },
];
