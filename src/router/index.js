import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/corporations',
      name: 'corporations',
      component: () => import('../views/CorporationsView.vue')
    },
    {
      path: '/board',
      name: 'board',
      component: () => import('../views/BoardView.vue')
    },
    {
      path: '/board-edit',
      name: 'board-edit',
      component: () => import('../views/BoardViewEdit.vue')
    },
    {
      path: '/board-add',
      name: 'board-add',
      component: () => import('../views/BoardViewAdd.vue')
    },
    {
      path: '/personnel',
      name: 'personnel',
      component: () => import('../views/UsersView.vue')
    },
    {
      path: '/personnel-edit',
      name: 'personnel-edit',
      component: () => import('../views/UsersViewAdd.vue')
    },
    {
      path: '/training',
      name: 'training',
      component: () => import('../views/TrainingView.vue')
    },
    {
      path: '/screening',
      name: 'screening',
      component: () => import('../views/ScreeningView.vue')
    }
  ]
})

export default router
