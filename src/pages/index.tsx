import '@/scss/index.scss'
import { pages, type Page } from '@/utils/menu'

export default function Landing() {
  const sorted: Page[] = [...pages].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="wrap">
      <header>
        <h1>Pages</h1>
        <p className="sub">
          {pages.length} page{pages.length === 1 ? '' : 's'} · pick one to open
        </p>
      </header>
      <div className="grid">
        {sorted.map((p) => (
          <a className="card" key={p.url} href={p.url}>
            <span className={`badge badge-${p.type}`}>{p.type}</span>
            <h2 className="card-title">
              {p.title}
              {p.app && <span className="folder">app</span>}
            </h2>
            <span className="card-path">{p.url}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
