// Dev-only host for the code-inspector client.
//
// code-inspector-plugin injects its browser client into the *first* JSX/Vue
// module it transforms per dev session (an SPA assumption). This framework is
// multi-page — each page is a separate document with its own entry — so only
// the first-visited page would otherwise get the client.
//
// Every dev wrapper imports this module first (see devWrappersPlugin), so the
// inspector injects the client here. The injected client is a guarded IIFE that
// runs on import, so it re-initialises in every page document. The JSX element
// below ensures the inspector treats this file as an injectable entry.
export default function InspectorHost() {
  return <span data-inspector-host hidden />
}
