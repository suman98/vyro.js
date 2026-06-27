<template>
  <div class="page">
    <h1>Vue Page</h1>
    <p class="subtitle">
      Vue page — React component inside it. Any page can use any framework.
    </p>

    <div class="grid">
      <div>
        <p class="section-label">Vue component</p>
        <VueCard
          title="Vue Card"
          description="Native Vue component in a Vue page."
        />
      </div>

      <div>
        <p class="section-label">React component in Vue</p>
        <ReactCounter label="React Counter" :initial="3" />
      </div>
    </div>

    <a class="back" href="/">← Home</a>
  </div>
</template>

<script setup>
import { reactToVue }   from '@vyro/bridge'
import VueCard          from '@/components/VueCard.vue'
import ReactCounterRaw  from '@/components/ReactCounter'

const ReactCounter = reactToVue(ReactCounterRaw)
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
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 900px;
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
