import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useSession } from "../lib/session";
import "./landing.css";
import {
  landingRoutes, navLinks, featureCards, processSteps, quickLinks,
} from "./landing-copy";

/* =====================================================================
   SAFEWAY LANDING PAGE
   ---------------------------------------------------------------------
   Data (images, routes, copy) lives in landing-copy.js; styles live in
   landing.css. This file is just composition.
   Theme: the header uses your project's <ThemeToggle /> component. The page
   follows your app's global theme by watching the "dark" class on <html>.
   ===================================================================== */

/* ---------- Small helpers ---------- */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Read the app's global theme (adds/removes the "dark" class on <html>)
function readAppTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains("dark") || html.dataset.theme === "dark";
  return isDark ? "dark" : "light";
}

// Follows the global theme. It only READS it and never changes it.
function useAppTheme() {
  const [theme, setTheme] = useState(readAppTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readAppTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

// Internal paths use React Router <Link>; "#" or full URLs use a plain <a>
function SiteLink({ to, children, ...props }) {
  if (to.startsWith("/")) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

// Reveals elements with the class "sw-reveal" when they scroll into view
function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // No animation support or reduced motion: leave everything visible
    if (reduceMotion || !("IntersectionObserver" in window)) return undefined;

    root.classList.add("sw-anim");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    root.querySelectorAll(".sw-reveal").forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      root.classList.remove("sw-anim");
    };
  }, [rootRef]);
}

/* ---------- Icons (inline SVG, no extra packages) ---------- */
function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  switch (name) {
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M8.2 16.8 15.8 7.2M8.5 18h7" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v.7A6.5 6.5 0 0 1 18.5 10.5v3.2l1.7 2.5a1 1 0 0 1-.8 1.55H4.6a1 1 0 0 1-.8-1.55l1.7-2.5v-3.2A6.5 6.5 0 0 1 10.5 4.2v-.7A1.5 1.5 0 0 1 12 2Zm-2.2 17h4.4a2.2 2.2 0 0 1-4.4 0Z" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <circle cx="5.5" cy="10" r="2.2" />
          <circle cx="18.5" cy="10" r="2.2" />
          <path d="M6.5 19v-1a5.5 5.5 0 0 1 11 0v1M1.5 17.5v-.5a3.5 3.5 0 0 1 3.5-3.5M22.5 17.5v-.5a3.5 3.5 0 0 0-3.5-3.5" />
        </svg>
      );
    case "siren":
      return (
        <svg {...common}>
          <path d="M7 18v-6a5 5 0 0 1 10 0v6M5 21h14M4 18h16v3H4zM12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M2 12h2M20 12h2" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15.2 12 22 12 22s7.5-6.8 7.5-12.5A7.5 7.5 0 0 0 12 2Zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Zm-1.2 13.2-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3C16.7 2.3 15.7 2.2 14.6 2.2 12.2 2.2 10.5 3.700 10.500 6.400v2.100H8v3.400h2.500V21.800H14V11.900h2.600l.4-3.400H14Z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M5 4.500 19 19.500M19 4.500 5 19.500" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3.500" y="3.500" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="0.8" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M21.600 7.200a2.500 2.500 0 0 0-1.800-1.800C18.200 5 12 5 12 5s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 7.200C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 0 0 1.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800c.4-1.600.4-4.800.4-4.800s0-3.200-.4-4.800ZM10 15V9l5.200 3L10 15Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M4 9h3.500v11H4V9Zm1.750-5.500a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM10 9h3.300v1.500h.1c.5-.9 1.600-1.800 3.300-1.800 3.500 0 4.100 2.300 4.100 5.300V20h-3.500v-5.200c0-1.200 0-2.800-1.700-2.800s-2 1.300-2 2.700V20H10V9Z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------- Logo (location pin) ---------- */
function Logo() {
  return (
    <svg
      className="sw-logo-pin"
      width="34"
      height="38"
      viewBox="0 0 34 38"
      aria-hidden="true"
    >
      <path
        d="M17 1C8.700 1 2 7.600 2 15.800 2 26.500 17 37 17 37s15-10.500 15-21.200C32 7.600 25.300 1 17 1Z"
        fill="currentColor"
      />
      <circle cx="17" cy="15.500" r="6.500" fill="var(--sw-bg)" />
      <circle cx="17" cy="15.500" r="2.800" fill="currentColor" />
    </svg>
  );
}

/* ---------- Built-in SVG map for the hero ---------- */
function HeroMap() {
  return (
    <svg
      className="sw-map-svg"
      viewBox="0 0 520 320"
      role="img"
      aria-label="Map showing a blue route with waterlogged and blocked roads marked along the way"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Base, green areas and river */}
      <rect width="520" height="320" className="sw-map-ground" />
      <path d="M0 215 C40 195 90 210 120 250 L100 320 L0 320Z" className="sw-map-green" />
      <path d="M330 0 H520 V60 C470 70 420 40 330 0Z" className="sw-map-green" />
      <path d="M470 120 C500 110 520 125 520 150 V210 C495 200 470 170 470 120Z" className="sw-map-green" />
      <path d="M62 0 C95 70 40 120 75 190 C95 235 110 280 120 320" className="sw-map-water" fill="none" strokeWidth="26" strokeLinecap="round" />

      {/* Roads */}
      <g className="sw-map-roads" fill="none" strokeLinecap="round">
        <path d="M0 95 L520 80" strokeWidth="6" />
        <path d="M0 175 L520 190" strokeWidth="6" />
        <path d="M0 270 L520 255" strokeWidth="6" />
        <path d="M150 0 L170 320" strokeWidth="6" />
        <path d="M300 0 L285 320" strokeWidth="6" />
        <path d="M440 0 L455 320" strokeWidth="6" />
        <path d="M0 40 L240 140 L520 300" strokeWidth="4" />
        <path d="M200 0 L330 120 L520 140" strokeWidth="4" />
      </g>

      {/* Blue route */}
      <path
        d="M96 44 L180 58 L209 166 L288 178 L311 246 L412 256 L424 258"
        className="sw-map-route"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start marker */}
      <circle cx="96" cy="44" r="17" className="sw-map-start-ring" />
      <circle cx="96" cy="44" r="12" className="sw-map-start" />
      <circle cx="96" cy="44" r="4.500" fill="#fff" />

      {/* Destination marker */}
      <ellipse cx="424" cy="276" rx="14" ry="5" className="sw-map-dest-shadow" />
      <path
        d="M424 276C416 266 408 258 408 247a16 16 0 0 1 32 0c0 11-8 19-16 29Z"
        className="sw-map-dest"
      />
      <circle cx="424" cy="247" r="6" fill="#fff" />

      {/* Hazard: medium waterlogging (left) */}
      <rect x="43" y="98" width="92" height="40" rx="8" className="sw-map-label-amber" />
      <text x="89" y="115" textAnchor="middle" className="sw-map-label-text sw-dark-text">
        <tspan x="89" dy="0">Medium</tspan>
        <tspan x="89" dy="14">Waterlogging</tspan>
      </text>
      <circle cx="88" cy="150" r="8" className="sw-map-dot-amber" />

      {/* Hazard: blocked road (top right) */}
      <rect x="345" y="86" width="62" height="40" rx="8" className="sw-map-label-red" />
      <text x="376" y="103" textAnchor="middle" className="sw-map-label-text sw-light-text">
        <tspan x="376" dy="0">Blocked</tspan>
        <tspan x="376" dy="14">Road</tspan>
      </text>
      <circle cx="378" cy="138" r="8" className="sw-map-dot-red" />

      {/* Hazard: medium waterlogging (right) */}
      <rect x="388" y="163" width="92" height="40" rx="8" className="sw-map-label-amber" />
      <text x="434" y="180" textAnchor="middle" className="sw-map-label-text sw-dark-text">
        <tspan x="434" dy="0">Medium</tspan>
        <tspan x="434" dy="14">Waterlogging</tspan>
      </text>
      <circle cx="432" cy="217" r="8" className="sw-map-dot-amber" />

      {/* Hazard: waterlogged and blocked (bottom) */}
      <rect x="190" y="232" width="104" height="40" rx="8" className="sw-map-label-red" />
      <text x="242" y="249" textAnchor="middle" className="sw-map-label-text sw-light-text">
        <tspan x="242" dy="0">Waterlogging/</tspan>
        <tspan x="242" dy="14">Blocked Roads</tspan>
      </text>
      <path d="M205 300 L238 286" className="sw-map-hazard-line" strokeWidth="4" strokeLinecap="round" />
      <circle cx="243" cy="285" r="8" className="sw-map-dot-red" />
    </svg>
  );
}

/* =====================================================================
   MAIN COMPONENT
   ===================================================================== */
export default function Landing() {
  const rootRef = useRef(null);
  const theme = useAppTheme();
  const { user, loading: sessionLoading } = useSession();
  const [email, setEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState({
    type: "",
    text: "",
  });
  useScrollReveal(rootRef);

  // Newsletter: checks the email format only (no server is contacted)
  function handleNewsletterSubmit(event) {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      setNewsletterMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setNewsletterMessage({
        type: "error",
        text: "That email looks incorrect. Try name@example.com.",
      });
      return;
    }
    setNewsletterMessage({
      type: "success",
      text: "Email looks good. Newsletter sign-up is not connected to a server yet.",
    });
    setEmail("");
  }


  return (
    <div className="sw-landing" data-theme={theme} ref={rootRef}>

      {/* ============ HEADER ============ */}
      <header className="sw-header">
        <div className="sw-header-inner">
          <SiteLink className="sw-brand" to={landingRoutes.home} aria-label="Safeway home">
            <Logo />
            <span>Safeway</span>
          </SiteLink>

          <nav className="sw-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <SiteLink
                key={link.label}
                className={`sw-nav-link${link.active ? " is-active" : ""}`}
                to={link.href}
                aria-current={link.active ? "page" : undefined}
              >
                {link.label}
              </SiteLink>
            ))}
          </nav>

          <div className="sw-header-actions">
            {!sessionLoading && (user ? (
              <>
                <span className="sw-signed-in">
                  Signed in{user.name ? ` · ${user.name.split(" ")[0]}` : ""}
                </span>
                <SiteLink className="sw-btn sw-btn-sm sw-btn-dark" to={landingRoutes.alerts}>
                  Open dashboard
                </SiteLink>
              </>
            ) : (
              <>
                <SiteLink className="sw-btn sw-btn-sm sw-btn-ghost" to={landingRoutes.login}>
                  Login
                </SiteLink>
                <SiteLink className="sw-btn sw-btn-sm sw-btn-dark" to={landingRoutes.register}>
                  Register
                </SiteLink>
              </>
            ))}
            <span className="sw-theme-slot">
              <ThemeToggle />
            </span>
          </div>
        </div>
      </header>

      <main className="sw-page">
        {/* ============ A. HERO ============ */}
        <section className="sw-hero" aria-labelledby="sw-hero-title">
          <div className="sw-hero-map">
            <HeroMap />
          </div>

          <div className="sw-hero-content">
            <h1 id="sw-hero-title" className="sw-hero-title">
              See the road before you take it.
            </h1>
            <div className="sw-safety-rule" aria-hidden="true">
              <span className="sw-safety-rule-seg sw-safety-rule-seg--safe" />
              <span className="sw-safety-rule-seg sw-safety-rule-seg--caution" />
              <span className="sw-safety-rule-seg sw-safety-rule-seg--avoid" />
            </div>
            <p className="sw-hero-text">
              Safeway tracks waterlogged and blocked roads across Bangladesh and
              routes you around them. Riders file reports, a team verifies them,
              and only verified roads change anyone's route.
            </p>
            <div className="sw-hero-buttons">
              <SiteLink className="sw-btn sw-btn-dark" to={landingRoutes.map}>
                <Icon name="route" size={20} />
                Check Routes
              </SiteLink>
              <SiteLink className="sw-btn sw-btn-soft" to={landingRoutes.report}>
                <Icon name="bell" size={20} />
                Report an alert
                <Icon name="arrow" size={16} />
              </SiteLink>
            </div>
          </div>
        </section>

        {/* ============ B. WHAT THE APP DOES ============ */}
        <section className="sw-features" aria-labelledby="sw-features-title">
          <h2 id="sw-features-title" className="sw-section-title sw-reveal">
            One map, reported by riders
          </h2>
          <p className="sw-section-text sw-reveal">
            Safeway keeps one nationwide picture of waterlogging in Bangladesh.
            You plan a route on it, add to it, and track your own reports here.
          </p>

          <div className="sw-feature-list">
            {featureCards.map((card, index) => (
              <article
                key={card.id}
                className="sw-feature-card sw-reveal"
                style={{ "--sw-delay": `${index * 140}ms` }}
              >
                <div className={`sw-feature-icon sw-feature-icon--${card.color}`}>
                  <Icon name={card.icon} size={36} />
                </div>
                <div className="sw-feature-body">
                  <h3 className="sw-feature-title">{card.title}</h3>
                  <p className="sw-feature-text">{card.text}</p>
                </div>
                <SiteLink
                  className="sw-round-arrow"
                  to={card.href}
                  aria-label={`Open ${card.title}`}
                >
                  <Icon name="arrow" size={18} />
                </SiteLink>
              </article>
            ))}
          </div>
        </section>

        {/* ============ C. HOW A REPORT MOVES ============ */}
        <section className="sw-features" aria-labelledby="sw-process-title">
          <h2 id="sw-process-title" className="sw-section-title sw-reveal">
            How a report moves
          </h2>
          <p className="sw-section-text sw-reveal">
            Only verified reports change the map. False ones get discarded, and
            the reporter is warned.
          </p>

          <div className="sw-feature-list">
            {processSteps.map((step, index) => (
              <article
                key={step.id}
                className="sw-feature-card sw-reveal"
                style={{ "--sw-delay": `${index * 140}ms` }}
              >
                <div className="sw-feature-icon sw-feature-icon--teal">
                  <span className="sw-feature-step" aria-hidden="true">{step.n}</span>
                </div>
                <div className="sw-feature-body">
                  <h3 className="sw-feature-title">{step.title}</h3>
                  <p className="sw-feature-text">{step.text}</p>
                </div>
                <SiteLink
                  className="sw-round-arrow"
                  to={step.href}
                  aria-label={`${step.title}: open`}
                >
                  <Icon name="arrow" size={18} />
                </SiteLink>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ============ D. CALL TO ACTION ============ */}
      <section className="sw-cta sw-reveal" aria-labelledby="sw-cta-title">
        <div className="sw-cta-content">
          <h2 id="sw-cta-title" className="sw-cta-title">
            Every journey deserves a safer route
          </h2>
          <p className="sw-cta-text">
            Check the map before you leave. If a road is waterlogged, you will
            see it, and your route will bend around it.
          </p>
          <div className="sw-cta-buttons">
            <SiteLink className="sw-btn sw-btn-white" to={landingRoutes.map}>
              <Icon name="route" size={20} />
              Explore Route
            </SiteLink>
            <SiteLink className="sw-btn sw-btn-outline" to={landingRoutes.alerts}>
              <Icon name="shield" size={20} />
              Open verified map
            </SiteLink>
          </div>
        </div>
      </section>

      {/* ============ E. FOOTER ============ */}
      <footer className="sw-footer">
        <div className="sw-footer-grid">
          <div className="sw-footer-brand">
            <SiteLink className="sw-brand" to={landingRoutes.home} aria-label="Safeway home">
              <Logo />
              <span>Safeway</span>
            </SiteLink>
            <p className="sw-footer-tagline">Safer roads across Bangladesh.</p>
          </div>

          <nav className="sw-footer-col" aria-label="Quick links">
            <h4 className="sw-footer-heading">Quick Links</h4>
            <ul>
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <SiteLink to={link.href}>{link.label}</SiteLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sw-footer-col sw-newsletter">
            <h4 className="sw-footer-heading">Stay Informed</h4>
            <p>Get the latest updates and alerts in your area.</p>
            <form className="sw-newsletter-form" onSubmit={handleNewsletterSubmit} noValidate>
              <label className="sw-visually-hidden" htmlFor="sw-newsletter-email">
                Email address
              </label>
              <input
                id="sw-newsletter-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby="sw-newsletter-message"
                autoComplete="email"
              />
              <button type="submit" aria-label="Subscribe to updates">
                <Icon name="arrow" size={16} />
              </button>
            </form>
            <p
              id="sw-newsletter-message"
              className={`sw-newsletter-message sw-newsletter-message--${newsletterMessage.type}`}
              role="status"
            >
              {newsletterMessage.text}
            </p>
          </div>
        </div>

        <div className="sw-footer-bottom">
          <span>© 2026 Safeway. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

/* =====================================================================
   CSS (kept inside this file, scoped under .sw-landing)
   ===================================================================== */
