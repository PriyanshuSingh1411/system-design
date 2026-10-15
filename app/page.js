import LiveDemo from '@/components/LiveDemo';
import Roadmap from '@/components/Roadmap';
import { HeroActions, ContinueRow } from '@/components/HeroActions';
import { getCourse, getStats } from '@/lib/content';

export default function HomePage() {
  const stats = getStats();
  const firstLessonId = getCourse().modules[0].lessons[0].id;
  return (
    <div className="view wide">
      <section className="hero">
        <div>
          <div className="hero-k">Beginner se Pro · Hinglish me</div>
          <h1>System design seekho, zero se <em>job-ready</em> tak.</h1>
          <p className="lead">Load balancer se Kafka tak, URL shortener se WhatsApp tak. Har concept simple Hinglish me samjhaya gaya hai, live animations, interview questions aur quizzes ke saath.</p>
          <HeroActions firstLessonId={firstLessonId} />
          <div className="hero-facts">
            <span><b>{stats.lessons}</b> lessons</span>
            <span><b>{stats.demos}</b> live demos</span>
            <span><b>{stats.caseStudies}</b> case studies</span>
            <span><b>{stats.interview}</b> interview Q&amp;A</span>
            <span><b>{stats.quiz}</b> quiz MCQs</span>
          </div>
        </div>
        <div><LiveDemo name="hero" /></div>
      </section>

      <ContinueRow />

      <div className="sec-h" id="roadmap">
        <h2>Roadmap</h2>
        <p>Order me padhein. Har level pichhle level par build karta hai.</p>
      </div>
      <Roadmap />

      <div className="sec-h">
        <h2>Is site ko kaise use karein</h2>
        <p>Job-ready banne ka simple tareeka.</p>
      </div>
      <div className="howto">
        <div><b>Order me padhein</b>Beginner se shuru karein. Har lesson 5 se 15 minute ka hai. Lesson khatam karke &quot;Complete&quot; mark karein.</div>
        <div><b>Demo khud chalayein</b>Live demos me buttons dabaiye, server down kijiye, traffic badhaiye. Dekh ke samajhna yaad rehta hai.</div>
        <div><b>Bolkar practice karein</b>Har lesson ke end me interview questions hain. Answer kholne se pehle khud bolkar answer dein.</div>
        <div><b>Quiz se check karein</b>Har module ke end me quiz hai. 80% se upar score aaye tabhi agle module par jaayein.</div>
      </div>
    </div>
  );
}
