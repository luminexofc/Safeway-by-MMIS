import BeuiBadge from "../beui/BeuiBadge";
import { BeuiCard } from "../beui/beui";

export default function AuthFrame({ title, sub, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a2126] p-8 text-white md:flex">
          <div className="relative">
            <p className="text-[18px] font-bold tracking-tight">Safeway</p>
            <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">One map. Every safe road. No guesswork.</h2>
            <ul className="mt-4 space-y-2 text-[14px] text-slate-300">
              <li>Roads colored by review status</li>
              <li>Flooding reports with GPS and photo</li>
              <li>Push alerts near verified water</li>
            </ul>
          </div>
          <div className="relative flex gap-2">
            <BeuiBadge tone="safe">Green: clear</BeuiBadge>
            <BeuiBadge tone="caution">Yellow: caution</BeuiBadge>
            <BeuiBadge tone="danger">Red: avoid</BeuiBadge>
          </div>
        </div>
        <BeuiCard className="p-7 sm:p-8">
          <h1 className="text-[24px] font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">{sub}</p>
          <div className="mt-5">{children}</div>
          {footer && <div className="mt-5 border-t border-slate-100 pt-4 text-[14px] text-slate-600 dark:border-white/10 dark:text-slate-400">{footer}</div>}
        </BeuiCard>
      </div>
    </div>
  );
}
