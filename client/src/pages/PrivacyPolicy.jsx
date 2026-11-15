import { Link } from "react-router-dom";
import policyHtml from "../../content/privacy-policy.html?raw";
import policyHtmlBn from "../../content/privacy-policy.bn.html?raw";
import { useLang } from "../lib/lang";
import "./privacy-policy.css";

const COPY = {
  en: {
    back: "Back to home",
    footer: "Privacy and data protection",
  },
  bn: {
    back: "হোমে ফিরে যান",
    footer: "গোপনীয়তা ও তথ্য সুরক্ষা",
  },
};

export default function PrivacyPolicy() {
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;
  const policy = lang === "bn" ? policyHtmlBn : policyHtml;

  return (
    <main className="sw-privacy-page" lang={lang}>
      <header className="sw-privacy-header">
        <Link to="/" className="sw-privacy-brand">Safeway<span>.</span></Link>
        <Link to="/" className="sw-privacy-home">{copy.back}</Link>
      </header>
      <article className="sw-privacy-content" dangerouslySetInnerHTML={{ __html: policy }} />
      <footer className="sw-privacy-footer"><Link to="/">Safeway</Link><span>{copy.footer}</span></footer>
    </main>
  );
}
