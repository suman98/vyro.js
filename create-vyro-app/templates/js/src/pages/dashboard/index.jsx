import './dashboard.scss'
import { vueToReact } from '@vyro/bridge'
import ReactCounter   from '@/components/ReactCounter'
import VueCard        from '@/components/VueCard.vue'

// Wrap Vue component so it can render inside React JSX
const Card = vueToReact(VueCard)

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">
        React + Vue together via <code>@vyro/bridge</code>
      </p>

      <div className="grid">
        <div>
          <p className="section-label">React component</p>
          <ReactCounter label="Vyro Counter" initial={0} />
        </div>

        <div>
          <p className="section-label">Vue component inside React</p>
          {/*
            VueCard is a .vue file — vueToReact() wraps it so it renders
            in React JSX. Props stay in sync on every re-render.
          */}
          <Card
            title="Vue Card"
            description="This Vue component is rendered inside a React page using vueToReact from @vyro/bridge."
          />
        </div>
      </div>

      <a href="/">← Home</a>
    </div>
  )
}
