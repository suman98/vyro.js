// Menu configuration for the landing page (src/pages/index.tsx).
// Each entry is one card. `url` is the built/served page path, `type` drives the
// badge color, `app` marks a folder-as-app entry.
export interface Page {
  title: string
  url: string
  type: 'html' | 'vue' | 'react'
  app?: boolean
}

export const pages: Page[] = [
  { title: 'Image Editor', url: '/image-editor', type: 'html' },
  { title: 'games', url: '/games', type: 'html' },
  { title: 'JSON Schema Generator', url: '/tools/json-schema', type: 'html' },
]
