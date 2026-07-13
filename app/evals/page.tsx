"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime } from "../../lib/format";
import { listEvalRuns } from "../../lib/storage";
import type { EvalRun } from "../../lib/types";

export default function EvalsPage() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRuns(listEvalRuns());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <main className="page" />;
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Evals</p>
          <h1>Brand-check audit trail</h1>
          <p className="lede">
            Every draft and revision is automatically checked against its deck&rsquo;s
            voice standards. Verdicts inform, they never block.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="empty-state">
          <h3>No brand checks yet</h3>
          <p>
            Draft a presentation and its first check will appear here — date, document,
            verdict, and findings.
          </p>
          <Link href="/new" className="button-primary">
            New presentation
          </Link>
        </div>
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>Date</th>
              <th style={{ width: "28%" }}>Document</th>
              <th style={{ width: "16%" }}>Verdict</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  {formatDateTime(run.date)}
                  <div className="doc-ctx">{run.trigger === "draft" ? "full draft" : "slide revision"}</div>
                </td>
                <td className="doc-cell">
                  <div className="doc-title">
                    <Link href={`/decks/${run.deckId}`}>{run.deckTitle}</Link>
                  </div>
                  {run.contextFilename ? (
                    <div className="doc-ctx">ctx: {run.contextFilename}</div>
                  ) : null}
                </td>
                <td>
                  <span className={`verdict-badge ${run.verdict}`}>
                    {run.verdict === "on-brand" ? "✓ on-brand" : "⚠ needs revision"}
                  </span>
                </td>
                <td>
                  {run.findings.length === 0 ? (
                    <span className="no-findings">No issues found.</span>
                  ) : (
                    <ul className="findings-list">
                      {run.findings.map((finding, index) => (
                        <li key={index}>
                          {finding.slideNumber ? (
                            <span className="slide-ref">Slide {finding.slideNumber}: </span>
                          ) : null}
                          {finding.issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
