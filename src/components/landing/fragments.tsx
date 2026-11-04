"use client";
import { fallbackPagePlan } from "@/lib/design-system";

/**
 * True-size fragments of the product UI, built in HTML with the workspace's
 * real labels. Card titles and the PRD excerpt are sample content for the
 * habit-tracker example; column names, counts, and the page plan are real.
 */

export function KanbanSlot() {
  const groups = [
    { label: "To do", count: 3, edge: "#9aa0ae" },
    { label: "Doing", count: 1, edge: "#0064e0" },
    { label: "Done", count: 2, edge: "#3fb950" },
  ];
  return (
    <span
      data-ui
      aria-hidden
      className="mv-drift flex h-full w-[112%] items-center justify-around bg-[#17181d] px-2"
    >
      {groups.map((group) => (
        <span key={group.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-1 rounded-full"
            style={{ background: group.edge }}
          />
          <span className="text-[10px] font-medium whitespace-nowrap text-[#e5e7eb]">
            {group.label}
          </span>
          <span className="text-[10px] font-semibold text-white tabular-nums">
            {group.count}
          </span>
        </span>
      ))}
    </span>
  );
}

const SAMPLE_COLUMNS = [
  {
    status: "todo",
    label: "To do",
    count: 3,
    edge: "#9aa0ae",
    cards: [
      { title: "Design the streak ring", notes: "Fills up; never drains." },
      { title: "Write guilt-free reminder copy", notes: "Nudge, never scold." },
      { title: "Add the Sunday recap", notes: "One kind screen." },
    ],
  },
  {
    status: "doing",
    label: "In progress",
    count: 1,
    edge: "#0064e0",
    cards: [{ title: "Build the check-in flow", notes: "Under ten seconds." }],
  },
  {
    status: "done",
    label: "Done",
    count: 2,
    edge: "#3fb950",
    cards: [
      { title: "Draft the PRD", notes: "Six sections." },
      { title: "Name the project", notes: "Gentle Streaks." },
    ],
  },
];

export function KanbanFragment() {
  return (
    <div data-ui className="grid grid-cols-3 gap-2.5" role="img"
      aria-label="Task board for the habit tracker example: three to do, one in progress, two done">
      {SAMPLE_COLUMNS.map((column) => (
        <div key={column.status} className="min-w-0 rounded-xl bg-white/[0.04] p-2">
          <p className="flex items-baseline justify-between gap-1 px-1 text-[11px] font-medium text-[#c9cdd6]">
            <span className="truncate">{column.label}</span>
            <span className="text-white tabular-nums">{column.count}</span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {column.cards.map((card) => (
              <li
                key={card.title}
                className="rounded-lg border-l-2 bg-[#17181d] px-2 py-2 text-[12px] leading-snug text-[#e5e7eb]"
                style={{ borderLeftColor: column.edge }}
              >
                {card.title}
                <span className="mt-0.5 block text-[11px] text-[#9aa0ae]">
                  {card.notes}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PrdFragment() {
  return (
    <div
      data-ui
      role="img"
      aria-label="PRD excerpt for the habit tracker example"
      className="rounded-xl bg-[#17181d] p-4 text-left"
    >
      <p className="font-code text-[11px] text-[#9aa0ae]">prd.md</p>
      <p className="mt-2 text-[15px] font-semibold text-[#f5f6f8]">
        Gentle Streaks
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#9aa0ae]">
        A habit tracker that never guilt-trips. Missed days fade quietly;
        streaks count showing up, not perfection.
      </p>
      <ol className="mt-2 space-y-1 text-[12px] text-[#c9cdd6]">
        <li>1. Check in under ten seconds</li>
        <li>2. Watch the streak ring fill</li>
        <li>3. Read a kind Sunday recap</li>
      </ol>
      <p className="mt-3 text-[12px] text-[#c9cdd6]">
        <span className="font-medium text-[#f5f6f8]">Users.</span> Solo builders
        shipping nights and weekends.
      </p>
      <p className="mt-1 text-[12px] text-[#c9cdd6]">
        <span className="font-medium text-[#f5f6f8]">Ships first.</span>{" "}
        Check-ins, the streak ring, the recap.
      </p>
    </div>
  );
}

const WIZARD_STEPS = [
  { step: "Stack", clause: "Pick the framework and platform." },
  { step: "Questions", clause: "Answer the setup questionnaire." },
  { step: "Design", clause: "Choose a design system." },
  { step: "Review", clause: "Confirm and create the project." },
];

export function WizardStepsFragment() {
  return (
    <div
      data-ui
      role="img"
      aria-label="Setup wizard steps: stack, questions, design, review"
      className="rounded-xl bg-white/[0.04] p-2"
    >
      <p className="px-2 pt-1 text-[11px] font-medium text-[#c9cdd6]">
        Setup wizard
      </p>
      <ol className="mt-1.5 space-y-1.5">
        {WIZARD_STEPS.map((entry) => (
          <li
            key={entry.step}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-[#17181d] px-3 py-2.5"
          >
            <span className="text-[12px] font-medium text-[#f5f6f8]">
              {entry.step}
            </span>
            <span className="truncate text-[11px] text-[#9aa0ae]">
              {entry.clause}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PagesFragment() {
  const plan = fallbackPagePlan().slice(0, 3);
  return (
    <div
      data-ui
      role="img"
      aria-label="Planned pages: overview, items, and settings"
      className="rounded-xl bg-white/[0.04] p-2"
    >
      <p className="px-2 pt-1 text-[11px] font-medium text-[#c9cdd6]">
        Page plan
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {plan.map((page) => (
          <li
            key={page.slug}
            className="rounded-lg bg-[#17181d] px-3 py-2"
          >
            <p className="text-[12px] font-medium text-[#f5f6f8]">
              {page.title}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#9aa0ae]">
              {page.brief}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
