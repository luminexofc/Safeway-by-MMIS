import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileAddIcon, MapsIcon, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "../../../shared/theme";
import ThemeToggle from "../components/ThemeToggle";
import HowItWorksSectionWithZigzagTimeline from "@/components/wensity/blocks/how-it-works-section-with-zigzag-timeline";
import FaqScrollAccordion from "@/components/wensity/blocks/faq-scroll-accordion";
import FooterWithFourColumnLinks from "@/components/wensity/blocks/footer-with-four-column-links";
import { useSession } from "../lib/session";
import { setLang, useLang } from "../lib/lang";
import SignInPrompt from "../components/auth/SignInPrompt";
import "./landing.css";

const COPY = {
  en: {
    map: "Road map", mapShort: "Map", report: "Report waterlogging", reports: "My reports",
    signIn: "Sign in", account: "Open Safeway",
    title: "Before you go, check the road.",
    intro: "Check verified waterlogging reports on the safety map. Add a report when a road is difficult to pass. Reports are reviewed before they appear as road conditions.",
    check: "Check a route", file: "Report a road",
    access: "The map is open to everyone. A Safeway account is only needed to report a road or follow your reports.",
    openMap: "Open the map",
    flowTitle: "From a road report to the safety map",
    flowIntro: "A report appears as a road condition only after an operator verifies it.",
    flowStep: "STEP",
    flowOutcome: "Review outcome",
    filed: "Report filed", filedBody: "Your location and road details enter the review queue.",
    review: "Team review", reviewBody: "An operator checks the report and its evidence.",
    verified: "Verified", verifiedBody: "The report appears on the safety map for people to review.",
    discarded: "Not verified", discardedBody: "The report does not appear as a road condition on the map.",
    language: "Switch language",
    pauseVideo: "Pause background video", playVideo: "Play background video",
    promptTitle: "Sign in to report a road",
    promptBody: "Reports are tied to a real account so the verification team can follow up. Browsing the map stays free.",
  },
  bn: {
    map: "সড়কের মানচিত্র", mapShort: "মানচিত্র", report: "জলাবদ্ধতা জানান", reports: "আমার রিপোর্ট",
    signIn: "লগইন", account: "সেফওয়ে খুলুন",
    title: "বের হওয়ার আগে সড়ক দেখুন।",
    intro: "নিরাপত্তা মানচিত্রে যাচাইকৃত জলাবদ্ধতার রিপোর্ট দেখুন। কোনো সড়ক চলাচলের অনুপযোগী হলে জানান। সড়কের অবস্থা হিসেবে দেখানোর আগে রিপোর্ট যাচাই করা হয়।",
    check: "রুট দেখুন", file: "সড়ক রিপোর্ট করুন",
    access: "মানচিত্র সবার জন্য খোলা। সড়ক রিপোর্ট করতে বা নিজের রিপোর্ট দেখতে সেফওয়ে অ্যাকাউন্ট দরকার।",
    openMap: "মানচিত্র খুলুন",
    flowTitle: "সড়ক রিপোর্ট থেকে নিরাপত্তা মানচিত্রে",
    flowIntro: "অপারেটর যাচাই করার পরেই রিপোর্টটি সড়কের অবস্থা হিসেবে দেখায়।",
    flowStep: "ধাপ",
    flowOutcome: "যাচাইয়ের ফলাফল",
    filed: "রিপোর্ট জমা", filedBody: "আপনার অবস্থান ও সড়কের তথ্য যাচাইয়ের সারিতে যায়।",
    review: "যাচাই চলছে", reviewBody: "একজন অপারেটর রিপোর্ট ও প্রমাণ দেখেন।",
    verified: "যাচাইকৃত", verifiedBody: "যাত্রীরা দেখার জন্য রিপোর্টটি নিরাপত্তা মানচিত্রে দেখায়।",
    discarded: "যাচাই হয়নি", discardedBody: "রিপোর্টটি মানচিত্রে সড়কের অবস্থা হিসেবে দেখায় না।",
    language: "ভাষা বদলান",
    pauseVideo: "পেছনের ভিডিও থামান", playVideo: "পেছনের ভিডিও চালান",
    promptTitle: "সড়ক রিপোর্ট করতে লগইন করুন",
    promptBody: "রিপোর্ট একটি প্রকৃত অ্যাকাউন্টের সাথে যুক্ত থাকে, যাতে যাচাই দল যোগাযোগ করতে পারে। মানচিত্র দেখা সবার জন্য উন্মুক্ত।",
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
  const { resolved } = useTheme();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(!reduceMotion);
  // A guest pressing the report actions gets the sign-in prompt here rather
  // than being bounced to a login screen that discards where they were going.
  const [prompting, setPrompting] = useState(false);
  const videoSrc = resolved === "dark" ? "/videos/for-dark-theme.mp4" : "/videos/landing-page.mp4";
  // The map is public; only the two report actions need an account, and they
  // carry their destination so sign-in returns the person to that task.
  const mapPath = "/map";
  const reportPath = "/report";
  const reportsPath = "/my-reports";
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, videoSrc]);

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
            {user && <Link to={reportsPath}>{t.reports}</Link>}
            {user
              ? <Link to={reportPath}>{t.report}</Link>
              : <button type="button" className="sw-nav-button" onClick={() => setPrompting(true)}>{t.report}</button>}
          </nav>
          <div className="sw-header-actions">
            <button className="sw-language" type="button" onClick={() => setLang(lang === "en" ? "bn" : "en")} aria-label={t.language}>
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <ThemeToggle />
            <Link className="sw-map-button" to={mapPath} aria-label={t.map}>
              <HugeiconsIcon icon={MapsIcon} size={17} strokeWidth={2} aria-hidden="true" />
              <span className="sw-map-button-long">{t.map}</span>
              <span className="sw-map-button-short">{t.mapShort}</span>
            </Link>
            {!loading && <Link className="sw-account-link" to={user ? "/dashboard" : "/login"}>{user ? t.account : t.signIn}</Link>}
          </div>
        </div>
      </header>

      <main>
        <section className="sw-hero" aria-labelledby="sw-hero-title">
          <div className="sw-hero-video" aria-hidden="true">
            <video key={videoSrc} ref={videoRef} src={videoSrc} muted loop playsInline preload="metadata" />
          </div>
          <motion.div className="sw-hero-copy" {...enter()}>
            <h1 id="sw-hero-title">{t.title}</h1>
            <p>{t.intro}</p>
            <div className="sw-hero-actions">
              <Link className="sw-action sw-action-primary" to={mapPath}><HugeiconsIcon icon={MapsIcon} size={18} strokeWidth={1.75} aria-hidden="true" />{t.openMap}</Link>
              {user ? (
                <Link className="sw-action sw-action-secondary" to={reportPath}><HugeiconsIcon icon={FileAddIcon} size={18} strokeWidth={1.75} aria-hidden="true" />{t.file}</Link>
              ) : (
                <button type="button" className="sw-action sw-action-secondary" onClick={() => setPrompting(true)}>
                  <HugeiconsIcon icon={FileAddIcon} size={18} strokeWidth={1.75} aria-hidden="true" />{t.file}
                </button>
              )}
            </div>
            {!user && <p className="sw-access-note">{t.access}</p>}
          </motion.div>
          <button
            type="button"
            className="sw-hero-media-toggle"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? t.pauseVideo : t.playVideo}
          >
            {playing
              ? <HugeiconsIcon icon={PauseIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
              : <HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </section>

        <section className="sw-hero-details" id="how-it-works">
          <motion.div {...enter(0.08)}>
            <HowItWorksSectionWithZigzagTimeline
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

        <FaqScrollAccordion lang={lang} />
      </main>

      <FooterWithFourColumnLinks
        lang={lang}
        routePath={mapPath}
        reportPath={reportPath}
        reportsPath={reportsPath}
        privacyPath="/privacy"
        accountPath={user ? "/dashboard" : "/login"}
        isSignedIn={Boolean(user)}
      />

      <SignInPrompt
        open={prompting}
        title={t.promptTitle}
        body={t.promptBody}
        from="/report"
        onClose={() => setPrompting(false)}
      />
    </div>
  );
}
