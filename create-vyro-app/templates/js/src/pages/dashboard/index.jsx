import './dashboard.scss'
import { vueToReact } from '@vyro/bridge'
import ReactCounter   from '@/components/ReactCounter'
import VueCard        from '@/components/VueCard.vue'

const Card = vueToReact(VueCard)

export default function Dashboard() {
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">
        React page — Vue component inside it. Any page can use any framework.
      </p>

      <div className="grid">
        <div>
          <p className="section-label">React component</p>
          <ReactCounter label="Vyro Counter" initial={0} />
        </div>

        <div>
          <p className="section-label">Vue component in React</p>
          <Card
            title="Vue Card"
            description="This Vue component renders inside a React page via vueToReact."
          />
        </div>
      </div>

      <a className="back" href="/">← Home</a>
    </div>
  )
}
