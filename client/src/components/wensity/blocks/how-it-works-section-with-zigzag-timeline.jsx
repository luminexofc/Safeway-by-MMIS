import { useId } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  ClipboardCheckIcon,
  FileAddIcon,
  ShieldCheckIcon,
} from "@hugeicons/core-free-icons";
import "./how-it-works-section-with-zigzag-timeline.css";

const STEP_ICONS = [FileAddIcon, ClipboardCheckIcon];

export default function HowItWorksSectionWithZigzagTimeline({
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
      icon: STEP_ICONS[index] || ClipboardCheckIcon,
      kind: "step",
    })),
    {
      title: outcomeLabel,
      description: "",
      icon: ShieldCheckIcon,
      kind: "outcome",
    },
  ];

  return (
    <section className="sw-zigzag" aria-labelledby={headingId}>
      <header className="sw-zigzag-heading">
        <h2 id={headingId}>{title}</h2>
        {description && <p className="sw-zigzag-intro">{description}</p>}
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
                <div className="sw-zigzag-card-heading">
                  <span className="sw-zigzag-card-icon" aria-hidden="true">
                    <HugeiconsIcon icon={Icon} size={18} strokeWidth={1.75} />
                  </span>
                  <div className="sw-zigzag-card-titles">
                    <p className="sw-zigzag-card-step">{stepLabel} {number}</p>
                    <h3>{stage.title}</h3>
                  </div>
                </div>

                {stage.description && <p className="sw-zigzag-card-description">{stage.description}</p>}

                {isOutcome && outcomes.length > 0 && (
                  <ul className="sw-zigzag-outcome-list">
                    {outcomes.map((outcome, outcomeIndex) => {
                      const OutcomeIcon = outcome.status === "success" ? CheckmarkCircle02Icon : CancelCircleIcon;
                      return (
                        <li
                          className={`sw-zigzag-outcome-row ${outcome.status === "success" ? "is-success" : "is-neutral"}`}
                          key={`${outcome.status || "outcome"}-${outcomeIndex}`}
                        >
                          <span className="sw-zigzag-outcome-icon" aria-hidden="true">
                            <HugeiconsIcon icon={OutcomeIcon} size={16} strokeWidth={1.75} />
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
