import { MARKING } from "./constants";
import { percent } from "./format";

export const STATE_LABELS = {
  notVisited: "not visited",
  unanswered: "not answered",
  answered: "answered",
  marked: "marked for review",
  answeredMarked: "answered and marked for review",
};

export function getQuestionState({ answered, marked, visited }) {
  if (answered && marked) return "answeredMarked";
  if (answered) return "answered";
  if (marked) return "marked";
  if (visited) return "unanswered";
  return "notVisited";
}

export function countStates(questions, answers, marked, visited) {
  const counts = {
    notVisited: 0,
    unanswered: 0,
    answered: 0,
    marked: 0,
    answeredMarked: 0,
  };
  questions.forEach((question) => {
    const state = getQuestionState({
      answered: Number.isInteger(answers[question.id]),
      marked: Boolean(marked[question.id]),
      visited: Boolean(visited[question.id]),
    });
    counts[state] += 1;
  });
  return counts;
}

const emptyTally = () => ({ correct: 0, wrong: 0, unattempted: 0, score: 0 });

export function scoreAttempt(questions, answers, marking = MARKING) {
  const rows = questions.map((question) => {
    const chosen = answers[question.id];
    const hasAnswer = Number.isInteger(chosen);
    let status = "unattempted";
    if (hasAnswer) status = chosen === question.answer ? "correct" : "wrong";
    const marks =
      status === "correct"
        ? marking.correct
        : status === "wrong"
          ? marking.wrong
          : 0;
    return { question, selected: hasAnswer ? chosen : null, status, marks };
  });

  const totals = emptyTally();
  const bySubject = {};
  const chapterMap = new Map();

  rows.forEach(({ question, status, marks }) => {
    totals[status] += 1;
    totals.score += marks;

    if (!bySubject[question.subject])
      bySubject[question.subject] = { ...emptyTally(), total: 0 };
    const subjectTally = bySubject[question.subject];
    subjectTally[status] += 1;
    subjectTally.score += marks;
    subjectTally.total += 1;

    const key = `${question.subject}|${question.chapter}`;
    const chapterTally = chapterMap.get(key) ?? {
      subject: question.subject,
      chapter: question.chapter,
      ...emptyTally(),
      total: 0,
    };
    chapterTally[status] += 1;
    chapterTally.score += marks;
    chapterTally.total += 1;
    chapterMap.set(key, chapterTally);
  });

  const byChapter = [...chapterMap.values()]
    .map((item) => ({ ...item, strength: percent(item.correct, item.total) }))
    .sort((a, b) => a.strength - b.strength);

  const attempted = totals.correct + totals.wrong;

  return {
    rows,
    ...totals,
    total: questions.length,
    attempted,
    accuracy: percent(totals.correct, attempted),
    maxScore: questions.length * marking.correct,
    bySubject,
    byChapter,
  };
}

export function buildAttemptRecord({
  kind,
  title,
  testId = null,
  result,
  timeSeconds,
}) {
  const now = new Date();
  return {
    id: String(now.getTime()),
    kind,
    title,
    testId,
    date: now.toLocaleDateString("en-CA"),
    timestamp: now.getTime(),
    score: result.score,
    maxScore: result.maxScore,
    timeSeconds,
    bySubject: Object.fromEntries(
      Object.entries(result.bySubject).map(([subject, tally]) => [
        subject,
        [tally.correct, tally.wrong, tally.unattempted],
      ]),
    ),
    chapters: result.byChapter.map(
      ({ subject, chapter, correct, wrong, unattempted }) => ({
        subject,
        chapter,
        correct,
        wrong,
        unattempted,
      }),
    ),
  };
}

export function buildMistakes(result, attempt) {
  return result.rows
    .filter((row) => row.status === "wrong")
    .map((row) => ({
      id: `${attempt.id}:${row.question.id}`,
      questionId: row.question.id,
      yourAnswer: row.selected,
      tag: "Unreviewed",
      date: attempt.date,
      note: "",
      status: "open",
    }));
}
