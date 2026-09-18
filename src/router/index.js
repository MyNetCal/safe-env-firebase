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
    },
    {
      path: '/migration',
      name: 'Migration',
      component: () => import('../views/MigrationView.vue')
    }
  ]
})

router.beforeEach(async (to) => {
  const currentUser = await getCurrentUser()
  console.log('Name: ', to.name)
  if (to.query.id) {
    console.log('Should go to the Welcome Page!', to.query.id)
    return '/welcome/' + to.query.id
  }
  if (!currentUser && to.name !== 'Login' && to.name !== 'Welcome' && to.name !== 'Setup') {
    console.log('Lets go to login!!! to.name= ', to.name)
    return { name: 'Login' }
  }
  return
})

// Every view below '/' is loaded lazily, and a deploy replaces every chunk
// filename. A tab left open still holds the previous build's index, so the
// first navigation to a view the user had not already visited asks for a file
// that is no longer on the server: the import rejects and the click does
// nothing at all, which is what the frozen page after an update actually is.
// Reloading picks up the new index and the navigation succeeds.
//
// A sessionStorage stamp keeps a genuinely missing chunk — a broken deploy, an
// offline device — from turning into a reload loop. One reload per minute per
// tab; after that the error surfaces normally.
const RELOAD_STAMP = 'chunk-reload-at'
const RELOAD_COOLDOWN_MS = 60000

function isStaleChunkError(err) {
  const message = err instanceof Error ? err.message : String(err ?? '')
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    // A view's stylesheet is preloaded alongside its code, and Vite words that
    // failure differently. It deserves the same reload: Vite abandons the
    // import when the stylesheet fails, so the view never appears even though
    // its code arrived intact.
    /Unable to preload CSS/i.test(message)
  )
}

function reloadOnceForStaleChunk(err) {
  if (!isStaleChunkError(err)) return
  try {
    const last = Number(sessionStorage.getItem(RELOAD_STAMP) ?? 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return
    sessionStorage.setItem(RELOAD_STAMP, String(Date.now()))
  } catch {
    // Private mode can refuse sessionStorage. Reloading once is still better
    // than a dead click; without the stamp we simply lose the loop guard.
  }
  window.location.reload()
}

// Vue Router surfaces a failed lazy view here.
router.onError(reloadOnceForStaleChunk)

// Vite surfaces a failed modulepreload here instead, before the router sees it.
window.addEventListener('vite:preloadError', (event) => {
  reloadOnceForStaleChunk(event.payload)
})

export default router
