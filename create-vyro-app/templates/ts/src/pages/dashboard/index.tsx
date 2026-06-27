import './dashboard.scss'
import ReactCounter from '@/components/ReactCounter'

export default function Dashboard() {
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">
        React page — <code>.tsx</code> / <code>.jsx</code> files in <code>src/pages/</code> become routes.
      </p>

      <div className="grid">
        <div>
          <p className="section-label">React component</p>
          <ReactCounter label="Vyro Counter" initial={0} />
        </div>

        <div>
          <p className="section-label">Vue page</p>
          <div className="info-card">
            <p>Drop a <code>.vue</code> file into <code>src/pages/</code> for a Vue route.</p>
            <a className="link" href="/vue">→ View Vue demo</a>
          </div>
        </div>
      </div>

      <a className="back" href="/">← Home</a>
    </div>
  )
}
