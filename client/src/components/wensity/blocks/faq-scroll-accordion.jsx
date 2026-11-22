import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import "./faq-scroll-accordion.css";

const COPY = {
  en: {
    title: "Frequently asked questions",
    subtitle: "Everything you need to know about checking roads with Safeway.",
    items: [
      {
        question: "What is Safeway?",
        answer:
          "Safeway is a road-condition service for journeys across Bangladesh. It shows verified waterlogging reports on a safety map so you can check a route before you leave.",
      },
      {
        question: "Do I need an account to use it?",
        answer:
          "Not to look. The safety map is open to everyone with no sign-up. You only need a Safeway account to file a report or follow the reports you filed, which keeps reports tied to real people.",
      },
      {
        question: "How does a report reach the map?",
        answer:
          "You file a report with the road details and location. An operator then checks the report and its evidence. Only verified reports appear on the map as road conditions.",
      },
      {
        question: "What happens if a report isn't verified?",
        answer:
          "It stays off the map. Reports that cannot be confirmed never appear as road conditions, so what you see on the map has been reviewed.",
      },
      {
        question: "Can I follow my own reports?",
        answer:
          "Yes. My reports lists everything you have filed and where each one stands in the review queue.",
      },
      {
        question: "Is Safeway free to use?",
        answer:
          "Yes. Checking the safety map is free with no account, and filing road reports is free for everyone with an account.",
      },
    ],
  },
  bn: {
    title: "সচরাচর জিজ্ঞাসা",
    subtitle: "সেফওয়ে দিয়ে সড়ক যাচাই সম্পর্কে যা জানা দরকার।",
    items: [
      {
        question: "সেফওয়ে কী?",
        answer:
          "সেফওয়ে বাংলাদেশজুড়ে যাত্রার জন্য একটি সড়ক-পরিস্থিতি সেবা। এটি যাচাইকৃত জলাবদ্ধতার রিপোর্ট নিরাপত্তা মানচিত্রে দেখায়, যাতে বের হওয়ার আগেই রুট দেখে নিতে পারেন।",
      },
      {
        question: "ব্যবহার করতে অ্যাকাউন্ট লাগবে?",
        answer:
          "দেখতে লাগবে না। নিরাপত্তা মানচিত্র সাইন-আপ ছাড়াই সবার জন্য খোলা। কেবল রিপোর্ট জমা দিতে বা নিজের জমা দেওয়া রিপোর্ট দেখতে সেফওয়ে অ্যাকাউন্ট দরকার, যা রিপোর্ট প্রকৃত ব্যক্তির সাথে যুক্ত রাখে।",
      },
      {
        question: "রিপোর্ট কীভাবে মানচিত্রে আসে?",
        answer:
          "আপনি সড়কের তথ্য ও অবস্থানসহ রিপোর্ট জমা দেন। এরপর একজন অপারেটর রিপোর্ট ও প্রমাণ যাচাই করেন। কেবল যাচাইকৃত রিপোর্টই সড়কের অবস্থা হিসেবে মানচিত্রে দেখায়।",
      },
      {
        question: "রিপোর্ট যাচাই না হলে কী হয়?",
        answer:
          "সেটি মানচিত্রে দেখায় না। নিশ্চিত করা যায়নি এমন রিপোর্ট কখনো সড়কের অবস্থা হিসেবে দেখানো হয় না, তাই মানচিত্রে যা দেখেন তা যাচাই করা।",
      },
      {
        question: "নিজের রিপোর্ট দেখতে পারব?",
        answer:
          "হ্যাঁ। আমার রিপোর্ট-এ আপনার জমা দেওয়া সব রিপোর্ট এবং যাচাইয়ের সারিতে প্রতিটির অবস্থান দেখতে পাবেন।",
      },
      {
        question: "সেফওয়ে ব্যবহারে খরচ আছে?",
        answer:
          "না। অ্যাকাউন্ট ছাড়াই নিরাপত্তা মানচিত্র দেখা যায়, এবং অ্যাকাউন্ট থাকলে সড়ক রিপোর্ট করা সবার জন্য বিনামূল্যে।",
      },
    ],
  },
};

export default function FaqScrollAccordion({ lang = "en" }) {
  const copy = COPY[lang] || COPY.en;
  const [selection, setSelection] = useState({ lang, index: null });
  const openIndex = selection.lang === lang ? selection.index : null;

  const toggle = (index) => {
    setSelection({ lang, index: openIndex === index ? null : index });
  };

  return (
    <section className="sw-faq" aria-labelledby="sw-faq-title">
      <div className="sw-faq-inner">
        <header className="sw-faq-heading">
          <h2 id="sw-faq-title">{copy.title}</h2>
          <p className="sw-faq-subtitle">{copy.subtitle}</p>
        </header>

        <div className="sw-faq-list">
          {copy.items.map((item, index) => {
            const open = openIndex === index;
            const answerId = `sw-faq-answer-${index}`;
            return (
              <div
                className={`sw-faq-item${open ? " is-open" : ""}`}
                key={item.question}
              >
                <h3 className="sw-faq-item-heading">
                  <button
                    type="button"
                    className="sw-faq-trigger"
                    aria-expanded={open}
                    aria-controls={answerId}
                    onClick={() => toggle(index)}
                  >
                    <span className="sw-faq-question">{item.question}</span>
                    <span className="sw-faq-icon" aria-hidden="true">
                      <HugeiconsIcon icon={PlusSignIcon} size={17} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                  </button>
                </h3>
                <div className="sw-faq-answer" id={answerId} aria-hidden={!open}>
                  <div className="sw-faq-answer-inner">
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
