import { Link } from "react-router-dom";
import policyHtml from "../../content/privacy-policy.html?raw";
import "./privacy-policy.css";

export default function PrivacyPolicy() {
  return (
    <main className="sw-privacy-page">
      <header className="sw-privacy-header">
        <Link to="/" className="sw-privacy-brand">Safeway<span>.</span></Link>
        <Link to="/" className="sw-privacy-home">Back to home</Link>
      </header>
      <article className="sw-privacy-content" dangerouslySetInnerHTML={{ __html: policyHtml }} />
      <footer className="sw-privacy-footer"><Link to="/">Safeway</Link><span>Privacy and data protection</span></footer>
    </main>
  );
}
