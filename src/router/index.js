import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getCurrentUser } from 'vuefire'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      props: (route) => ({ query: route.query.q, id: route.query.id })
    },
    {
      path: '/corporations',
      name: 'corporations',
      component: () => import('../views/CorporationsView.vue')
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
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LogIn.vue')
    },
    {
      path: '/board',
      name: 'Board',
      component: () => import('../views/UsersViewTabBoard.vue')
    },
    {
      path: '/welcome/:email',
      name: 'Welcome',
      component: () => import('../views/WelcomeView.vue'),
      props: true
    }
  ]
})

router.beforeEach(async (to) => {
  const currentUser = await getCurrentUser()
  if (to.query.email) {
    console.log('Should go to the Welcome Page!', to.query.email)
    return '/welcome/' + to.query.email
  }
  if (!currentUser && to.name !== 'Login') {
    return { name: 'Login' }
  }
})

export default router
