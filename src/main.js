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
useAuthStore().bootstrapFromStorage()

// 3. Vue Router (client-side routing)
app.use(router)

// 4. Mount
app.mount('#app')
