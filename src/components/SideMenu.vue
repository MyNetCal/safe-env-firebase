<template>
  <div
    ref="sidebar"
    @pointerenter="onEnterMenu"
    @pointerleave="onLeaveMenu"
    class="h-full overflow-x-hidden bg-slate-200/90 text-left transition-all backdrop:blur print:hidden thinsb-menu"
    :class="[showSidemenu ? 'w-72' : 'w-full', store.currentBranch === 'Men' ? 'bg-slate-200/90' : 'bg-pink-100/90']"
  >
    <div v-if="!showSidemenu && !isLargeScreen" class="fixed left-2 top-1" @click="onClickShowOpen">
      <font-awesome-icon icon="bars" size="lg" class="text-blue-50" />
    </div>
    <div class="p-2">
      <!-- Title -->
      <div
        @click="onClickShowOpen"
        class="mb-4 flex w-full place-items-center rounded bg-blue-600 px-1 py-1 text-blue-50"
      >
        <font-awesome-icon icon="bars" size="lg" class="" />
        <div class="ml-4 whitespace-nowrap text-lg">Safe Environment</div>
      </div>
      <!-- Menu: Home -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="home" />
        <div class="ml-6 whitespace-nowrap">My Status</div>
      </div>
      <!-- Menu: Dashboard -->
      <div
      v-if="accessLevel >= 5"
        @click="goto('/dashboard')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="gauge" />
        <div class="ml-6 whitespace-nowrap">Dashboard</div>
      </div>
      <!-- Menu: Board -->
      <div
        v-if="accessLevel >= 2"
        @click="goto('/board')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="users-line" />
        <div class="ml-6 whitespace-nowrap"
        >Safe Environment Committee</div>
      </div>
      <!-- Menu: Personnel -->
      <div
        v-if="accessLevel > 1"
        @click="goto('/personnel')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="users" />
        <div class="ml-6 whitespace-nowrap">Personnel</div>
      </div>
      <!-- Menu: Corporations -->
      <div
        v-if="accessLevel >= 4"
        @click="goto('/corporations')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="shop" />
        <div class="ml-6 whitespace-nowrap">Corporations</div>
      </div>
      <!-- Menu: Training -->
      <div
        v-if="accessLevel > 2"
        @click="goto('/training')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="list-check" />
        <div class="ml-6 whitespace-nowrap">Training</div>
      </div>
      <!-- Menu: Screening -->
      <div
        v-if="accessLevel > 2"
        @click="goto('/screening')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="chalkboard-user" />
        <div class="ml-6 whitespace-nowrap">Screening</div>
      </div>
      <!-- Menu: Sponsoring Entities -->
      <div
        v-if="accessLevel >= 1"
        @click="goto('/Sites')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="map-location-dot" />
        <div class="ml-6 whitespace-nowrap">Sites</div>
      </div>
      <!-- Menu: Participants -->
      <div
        v-if="accessLevel >= 0"
        @click="goto('/participants')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="child" size="lg" />
        <div class="ml-6 whitespace-nowrap">Participants</div>
      </div>
      <!-- Menu: Activities -->
      <div
        v-if="accessLevel >= 0"
        @click="goto('/activities')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="puzzle-piece" />
        <div class="ml-6 whitespace-nowrap">Activities</div>
      </div>
      <!-- Abuse Report -->
      <div
        @click="goto('/incident')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="person-burst" />
        <div class="ml-6 whitespace-nowrap">Incident Report</div>
      </div>
      <!-- Log out -->
      <div
        @click="logout"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="right-from-bracket" />
        <div class="ml-6 whitespace-nowrap">Logout</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onClickOutside, useMediaQuery } from '@vueuse/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import router from '@/router'
import { signOut } from '@firebase/auth'
import { useFirebaseAuth } from 'vuefire'
import { useGeneralStore } from '@/stores/general'
// import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'

const sidebar = ref(null)
const showSidemenu = ref(false)
const stateBeforeClicking = ref(false)
const auth = useFirebaseAuth()

const store = useGeneralStore()

const accessLevel = computed(() => store.accessLevel)

const isLargeScreen = useMediaQuery('(min-width: 640px)')

function onEnterMenu() {
  stateBeforeClicking.value = showSidemenu.value
  showSidemenu.value = true
}
function onLeaveMenu() {
  if (isLargeScreen.value) {
    showSidemenu.value = false
  }
}

function goto(route) {
  if (!isLargeScreen.value) {
    showSidemenu.value = false
  }
  router.push(route)
}

function onClickShowOpen() {
  showSidemenu.value = !stateBeforeClicking.value
}

onClickOutside(sidebar, () => {
  showSidemenu.value = false
})

function logout() {
  signOut(auth)
    .then(() => {
      router.push('/login')
    })
    .catch((error) => {
      console.log(error)
    })
}

/* const allPanels = ref([]);
function onClickDisclosureButton(close, name) {
  if (allPanels.value.includes(name)) {
    return;
  }
  showSidemenu.value = true;
  allPanels.value.push(name);
  watchEffect(() => {
    if (!showSidemenu.value) {
      close();
    }
  });
} */
</script>

<style scoped>
  .thinsb-menu::-webkit-scrollbar {
    width: 4px;
    height: 8px;
  }

  /* Track */
  .thinsb-menu::-webkit-scrollbar-track {
    background: #e1e1e1;
  }

  /* Handle */
  .thinsb-menu::-webkit-scrollbar-thumb {
    background: #aaa;
    @apply rounded-md;
  }

  /* Handle on hover */
  .thinsb-menu::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
