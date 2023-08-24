<template>
  <div
    ref="sidebar"
    @pointerenter="onEnterMenu"
    @pointerleave="onLeaveMenu"
    class="h-full overflow-x-hidden bg-slate-200/90 text-left transition-all backdrop:blur print:hidden"
    :class="[showSidemenu ? 'w-64' : 'w-full']"
  >
    <div v-if="!showSidemenu && !isLargeScreen" class="fixed top-2 left-2" @click="onClickShowOpen">
      <font-awesome-icon icon="bars" size="lg" class="text-blue-700" />
    </div>
    <div class="p-2">
      <!-- Title -->
      <div
        @click="onClickShowOpen"
        class="mb-10 flex w-full place-items-center rounded bg-blue-600 py-1 px-1 text-blue-50"
      >
        <font-awesome-icon icon="bars" size="lg" class="" />
        <div class="ml-4 text-xl">Praesidum</div>
      </div>
      <!-- Menu: Home -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="home" />
        <div class="ml-6 whitespace-nowrap line-through">My Status</div>
      </div>
      <!-- Menu: Personnel -->
      <div
        @click="goto('/personnel')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="users" />
        <div class="ml-6 whitespace-nowrap">* Personnel</div>
      </div>
      <!-- Menu: Corporations -->
      <div
        @click="goto('/corporations')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="shop" />
        <div class="ml-6 whitespace-nowrap">* Corporations</div>
      </div>
      <!-- Menu: Training -->
      <div
        @click="goto('/training')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="chalkboard-user" />
        <div class="ml-6 whitespace-nowrap">* Training</div>
      </div>
      <!-- Menu: Screening -->
      <div
        @click="goto('/screening')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="list-check" />
        <div class="ml-6 whitespace-nowrap">* Screening</div>
      </div>
      <!-- Menu: Sponsoring Entities -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="map-location-dot" />
        <div class="ml-6 whitespace-nowrap line-through">* Sites</div>
      </div>
      <!-- Menu: Participants -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-1 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="children" />
        <div class="ml-6 whitespace-nowrap line-through">Participants</div>
      </div>
      <!-- Menu: Activities -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="puzzle-piece" />
        <div class="ml-6 whitespace-nowrap line-through">Activities</div>
      </div>
      <!-- Abuse Report -->
      <div
        @click="goto('/')"
        class="flex cursor-pointer place-items-center rounded p-2 pl-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="person-burst" />
        <div class="ml-6 whitespace-nowrap line-through">Abuse Report</div>
      </div>
      <!-- Menu: Logout -->
      <div
        @click="onLogout"
        class="flex cursor-pointer place-items-center rounded p-2 text-slate-700 hover:bg-slate-400"
      >
        <FontAwesomeIcon icon="right-from-bracket" />
        <div class="ml-6 line-through">Logout</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRefs } from 'vue'
import { onClickOutside, useMediaQuery } from '@vueuse/core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useGeneralStore } from '@/stores/general'
import router from '@/router'

const sidebar = ref(null)
const showSidemenu = ref(false)
const stateBeforeClicking = ref(false)

const isLargeScreen = useMediaQuery('(min-width: 640px)')

const store = useGeneralStore()
const { keepLogin, validId } = toRefs(store)

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
function onLogout() {
  store.initUser()
  keepLogin.value = false
  validId.value = '0'
  router.push('/login')
}
onClickOutside(sidebar, () => {
  showSidemenu.value = false
})

</script>

<style scoped></style>
