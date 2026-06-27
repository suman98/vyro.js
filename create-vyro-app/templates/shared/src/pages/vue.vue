<template>
  <div class="page">
    <h1>Vue Demo</h1>
    <p class="subtitle">
      Pure Vue page — <code>.vue</code> files in <code>src/pages/</code> become routes.
    </p>

    <div class="section-label">Vue component</div>
    <VueCard
      title="Vue Card"
      description="This .vue file is a standalone page. No wrappers, no config — just drop it in src/pages/."
    />

    <a class="back" href="/">← Home</a>
  </div>
</template>

<script setup>
import VueCard from '@/components/VueCard.vue'
</script>

<style scoped>
.page {
  font-family: system-ui, sans-serif;
  background: #0f0f11;
  color: #e2e2e8;
  min-height: 100vh;
  padding: 2.5rem 2rem;
}

h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.25rem; }

.subtitle {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 2rem;

  code {
    color: #a78bfa;
    background: #1e1e2e;
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #555;
  margin-bottom: 0.75rem;
}

.back {
  color: #a78bfa;
  font-size: 0.85rem;
  display: inline-block;
  margin-top: 2rem;
  text-decoration: none;
}
</style>
