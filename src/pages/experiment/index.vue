<template>
  <div>
    <h1>Test Page</h1>
    <ReactTest />
  </div>
</template>

<script setup lang="ts">
import { reactToVue } from '@/utils/bridge'
import ReactTestComponent from './(components)/react-test'

const ReactTest = reactToVue(ReactTestComponent)
</script>