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
      component: () => import('../views/Corporations/CorporationsView.vue')
    },
    {
      path: '/personnel',
      name: 'personnel',
      component: () => import('../views/Users/UsersView.vue')
    },
    {
      path: '/personnel-edit',
      name: 'personnel-edit',
      component: () => import('../views/Users/UsersViewAdd.vue')
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
      component: () => import('../views/BoardView.vue')
    },
    {
      path: '/incident',
      name: 'IncidentReport',
      component: () => import('../views/IncidentReport.vue')
    },
    {
      path: '/welcome/:id',
      name: 'Welcome',
      component: () => import('../views/WelcomeView.vue'),
      props: true
    },
    {
      path: '/Sites',
      name: 'Sites',
      component: () => import('../views/Sites/SitesView.vue'),
      props: true
    },
    {
      path: '/participants',
      name: 'Participants',
      component: () => import('../views/Participants/ParticipantsView.vue'),
      props: true
    },
    {
      path: '/activities',
      name: 'Activities',
      component: () => import('../views/Activities/ActivitiesView.vue'),
      props: true
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/DashboardVue.vue'),
      props: true
    },
    {
      path: '/setup',
      name: 'Setup',
      component: () => import('../views/SetUpView.vue'),
      props: true
    }
  ]
})

router.beforeEach(async (to) => {
  const currentUser = await getCurrentUser()
  console.log('Name: ', to.name);
  if (to.query.id) {
    console.log('Should go to the Welcome Page!', to.query.id)
    return '/welcome/' + to.query.id
  }
  if (!currentUser && to.name !== 'Login' && to.name !== 'Welcome' && to.name !== 'Setup') {
    console.log('Lets go to login!!! to.name= ', to.name);
    return { name: 'Login' }
  }
  return
})

export default router
