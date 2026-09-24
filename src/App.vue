<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BaseToast from '@/components/common/BaseToast.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()

// Routes that should be wrapped in the authenticated application shell
// (sidebar + header). Everything else uses the unauthenticated auth shell.
const APP_LAYOUT_NAMES = new Set([
  'dashboard',
  'profile',
  'products',
  'categories',
  'cart',
  'orders',
  'users',
  'companies',
  'commission',
  'statistics',
  'settings',
])

const useAppLayout = computed(() => APP_LAYOUT_NAMES.has(route.name))
</script>

<template>
  <AppLayout v-if="useAppLayout" />
  <AuthLayout v-else />
  <!-- Global toast notification container — rendered once at app root -->
  <BaseToast />
</template>
