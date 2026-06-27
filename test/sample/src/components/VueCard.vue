<template>
  <div class="vue-card">
    <span class="badge">Vue</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <p class="note">Props update reactively — change them from React and this Vue component re-renders.</p>
  </div>
</template>

<script setup>
defineProps({
  title:       { type: String, default: 'Vue Card' },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.vue-card {
  background: #1a1a2e;
  border: 1px solid #4ade8044;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  max-width: 420px;
  position: relative;
}
.badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4ade80;
  background: #4ade8018;
  border: 1px solid #4ade8044;
  border-radius: 999px;
  padding: 2px 10px;
}
h3 { margin: 0.75rem 0 0.4rem; color: #e2e2e8; }
p  { color: #888; font-size: 0.9rem; margin: 0; }
.note { margin-top: 0.6rem; font-size: 0.78rem; color: #555; font-style: italic; }
</style>
