import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Flag,
  LogOut,
  Timer,
} from "lucide-react";
import { LogoMark } from "../common/Logo";
import Badge, { DifficultyBadge, SubjectBadge } from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Chip from "../ui/Chip";
import Modal from "../ui/Modal";
import QuestionPalette from "./QuestionPalette";
import { useCountdown } from "../../hooks/useCountdown";
import { MARKING } from "../../utils/constants";
import { formatClock } from "../../utils/format";
import { countStates } from "../../utils/scoring";
import { getSubjectTheme } from "../../utils/subjectTheme";
import { lockScroll } from "../../utils/scrollLock";
import { cn } from "../../utils/cn";

const minus = (value) => String(value).replace("-", "−");

export default function ExamSession({
  title,
  subtitle,
  questions,
  durationSeconds,
  mode = "practice",
  onFinish,
  onExit,
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [visited, setVisited] = useState(() => ({ [questions[0].id]: true }));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [done, setDone] = useState(false);
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  const { remaining, getElapsed } = useCountdown(durationSeconds, {
    running: !done,
    onExpire: () => finish("timeout"),
  });

  const finish = (reason) => {
    if (done) return;
    const timeSeconds = getElapsed();
    setDone(true);
    setConfirmOpen(false);
    onFinish({ answers, marked, timeSeconds, reason });
  };

  useEffect(() => lockScroll(), []);

  useEffect(() => {
    if (done) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [done]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index]);

  const sections = useMemo(() => {
    const list = [];
    questions.forEach((question, i) => {
      if (!list.some((section) => section.subject === question.subject)) {
        list.push({ subject: question.subject, firstIndex: i });
      }
    });
    return list;
  }, [questions]);

  const question = questions[index];
  const selected = answers[question.id];
  const hasAnswer = Number.isInteger(selected);
  const isMarked = Boolean(marked[question.id]);
  const isLast = index === questions.length - 1;
  const counts = countStates(questions, answers, marked, visited);
  const answeredTotal = counts.answered + counts.answeredMarked;
  const markedTotal = counts.marked + counts.answeredMarked;
  const notAnswered = questions.length - answeredTotal;
  const lowTime = remaining <= 300;
  const liveMessage =
    remaining <= 60
      ? "One minute remaining"
      : remaining <= 300
        ? "Five minutes remaining"
        : "";

  const go = (target) => {
    const next = Math.min(Math.max(target, 0), questions.length - 1);
    setIndex(next);
    setVisited((prev) => ({ ...prev, [questions[next].id]: true }));
  };

  const select = (optionIndex) =>
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));

  const clearAnswer = () =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });

  const toggleMark = () =>
    setMarked((prev) => ({ ...prev, [question.id]: !prev[question.id] }));

  const summary = [
    ["Answered", answeredTotal],
    ["Not answered", notAnswered],
    ["Marked for review", markedTotal],
    ["Time left", formatClock(remaining)],
  ];

  return (
    <div
      role="region"
      aria-label={`${title} exam interface`}
      className="fixed inset-0 z-[60] flex flex-col bg-ivory-50"
    >
      <header className="shrink-0 border-b border-line bg-ivory-50">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark size={28} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-tight">
                {title}
              </p>
              {subtitle && (
                <p className="truncate text-xs text-ink-500">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              role="timer"
              aria-label="Time remaining"
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors",
                lowTime
                  ? "animate-pulse border-danger-500/40 bg-danger-100 text-danger-500"
                  : "border-line bg-[#fffdf8] text-ink-900",
              )}
            >
              <Timer size={18} aria-hidden="true" />
              <span className="tabular font-mono text-lg font-semibold">
                {formatClock(remaining)}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={LogOut}
              onClick={() => setExitOpen(true)}
            >
              Exit
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={() => setConfirmOpen(true)}
            >
              Submit
            </Button>
          </div>
        </div>
      </header>

      <p role="status" className="sr-only">
        {liveMessage}
      </p>

      <div className="flex-1 overflow-y-auto">
        <div className="page-container grid gap-6 py-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="min-w-0">
            {sections.length > 1 && (
              <div
                className="mb-4 flex flex-wrap gap-2"
                role="group"
                aria-label="Sections"
              >
                {sections.map((section) => (
                  <Chip
                    key={section.subject}
                    active={question.subject === section.subject}
                    onClick={() => go(section.firstIndex)}
                  >
                    {getSubjectTheme(section.subject).label}
                  </Chip>
                ))}
              </div>
            )}

            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ember-600">
                  Question {index + 1} of {questions.length}
                </span>
                <SubjectBadge subject={question.subject} />
                {mode === "practice" && (
                  <DifficultyBadge level={question.difficulty} />
                )}
                <Badge className="ml-auto">
                  +{MARKING.correct} / {minus(MARKING.wrong)}
                </Badge>
              </div>
              {mode === "practice" && (
                <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">
                  {question.chapter}
                </p>
              )}

              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-4 font-sans text-xl font-medium leading-relaxed text-ink-900 outline-none sm:text-[1.35rem]"
              >
                {question.text}
              </h2>

              <fieldset className="mt-6">
                <legend className="sr-only">
                  Answer options for question {index + 1}
                </legend>
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const checked = selected === optionIndex;
                    return (
                      <label
                        key={`${question.id}-${optionIndex}`}
                        className={cn(
                          "flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 transition duration-200 focus-within:ring-2 focus-within:ring-ember-500 focus-within:ring-offset-2 focus-within:ring-offset-ivory-50",
                          checked
                            ? "border-ink-900 bg-ink-900/[0.04] shadow-soft"
                            : "border-line bg-[#fffdf8] hover:-translate-y-px hover:border-ember-500",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${question.id}`}
                          checked={checked}
                          onChange={() => select(optionIndex)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full border font-mono text-sm font-semibold transition",
                            checked
                              ? "border-ink-900 bg-ink-900 text-ivory-50"
                              : "border-line text-ink-600",
                          )}
                        >
                          {"ABCD"[optionIndex]}
                        </span>
                        <span className="text-[0.95rem] leading-relaxed text-ink-800">
                          <span className="sr-only">
                            Option {"ABCD"[optionIndex]}:{" "}
                          </span>
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line-soft pt-6">
                <Button
                  size="sm"
                  variant={isMarked ? "accent" : "outline"}
                  icon={Flag}
                  aria-pressed={isMarked}
                  onClick={toggleMark}
                >
                  {isMarked ? "Marked for review" : "Mark for review"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Eraser}
                  disabled={!hasAnswer}
                  onClick={clearAnswer}
                >
                  Clear response
                </Button>
                <div className="ml-auto flex gap-3">
                  <Button
                    variant="outline"
                    icon={ChevronLeft}
                    disabled={index === 0}
                    onClick={() => go(index - 1)}
                  >
                    Previous
                  </Button>
                  {isLast ? (
                    <Button
                      variant="primary"
                      onClick={() => setConfirmOpen(true)}
                    >
                      Review and submit
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      iconRight={ChevronRight}
                      onClick={() => go(index + 1)}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-0">
            <QuestionPalette
              questions={questions}
              answers={answers}
              marked={marked}
              visited={visited}
              current={index}
              onSelect={go}
            />
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit your test?"
        description="Once you submit, answers are locked and your result is calculated."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button variant="accent" onClick={() => finish("manual")}>
              Submit test
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-3">
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-ivory-100 px-4 py-3">
              <dt className="text-xs text-ink-500">{label}</dt>
              <dd className="tabular mt-0.5 font-display text-2xl font-semibold">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {notAnswered > 0 && (
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            {notAnswered} {notAnswered === 1 ? "question is" : "questions are"}{" "}
            unanswered. Unanswered questions score 0 and carry no penalty.
          </p>
        )}
      </Modal>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Leave without submitting?"
        description="Your answers in this attempt will be discarded and no result will be saved."
        footer={
          <>
            <Button variant="outline" onClick={() => setExitOpen(false)}>
              Stay in the test
            </Button>
            <Button variant="primary" onClick={onExit}>
              Leave test
            </Button>
          </>
        }
      />
    </div>
  );
}
