<script setup>
import { RouterView } from 'vue-router'
import { useGeneralStore } from './stores/general'
import { storeToRefs } from 'pinia'
import SideMenu from './components/SideMenu.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getCurrentUser, useFirebaseAuth, useFirestore } from 'vuefire'
import { signOut } from 'firebase/auth'
import router from './router'
import MyListBox from './components/MyInputs/MyListBox.vue'
import { ref, watchEffect } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { useMediaQuery } from '@vueuse/core'

const storeGeneral = useGeneralStore()
const {
  countRequests,
  loginUser,
  loginUserCorporationCollection,
  loginUserId,
  loginUserCorporation,
  accessLevelName
} = storeToRefs(storeGeneral)

const db = useFirestore()

const auth = useFirebaseAuth()

const isLargeScreen = useMediaQuery('(min-width: 640px)')

getCurrentUser().then((user) => {
  if (!user) {
    router.push('/login')
  }
})
const selUserCorp = ref('')
watchEffect(() => {
  selUserCorp.value = loginUserCorporation.value || ''
})

function saveNuewLoginCorp() {
  const userDocRef = doc(db, 'Users', loginUserId.value)
  updateDoc(userDocRef, {
    CurrentUsersCorporationsId: selUserCorp.value.id
  })
}

function logout() {
  signOut(auth)
    .then(() => {
      router.push('/login')
    })
    .catch((error) => {
      console.log(error)
    })
}
</script>

<template>
  <div class="select-none bg-slate-50 text-center">
    <!-- App Layout -->
    <div class="app-layout-grid">
      <div v-show="countRequests > 0" class="absolute w-full">
        <div class="loader bg-slate-300">
          <div class="loaderBar"></div>
        </div>
      </div>
      <!-- Header -->
      <div class="app-layout-header flex place-items-center justify-between bg-blue-800 text-white">
        <!-- Header Left -->
        <div class="ml-1 flex grow place-items-center" v-if="loginUser">
          <FontAwesomeIcon v-if="isLargeScreen" icon="shop" class="ml-3" />
          <MyListBox
            :items="loginUserCorporationCollection"
            v-model="selUserCorp"
            title="CorporationName"
            @update:model-value="saveNuewLoginCorp"
            class="min-w-[120px] cursor-pointer rounded hover:bg-blue-500"
            :class="[isLargeScreen ? 'ml-2' : 'ml-6']"
          />
        </div>
        <!-- Header Center -->
        <div></div>
        <!-- Header Right -->
        <div class="mr-1 flex place-items-center justify-end">
          <div class="mr-2">{{ loginUser.Nickname }}</div>
          <FontAwesomeIcon icon="user" class="mr-4" />
          <div
            v-if="loginUser"
            @click="logout"
            class="flex w-fit cursor-pointer place-items-center rounded px-2 py-1 hover:bg-blue-500"
          >
            <div class="mr-2">Logout</div>
            <FontAwesomeIcon icon="right-from-bracket" />
          </div>
        </div>
      </div>
      <!-- Side Menu -->
      <div class="app-layout-sidebar z-10"><SideMenu /></div>
      <!-- Content -->
      <div class="app-layout-content text-slate-800">
        <RouterView />
      </div>
      <!-- Footer -->
      <div
        class="app-layout-footer z-10 flex place-items-center justify-between bg-slate-300 px-3 text-slate-800 print:hidden"
      >
        <div>v.2.2</div>
        <div class="flex">
          {{ accessLevelName }}
        </div>
      </div>
    </div>
    <!-- Modals -->
    <div id="body"></div>
  </div>
</template>

<style scoped>
.app-layout-grid {
  display: grid;
  grid-template-columns: [panel] 2px [main] 1fr [end];
  grid-template-rows: [header] 36px [main] 1fr [footer] 24px [end];
  grid-template-areas:
    'sidebar header'
    'sidebar content'
    'footer footer';
  width: 100vw;
  height: 100vh;
}
.app-layout-sidebar {
  grid-area: sidebar;
  max-height: calc(100vh - 24px);
}
@media (min-width: 640px) {
  .app-layout-grid {
    grid-template-columns: [panel] 40px [main] 1fr [end];
    grid-template-areas:
      'header header'
      'sidebar content'
      'footer footer';
  }
  .app-layout-sidebar {
    grid-area: sidebar;
    max-height: calc(100vh - 36px - 24px);
  }
}
.app-layout-header {
  grid-area: header;
}

.app-layout-content {
  grid-area: content;
  width: calc(100vw - 40px);
  max-height: calc(100vh - 36px - 24px);
  overflow: hidden;
}
.app-layout-footer {
  grid-area: footer;
}
input,
textarea {
  border: 0pt;
}
.loader {
  margin: auto;
  border-radius: 2px;
  border: 0px solid transparent;
  position: relative;
  padding: 2px;
}
.loader:before {
  content: '';
  border: 1px solid #fff;
  border-radius: 1px;
  position: absolute;
  top: -2px;
  right: 0px;
  bottom: 0px;
  left: -2px;
}
.loader .loaderBar {
  position: absolute;
  border-radius: 2px;
  top: 0;
  right: 100%;
  bottom: 0;
  left: 0;
  width: 0;
  animation: borealisBar 0.8s linear infinite;
  @apply bg-amber-500;
}
@keyframes borealisBar {
  0% {
    left: 0%;
    right: 100%;
    width: 0%;
  }
  40% {
    left: 0%;
    right: 50%;
    width: 50%;
  }
  90% {
    right: 0%;
    left: 80%;
    width: 20%;
  }
  100% {
    left: 100%;
    right: 0%;
    width: 0%;
  }
}
</style>
