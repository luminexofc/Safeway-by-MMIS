import { HugeiconsIcon } from "@hugeicons/react";
import { MapPinIcon } from "@hugeicons/core-free-icons";
import { Link } from "react-router-dom";
import "./footer-with-four-column-links.css";

const COPY = {
  en: {
    description: "Road conditions for journeys across Bangladesh.",
    region: "Made for journeys across Bangladesh",
    routePlanner: "Open route planner",
    howItWorks: "How Safeway works",
    startReport: "Start a report",
    myReports: "My reports",
    dashboard: "Your dashboard",
    signIn: "Sign in",
    privacy: "Privacy policy",
    rights: "All rights reserved.",
    footerNote: "Better road information for the journeys ahead.",
    footerLabel: "Safeway footer",
    homeLabel: "Safeway home",
  },
  bn: {
    description: "বাংলাদেশজুড়ে যাত্রার সড়ক পরিস্থিতি।",
    region: "বাংলাদেশজুড়ে যাত্রার জন্য",
    routePlanner: "রুট পরিকল্পনা খুলুন",
    howItWorks: "সেফওয়ে যেভাবে কাজ করে",
    startReport: "রিপোর্ট শুরু করুন",
    myReports: "আমার রিপোর্ট",
    dashboard: "আপনার ড্যাশবোর্ড",
    signIn: "লগইন",
    privacy: "গোপনীয়তা নীতি",
    rights: "সর্বস্বত্ব সংরক্ষিত।",
    footerNote: "আগামীর যাত্রায় আরও ভালো সড়ক তথ্য।",
    footerLabel: "সেফওয়ে ফুটার",
    homeLabel: "সেফওয়ে হোম",
  },
};

export default function FooterWithFourColumnLinks({
  lang = "en",
  routePath = "/navigate",
  reportPath = "/report",
  reportsPath = "/my-reports",
  privacyPath = "/privacy",
  accountPath = "/login",
  isSignedIn = false,
  year = new Date().getFullYear(),
}) {
  const copy = COPY[lang] || COPY.en;

  return (
    <footer className="sw-footer" aria-label={copy.footerLabel}>
      <div className="sw-footer-inner">
        <div className="sw-footer-row">
          <div className="sw-footer-brand-column">
            <Link className="sw-footer-brand" to="/" aria-label={copy.homeLabel}>
              Safeway<span aria-hidden="true">.</span>
            </Link>
            <p className="sw-footer-description">{copy.description}</p>
            <span className="sw-footer-region">
              <HugeiconsIcon icon={MapPinIcon} size={15} strokeWidth={1.75} aria-hidden="true" />
              {copy.region}
            </span>
          </div>

          <nav className="sw-footer-links">
            <Link to={routePath}>{copy.routePlanner}</Link>
            <a href="#how-it-works">{copy.howItWorks}</a>
            <Link to={reportPath}>{copy.startReport}</Link>
            <Link to={reportsPath}>{copy.myReports}</Link>
            <Link to={accountPath}>{isSignedIn ? copy.dashboard : copy.signIn}</Link>
            <Link to={privacyPath}>{copy.privacy}</Link>
          </nav>
        </div>

        <div className="sw-footer-bottom">
          <p>© {year} Safeway. {copy.rights}</p>
          <p>{copy.footerNote}</p>
        </div>
      </div>
    </footer>
  );
}
