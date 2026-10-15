'use client';
// Module quiz: instant feedback with explanation, best score saved in this browser.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore, pct } from './Store';
import { moduleHref } from '@/lib/routes';

const KEYS = 'ABCDEF';

function QuizRun({ module, questions, nextModule, onRetry }) {
  const { quiz: scores, saveQuiz } = useStore();
  const [answers, setAnswers] = useState({});
  const answered = Object.keys(answers).length;
  const score = questions.reduce((a, q, i) => a + (answers[i] === q.a ? 1 : 0), 0);
  const finished = answered === questions.length;
  const prevBest = scores[module.id];
  const resultRef = useRef(null);

  useEffect(() => {
    if (finished && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [finished]);

  function choose(qi, oi) {
    if (answers[qi] !== undefined) return;
    const nextAnswers = { ...answers, [qi]: oi };
    setAnswers(nextAnswers);
    if (Object.keys(nextAnswers).length === questions.length) {
      const final = questions.reduce((a, q, i) => a + (nextAnswers[i] === q.a ? 1 : 0), 0);
      saveQuiz(module.id, final, questions.length);
    }
  }

  const p = pct(score, questions.length);
  const msg = p >= 80 ? 'Bahut badhiya! Aap agle module ke liye ready hain.'
    : p >= 50 ? 'Achha hai. Jo galat hue unke lessons ek baar revise kar lijiye.'
      : 'Koi baat nahi. Lessons dobara padhiye aur demos chala ke dekhiye, phir quiz dijiye.';

  return (
    <div className="quiz">
      <div className="qz-top">
        <span>{answered} / {questions.length} answered · Score {score}</span>
        {prevBest && <span>Best: {prevBest.best}/{prevBest.total}</span>}
      </div>
      {questions.map((q, i) => {
        const pick = answers[i];
        const locked = pick !== undefined;
        return (
          <div className="qz" key={i} data-q={i}>
            <div className="qz-q"><span className="qn">{i + 1}.</span><div dangerouslySetInnerHTML={{ __html: q.q }} /></div>
            <div className="qz-opts">
              {q.o.map((o, j) => {
                const cls = locked ? (j === q.a ? ' right' : j === pick ? ' wrong' : '') : '';
                return (
                  <button key={j} className={'qz-opt' + cls} type="button" data-o={j} disabled={locked} onClick={() => choose(i, j)}>
                    <span className="k">{KEYS[j]}</span><span dangerouslySetInnerHTML={{ __html: o }} />
                  </button>
                );
              })}
            </div>
            {locked && (
              <div className="qz-ex">
                <b>{pick === q.a ? 'Sahi jawab!' : `Galat. Sahi answer: ${KEYS[q.a]}.`}</b>{' '}
                <span dangerouslySetInnerHTML={{ __html: q.e }} />
              </div>
            )}
          </div>
        );
      })}
      {finished && (
        <div className="qz-result" ref={resultRef}>
          <div><div className="qz-score">{score} / {questions.length}</div><p>{msg}</p></div>
          <div className="hero-cta" style={{ margin: 0 }}>
            <button className="btn btn-ghost" type="button" onClick={onRetry}>Dobara dein</button>
            {nextModule
              ? <Link className="btn" href={moduleHref(nextModule.id)}>Agla module: {nextModule.title}</Link>
              : <Link className="btn" href="/">Home</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Quiz(props) {
  const [round, setRound] = useState(0);
  return <QuizRun key={round} {...props} onRetry={() => { setRound((r) => r + 1); window.scrollTo(0, 0); }} />;
}
