import { Link } from "react-router-dom";
import { ArrowUpRight, FilePlus2, Map } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import ThemeToggle from "../components/ThemeToggle";
import HowItWorksSectionWithZigzagTimeline from "@/components/wensity/blocks/how-it-works-section-with-zigzag-timeline";
import { useSession } from "../lib/session";
import { setLang, useLang } from "../lib/lang";
import "./landing.css";

const COPY = {
  en: {
    map: "Road map", report: "Report waterlogging", reports: "My reports",
    signIn: "Sign in", account: "Open Safeway",
    title: "Before you go, check the road.",
    intro: "Check verified waterlogging reports on the safety map. Add a report when a road is difficult to pass. Reports are reviewed before they appear as road conditions.",
    check: "Check a route", file: "Report a road",
    access: "A Safeway account is required to view the map and submit reports.",
    flowTitle: "From a road report to the safety map",
    flowIntro: "A report appears as a road condition only after an operator verifies it.",
    flowEyebrow: "HOW IT WORKS",
    flowStep: "STEP",
    flowOutcome: "Review outcome",
    filed: "Report filed", filedBody: "Your location and road details enter the review queue.",
    review: "Team review", reviewBody: "An operator checks the report and its evidence.",
    verified: "Verified", verifiedBody: "The report appears on the safety map for people to review.",
    discarded: "Not verified", discardedBody: "The report does not appear as a road condition on the map.",
    primary: "Open the route planner", primaryBody: "Set an origin and destination, then compare road-network route estimates.",
    secondary: "Add a road report", secondaryBody: "Place a pin, describe the water depth, and attach a photo if you have one.",
    browse: "Open route planner", contribute: "Start a report", language: "Switch language",
    footer: "Road conditions for journeys across Bangladesh.",
  },
  bn: {
    map: "সড়কের মানচিত্র", report: "জলাবদ্ধতা জানান", reports: "আমার রিপোর্ট",
    signIn: "লগইন", account: "সেফওয়ে খুলুন",
    title: "বের হওয়ার আগে সড়ক দেখুন।",
    intro: "নিরাপত্তা মানচিত্রে যাচাইকৃত জলাবদ্ধতার রিপোর্ট দেখুন। কোনো সড়ক চলাচলের অনুপযোগী হলে জানান। সড়কের অবস্থা হিসেবে দেখানোর আগে রিপোর্ট যাচাই করা হয়।",
    check: "রুট দেখুন", file: "সড়ক রিপোর্ট করুন",
    access: "মানচিত্র দেখতে ও রিপোর্ট জমা দিতে সেফওয়ে অ্যাকাউন্ট প্রয়োজন।",
    flowTitle: "সড়ক রিপোর্ট থেকে নিরাপত্তা মানচিত্রে",
    flowIntro: "অপারেটর যাচাই করার পরেই রিপোর্টটি সড়কের অবস্থা হিসেবে দেখায়।",
    flowEyebrow: "যেভাবে কাজ করে",
    flowStep: "ধাপ",
    flowOutcome: "যাচাইয়ের ফলাফল",
    filed: "রিপোর্ট জমা", filedBody: "আপনার অবস্থান ও সড়কের তথ্য যাচাইয়ের সারিতে যায়।",
    review: "যাচাই চলছে", reviewBody: "একজন অপারেটর রিপোর্ট ও প্রমাণ দেখেন।",
    verified: "যাচাইকৃত", verifiedBody: "যাত্রীরা দেখার জন্য রিপোর্টটি নিরাপত্তা মানচিত্রে দেখায়।",
    discarded: "যাচাই হয়নি", discardedBody: "রিপোর্টটি মানচিত্রে সড়কের অবস্থা হিসেবে দেখায় না।",
    primary: "রুট পরিকল্পনা করুন", primaryBody: "শুরু ও গন্তব্য দিয়ে সড়ক নেটওয়ার্কের রুটের হিসাব তুলনা করুন।",
    secondary: "সড়ক রিপোর্ট দিন", secondaryBody: "পিন দিন, পানির গভীরতা জানান, চাইলে ছবি যুক্ত করুন।",
    browse: "রুট পরিকল্পনা খুলুন", contribute: "রিপোর্ট শুরু করুন", language: "ভাষা বদলান",
    footer: "বাংলাদেশজুড়ে যাত্রার সড়ক পরিস্থিতি।",
  },
};

function Brand() {
  return <Link className="sw-brand" to="/" aria-label="Safeway home">Safeway<span aria-hidden="true">.</span></Link>;
}

export default function Landing() {
  const [lang] = useLang();
  const t = COPY[lang] || COPY.en;
  const { user, loading } = useSession();
  const reduceMotion = useReducedMotion();
  const routePath = user ? "/navigate" : "/login";
  const reportPath = user ? "/report" : "/login";
  const enter = (delay = 0) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div className="sw-landing" lang={lang}>
      <header className="sw-header">
        <div className="sw-header-inner">
          <Brand />
          <nav className="sw-nav" aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}>
            <Link to={routePath}>{t.map}</Link>
            <Link to={reportPath}>{t.report}</Link>
            {user && <Link to="/my-reports">{t.reports}</Link>}
          </nav>
          <div className="sw-header-actions">
            <button className="sw-language" type="button" onClick={() => setLang(lang === "en" ? "bn" : "en")} aria-label={t.language}>
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <ThemeToggle />
            {!loading && <Link className="sw-account-link" to={user ? "/dashboard" : "/login"}>{user ? t.account : t.signIn}</Link>}
          </div>
        </div>
      </header>

      <main>
        <section className="sw-hero" aria-labelledby="sw-hero-title">
          <div className="sw-hero-video" aria-hidden="true">
            <video className="sw-hero-video-light" src="/videos/landing-page.mp4" muted loop autoPlay playsInline preload="auto" />
            <video className="sw-hero-video-dark" src="/videos/for-dark-theme.mp4" muted loop autoPlay playsInline preload="auto" />
          </div>
          <motion.div className="sw-hero-copy" {...enter()}>
            <h1 id="sw-hero-title">{t.title}</h1>
            <p>{t.intro}</p>
            <div className="sw-hero-actions">
              <Link className="sw-action sw-action-primary" to={routePath}><Map size={18} aria-hidden="true" />{t.check}</Link>
              <Link className="sw-action sw-action-secondary" to={reportPath}><FilePlus2 size={18} aria-hidden="true" />{t.file}</Link>
            </div>
            {!user && <p className="sw-access-note">{t.access}</p>}
          </motion.div>

        </section>

        <section className="sw-hero-details">
          <motion.div {...enter(0.08)}>
            <HowItWorksSectionWithZigzagTimeline
              eyebrow={t.flowEyebrow}
              title={t.flowTitle}
              description={t.flowIntro}
              stepLabel={t.flowStep}
              outcomeLabel={t.flowOutcome}
              steps={[
                { title: t.filed, description: t.filedBody },
                { title: t.review, description: t.reviewBody },
              ]}
              outcomes={[
                { title: t.verified, description: t.verifiedBody, status: "success" },
                { title: t.discarded, description: t.discardedBody, status: "neutral" },
              ]}
            />
          </motion.div>
        </section>

        <motion.section className="sw-task-section" aria-label={lang === "bn" ? "সেবা ব্যবহার করুন" : "Use Safeway"} {...enter(0.14)}>
          <Link className="sw-task sw-task-route" to={routePath}>
            <span className="sw-task-icon"><Map size={20} aria-hidden="true" /></span>
            <span><strong>{t.primary}</strong><small>{t.primaryBody}</small></span>
            <ArrowUpRight className="sw-task-arrow" size={18} aria-hidden="true" />
          </Link>
          <Link className="sw-task" to={reportPath}>
            <span className="sw-task-icon"><FilePlus2 size={20} aria-hidden="true" /></span>
            <span><strong>{t.secondary}</strong><small>{t.secondaryBody}</small></span>
            <ArrowUpRight className="sw-task-arrow" size={18} aria-hidden="true" />
          </Link>
        </motion.section>
      </main>

      <footer className="sw-footer">
        <Brand />
        <span>{t.footer}</span>
        <div><Link to={routePath}>{t.browse}</Link><Link to={reportPath}>{t.contribute}</Link><Link to="/privacy">Privacy policy</Link></div>
      </footer>
    </div>
  );
}
