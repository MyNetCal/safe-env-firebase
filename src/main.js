import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { VueFire } from 'vuefire'
import { firebaseApp } from '@/firebase.js'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import {
  faUserSecret,
  faInfoCircle,
  faTimes,
  faEye,
  faEyeSlash,
  faBars,
  faUser,
  faUsers,
  faUserPlus,
  faCaretDown,
  faCircle,
  faHome,
  faChevronLeft,
  faChevronRight,
  faMale,
  faFemale,
  faMapLocationDot,
  faRightFromBracket,
  faChildren,
  faPuzzlePiece,
  faDeleteLeft,
  faCalendar,
  faPersonBurst,
  faListCheck,
  faUsersLine,
  faUserTie,
  faChurch,
  faPeopleGroup,
  faHouse,
  faHotel,
  faShop,
  faXmark,
  faCheck,
  faExclamation,
  faBellConcierge,
  faUserCheck,
  faPenToSquare,
  faTrash,
  faUserClock,
  faThumbsUp,
  faChalkboardUser,
  faUserPen,
  faPersonBooth,
  faCheckToSlot,
  faCloudArrowUp,
  faFile,
  faFileArchive,
  faPlusSquare
} from '@fortawesome/free-solid-svg-icons'
import { faWindowClose, faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'

library.add(
  faUserSecret,
  faInfoCircle,
  faTimes,
  faEye,
  faEyeSlash,
  faWindowClose,
  faCheckSquare,
  faSquare,
  faBars,
  faUser,
  faUsers,
  faUserPlus,
  faCaretDown,
  faCircle,
  faHome,
  faChevronLeft,
  faChevronRight,
  faSquare,
  faMale,
  faFemale,
  faMapLocationDot,
  faRightFromBracket,
  faChildren,
  faPuzzlePiece,
  faDeleteLeft,
  faCalendar,
  faPersonBurst,
  faListCheck,
  faUsersLine,
  faUserTie,
  faChurch,
  faPeopleGroup,
  faHouse,
  faHotel,
  faShop,
  faXmark,
  faCheck,
  faExclamation,
  faCircle,
  faBellConcierge,
  faUserCheck,
  faPenToSquare,
  faTrash,
  faUserClock,
  faThumbsUp,
  faChalkboardUser,
  faUserPen,
  faPersonBooth,
  faCheckToSlot,
  faCloudArrowUp,
  faFile,
  faFileArchive,
  faPlusSquare
)

const app = createApp(App)

app.use(createPinia())
app.use(VueFire, {
  firebaseApp,
  modules: []
})

app
  .use(router)
  .component('font-awesome-icon', FontAwesomeIcon)
  .component('font-awesome-layers', FontAwesomeLayers)

app.mount('#app')
