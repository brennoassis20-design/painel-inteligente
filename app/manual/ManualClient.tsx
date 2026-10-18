"use client";

import { useEffect, useState } from "react";
import { manualModules } from "./lessons";

// Progresso fica só no navegador de quem usa (sem login).
const storageKey = "metodo-genio-manual";

type Done = Record<string, boolean>;

const allTasks = manualModules.flatMap((module) =>
  module.lessons.flatMap((lesson) => lesson.tasks.map((_, index) => `${lesson.id}:${index}`)),
);

function readDone(): Done {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

export function ManualClient() {
  const [done, setDone] = useState<Done>({});

  // Lê depois de montar para o HTML do servidor e o do navegador baterem.
  useEffect(() => {
    const saved = readDone();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Object.keys(saved).length) setDone(saved);
  }, []);

  function toggle(key: string) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Sem armazenamento local: o checklist vale até fechar a página.
    }
  }

  const total = allTasks.length;
  const completed = allTasks.filter((key) => done[key]).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const nextLesson = manualModules
    .flatMap((module) => module.lessons)
    .find((lesson) => lesson.tasks.some((_, index) => !done[`${lesson.id}:${index}`]));

  return (
    <main className="man">
      <div className="man-bg" aria-hidden="true" />
      <header className="man-hero">
        <p className="man-eyebrow">Método Gênio</p>
        <h1>Manual das aulas</h1>
        <p className="man-lead">
          Assista cada aula, siga o passo a passo e marque o que já fez. Seu progresso fica salvo neste navegador.
        </p>
        <div className="man-progress" aria-label={`${percent}% concluído`}>
          <div className="man-progress-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>
            <b>{percent}%</b> concluído · {completed} de {total} tarefas
            {nextLesson && (
              <>
                {" · "}
                <a href={`#${nextLesson.id}`}>Continuar em {nextLesson.title}</a>
              </>
            )}
          </p>
        </div>
        <button type="button" className="man-print" onClick={() => window.print()}>
          Salvar em PDF
        </button>
      </header>

      <div className="man-layout">
        <nav className="man-toc" aria-label="Aulas">
          {manualModules.map((module) => (
            <div key={module.id}>
              <p>{module.title}</p>
              <ul>
                {module.lessons.map((lesson) => {
                  const finished = lesson.tasks.every((_, index) => done[`${lesson.id}:${index}`]);
                  return (
                    <li key={lesson.id} className={finished ? "done" : ""}>
                      <a href={`#${lesson.id}`}>{lesson.title}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="man-content">
          {manualModules.map((module) => (
            <section className="man-module" key={module.id} id={module.id}>
              <h2>{module.title}</h2>
              <p className="man-module-intro">{module.intro}</p>

              {module.lessons.map((lesson) => {
                const finished = lesson.tasks.every((_, index) => done[`${lesson.id}:${index}`]);
                return (
                  <article className={`man-lesson ${finished ? "is-done" : ""}`} id={lesson.id} key={lesson.id}>
                    <div className="man-lesson-head">
                      <h3>{lesson.title}</h3>
                      {finished && <span className="man-badge">Concluída</span>}
                    </div>
                    <p className="man-summary">{lesson.summary}</p>

                    {lesson.steps && (
                      <>
                        <h4>Passo a passo</h4>
                        <ol>
                          {lesson.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </>
                    )}

                    {lesson.tips && (
                      <>
                        <h4>Dicas</h4>
                        <ul className="man-tips">
                          {lesson.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {lesson.links && (
                      <div className="man-links">
                        {lesson.links.map((link) => (
                          <a key={link.href + link.label} href={link.href} target="_blank" rel="noreferrer">
                            {link.label} ↗
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="man-tasks">
                      <h4>Checklist da aula</h4>
                      {lesson.tasks.map((task, index) => {
                        const key = `${lesson.id}:${index}`;
                        return (
                          <label key={key} className={done[key] ? "checked" : ""}>
                            <input type="checkbox" checked={Boolean(done[key])} onChange={() => toggle(key)} />
                            <span>{task}</span>
                          </label>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
