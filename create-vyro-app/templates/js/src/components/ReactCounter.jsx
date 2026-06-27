import { useState } from 'react'

export default function ReactCounter({ label = 'Counter', initial = 0 }) {
  const [count, setCount] = useState(initial)

  return (
    <div className="react-counter">
      <span className="badge">React</span>
      <h3>{label}</h3>
      <div className="controls">
        <button onClick={() => setCount((c) => c - 1)}>−</button>
        <span className="value">{count}</span>
        <button onClick={() => setCount((c) => c + 1)}>+</button>
      </div>
      <button className="reset" onClick={() => setCount(initial)}>Reset</button>
    </div>
  )
}
