<script setup>
import { RouterView } from 'vue-router'
import BaseToast from '@/components/common/BaseToast.vue'
</script>

<template>
  <RouterView />
  <!-- Global toast notification container — rendered once at app root -->
  <BaseToast />
</template>
