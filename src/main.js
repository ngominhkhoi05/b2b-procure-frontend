import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

// Global styles — CSS variables + base reset
import '@/assets/styles/index.css'

const app = createApp(App)

// 1. Pinia (state management)
const pinia = createPinia()
app.use(pinia)

// 2. Bootstrap auth store from localStorage
//    Must come before the router so the request interceptor
//    already has the persisted token on the first navigation.
const authStore = useAuthStore()
authStore.bootstrapFromStorage()

// 3. Fetch current user if a token was restored from storage
//    This restores the full session (user profile) on app reload/refresh.
if (authStore.token) {
  authStore.fetchCurrentUser()
}

// 4. Vue Router (client-side routing)
app.use(router)

// 5. Mount
app.mount('#app')
