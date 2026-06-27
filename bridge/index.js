import { defineComponent, h, ref, watch, onMounted, onUnmounted, reactive, createApp } from 'vue'
import { createElement, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

export function reactToVue(ReactComponent) {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      const container = ref(null)
      let root = null

      const render = () => root?.render(createElement(ReactComponent, attrs))

      onMounted(() => {
        root = createRoot(container.value)
        render()
      })

      watch(attrs, render, { deep: true, flush: 'post' })

      onUnmounted(() => {
        root?.unmount()
        root = null
      })

      return () => h('div', { ref: container })
    },
  })
}

export function vueToReact(VueComponent) {
  return function VueWrapper(props) {
    const containerRef = useRef(null)
    const vueProps    = useRef(reactive({ ...props }))
    const appRef      = useRef(null)

    useEffect(() => {
      const app = createApp({ render: () => h(VueComponent, vueProps.current) })
      app.mount(containerRef.current)
      appRef.current = app
      return () => { app.unmount(); appRef.current = null }
    }, [])

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
