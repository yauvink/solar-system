import { getBodyFacts } from '../astronomy/bodyFacts.ts'
import type { FocusId } from '../scene/CameraRig.tsx'

type ObjectFactsProps = {
  focus: FocusId
}

export function ObjectFacts({ focus }: ObjectFactsProps) {
  const facts = getBodyFacts(focus)

  return (
    <aside className="hud-object-facts" aria-label={`${facts.title} facts`}>
      <p className="hud-object-facts-kind">{facts.kind}</p>
      <h2 className="hud-object-facts-title">{facts.title}</h2>
      <dl className="hud-object-facts-list">
        {facts.rows.map((row) => (
          <div key={row.label} className="hud-object-facts-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="hud-object-facts-source">NASA / NSSDCA</p>
    </aside>
  )
}
