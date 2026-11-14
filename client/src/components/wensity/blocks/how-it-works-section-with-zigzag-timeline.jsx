import { useId } from "react";
import {
  Check,
  ClipboardCheck,
  FilePlus2,
  ShieldCheck,
  X,
} from "lucide-react";
import "./how-it-works-section-with-zigzag-timeline.css";

const STEP_ICONS = [FilePlus2, ClipboardCheck];

export default function HowItWorksSectionWithZigzagTimeline({
  eyebrow,
  title,
  description,
  stepLabel = "STEP",
  outcomeLabel = "Review outcome",
  steps = [],
  outcomes = [],
}) {
  const headingId = useId();
  const stages = [
    ...steps.slice(0, 2).map((step, index) => ({
      ...step,
      icon: STEP_ICONS[index] || ClipboardCheck,
      kind: "step",
    })),
    {
      title: outcomeLabel,
      description: "",
      icon: ShieldCheck,
      kind: "outcome",
    },
  ];

  return (
    <section className="sw-zigzag" aria-labelledby={headingId}>
      <header className="sw-zigzag-heading">
        <div className="sw-zigzag-heading-copy">
          {eyebrow && (
            <p className="sw-zigzag-eyebrow">
              <span className="sw-zigzag-eyebrow-dot" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h2 id={headingId}>{title}</h2>
          {description && <p className="sw-zigzag-intro">{description}</p>}
        </div>
        <span className="sw-zigzag-heading-mark" aria-hidden="true">
          <ShieldCheck size={27} strokeWidth={1.65} />
        </span>
      </header>

      <ol className="sw-zigzag-timeline">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const number = String(index + 1).padStart(2, "0");
          const isOutcome = stage.kind === "outcome";

          return (
            <li
              className={`sw-zigzag-step ${index % 2 === 0 ? "is-left" : "is-right"} ${isOutcome ? "is-outcome" : ""}`}
              key={`${stage.kind}-${number}`}
            >
              {index < stages.length - 1 && (
                <svg
                  className={`sw-zigzag-connector ${index % 2 === 0 ? "to-right" : "to-left"}`}
                  viewBox="0 0 100 250"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d={index % 2 === 0
                      ? "M 46 102 H 63 Q 68 102 68 107 V 250"
                      : "M 54 102 H 37 Q 32 102 32 107 V 250"}
                  />
                </svg>
              )}

              <article className="sw-zigzag-card">
                <span className={`sw-zigzag-tab ${index % 2 === 0 ? "is-green" : "is-light"}`}>
                  <span>{stepLabel} {number}</span>
                </span>

                <div className="sw-zigzag-card-heading">
                  <span className="sw-zigzag-card-icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <h3>{stage.title}</h3>
                </div>

                {stage.description && <p className="sw-zigzag-card-description">{stage.description}</p>}

                {isOutcome && outcomes.length > 0 && (
                  <ul className="sw-zigzag-outcome-list">
                    {outcomes.map((outcome, outcomeIndex) => {
                      const OutcomeIcon = outcome.status === "success" ? Check : X;
                      return (
                        <li
                          className={`sw-zigzag-outcome-card ${outcome.status === "success" ? "is-success" : "is-neutral"}`}
                          key={`${outcome.status || "outcome"}-${outcomeIndex}`}
                        >
                          <span className="sw-zigzag-outcome-icon" aria-hidden="true">
                            <OutcomeIcon size={17} strokeWidth={2} />
                          </span>
                          <span className="sw-zigzag-outcome-copy">
                            <strong>{outcome.title}</strong>
                            <span>{outcome.description}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
