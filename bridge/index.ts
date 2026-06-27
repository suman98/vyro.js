import {
  defineComponent,
  h,
  ref,
  watch,
  onMounted,
  onUnmounted,
  reactive,
  createApp,
  type Component as VueComponent,
} from 'vue'
import {
  createElement,
  useRef,
  useEffect,
  type ComponentType,
  type FunctionComponent,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * Wrap a React component so it can be used inside a Vue template.
 *
 * All Vue attrs/props are forwarded to the React component and kept in sync.
 * Slots are not bridged — compose via props if you need children.
 *
 * @example
 * import { reactToVue } from '@/utils/bridge'
 * import MyReactButton from './MyReactButton'
 *
 * const MyButton = reactToVue(MyReactButton)
 * // <MyButton label="Click me" @click="handler" />
 */
export function reactToVue<P extends Record<string, unknown>>(
  ReactComponent: ComponentType<P>,
) {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      const container = ref<HTMLElement | null>(null)
      let root: Root | null = null

      const render = () =>
        root?.render(createElement(ReactComponent, attrs as unknown as P))

      onMounted(() => {
        root = createRoot(container.value!)
        render()
      })

      // Re-render React side whenever Vue attrs change.
      // flush:'post' waits for Vue's DOM pass so the container div is stable.
      watch(attrs, render, { deep: true, flush: 'post' })

      onUnmounted(() => {
        root?.unmount()
        root = null
      })

      return () => h('div', { ref: container })
    },
  })
}

/**
 * Wrap a Vue component so it can be used inside a React render/JSX.
 *
 * React props are synced into a Vue reactive object on every render, so the
 * Vue component stays reactive to prop changes.
 * React children are not bridged — use props for content instead.
 *
 * @example
 * import { vueToReact } from '@/utils/bridge'
 * import MyVueCard from './MyVueCard.vue'
 *
 * const MyCard = vueToReact(MyVueCard)
 * // <MyCard title="Hello" count={42} />
 */
export function vueToReact<P extends Record<string, unknown>>(
  VueComponent: VueComponent,
): FunctionComponent<P> {
  return function VueWrapper(props: P) {
    const containerRef = useRef<HTMLDivElement>(null)
    // Stable reactive object — never recreated, just mutated on each render.
    const vueProps = useRef(reactive<Record<string, unknown>>({ ...props }))
    const appRef = useRef<ReturnType<typeof createApp> | null>(null)

    useEffect(() => {
      const app = createApp({
        render: () => h(VueComponent, vueProps.current),
      })
      app.mount(containerRef.current!)
      appRef.current = app
      return () => {
        app.unmount()
        appRef.current = null
      }
    }, [])

    // Sync React props → Vue reactive proxy after every render.
    // Deletes keys that were removed so Vue sees the removal too.
    useEffect(() => {
      const current = vueProps.current
      for (const key of Object.keys(current)) {
        if (!(key in props)) delete current[key]
      }
      Object.assign(current, props)
    })

    return createElement('div', { ref: containerRef })
  }
}
