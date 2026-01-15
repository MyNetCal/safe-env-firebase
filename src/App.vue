<script setup>
import { RouterView } from 'vue-router'
import { useGeneralStore } from './stores/general'
import { storeToRefs } from 'pinia'
import SideMenu from './components/SideMenu.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useCollection, useFirestore, useFirebaseAuth } from 'vuefire'
import MyListBox from './components/MyInputs/MyListBox.vue'
import { computed, ref, watchEffect } from 'vue'
import { collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useMediaQuery } from '@vueuse/core'
import MyInfoMessage from './components/MyInfoMessage.vue'
import { updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'

const storeGeneral = useGeneralStore()
const {
  countRequests,
  loginUser,
  loginUserActiveCorporationCollection,
  loginUserId,
  loginUserCorporation,
  accessLevelName,
  currentBranch
} = storeToRefs(storeGeneral)

const db = useFirestore()
const auth = useFirebaseAuth()

const isLargeScreen = useMediaQuery('(min-width: 640px)')

// User menu dropdown
const showUserMenu = ref(false)
const showEmailModal = ref(false)
const newEmail = ref('')
const currentPassword = ref('')
const emailChangeMessage = ref('')
const emailChangeMessageClass = ref('')
const isChangingEmail = ref(false)

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

const messagesPendingRef = computed(() =>
  collection(db, 'Users', loginUserId.value, 'MessagesPending')
)
const messagesPending = useCollection(messagesPendingRef)

function deleteMessage(id) {
  deleteDoc(doc(db, 'Users', loginUserId.value, 'MessagesPending', id))
}

function closeEmailModal() {
  showEmailModal.value = false
  newEmail.value = ''
  currentPassword.value = ''
  emailChangeMessage.value = ''
  emailChangeMessageClass.value = ''
}

async function handleEmailChange() {
  if (!newEmail.value || !currentPassword.value) {
    emailChangeMessage.value = 'Please fill in all fields.'
    emailChangeMessageClass.value = 'text-red-600'
    return
  }

  isChangingEmail.value = true
  emailChangeMessage.value = ''

  try {
    const credential = EmailAuthProvider.credential(loginUser.value.Email, currentPassword.value)
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updateEmail(auth.currentUser, newEmail.value)

    const userDocRef = doc(db, 'Users', loginUserId.value)
    await updateDoc(userDocRef, { Email: newEmail.value })

    emailChangeMessage.value = 'Email updated successfully!'
    emailChangeMessageClass.value = 'text-green-600'
    setTimeout(() => closeEmailModal(), 2000)
  } catch (error) {
    console.log('Email change error:', error.code)
    switch (error.code) {
      case 'auth/wrong-password':
        emailChangeMessage.value = 'Current password is incorrect.'
        break
      case 'auth/email-already-in-use':
        emailChangeMessage.value = 'This email is already in use.'
        break
      case 'auth/invalid-email':
        emailChangeMessage.value = 'Please enter a valid email address.'
        break
      case 'auth/requires-recent-login':
        emailChangeMessage.value = 'Please log out and log back in to change your email.'
        break
      default:
        emailChangeMessage.value = 'Failed to update email. Please try again.'
        break
    }
    emailChangeMessageClass.value = 'text-red-600'
  } finally {
    isChangingEmail.value = false
  }
}
</script>

<template>
  <div class="select-none bg-slate-50 text-center" @click="showUserMenu = false">
    <!-- App Layout -->
    <div class="app-layout-grid">
      <div v-show="countRequests > 0" class="absolute w-full">
        <div class="loader bg-slate-300">
          <div class="loaderBar"></div>
        </div>
      </div>
      <!-- Header -->
      <div class="app-layout-header flex place-items-center justify-between bg-sky-700 text-white">
        <!-- Header Left -->
        <div v-if="loginUser" class="ml-1 flex grow place-items-center">
          <FontAwesomeIcon v-if="isLargeScreen" icon="shop" class="ml-3" />
          <MyListBox
            v-model="selUserCorp"
            :items="loginUserActiveCorporationCollection"
            title="CorporationName"
            class="min-w-[120px] cursor-pointer rounded hover:bg-blue-500"
            :class="[isLargeScreen ? 'ml-2' : 'ml-6']"
            @update:model-value="saveNuewLoginCorp"
          />
        </div>
        <!-- Header Center -->
        <div></div>
        <!-- Header Right -->
        <div class="mr-1 flex place-items-center justify-end">
          <div
            class="relative mr-2 flex cursor-pointer place-items-center rounded px-2 py-1 hover:bg-blue-500"
            @click.stop="showUserMenu = !showUserMenu"
          >
            <div class="mr-2">{{ loginUser.Nickname }}</div>
            <FontAwesomeIcon icon="user" class="mr-1" />
            <FontAwesomeIcon :icon="showUserMenu ? 'chevron-up' : 'chevron-down'" size="xs" />

            <!-- User Menu Dropdown -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 top-9 z-50 w-48 rounded-md border border-gray-200 bg-white py-1 text-slate-700 shadow-lg"
            >
              <button
                @click="showEmailModal = true; showUserMenu = false"
                class="flex w-full items-center px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                <FontAwesomeIcon icon="envelope" class="mr-3" />
                Change Email
              </button>
            </div>
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
        <div>v.7.0</div>
        <div class="flex">{{ accessLevelName }} [{{ storeGeneral.accessLevel }}] - {{ currentBranch }}</div>
      </div>
    </div>

    <!-- Email Messages -->
    <div class="absolute bottom-20 z-50 flex w-full justify-center">
      <div class="">
        <TransitionGroup name="bounce">
          <div v-for="message in messagesPending" :key="message.id">
            <div class="my-2 rounded bg-slate-100/40 p-1 text-left shadow-lg backdrop-blur">
              <div
                class="mx-auto w-full max-w-xl rounded bg-green-700 text-white"
                :class="{
                  'bg-slate-600': message.state == 'PENDING',
                  'bg-green-700': message.state == 'SUCCESS',
                  'bg-red-700': message.state == 'ERROR'
                }"
              >
                <div class="flex place-items-center justify-between">
                  <div class="px-3">
                    <FontAwesomeIcon
                      size="2x"
                      :icon="
                        ['circle-check', 'triangle-exclamation', 'spinner'].at(
                          ['SUCCESS', 'ERROR', 'PENDING'].indexOf(message.state)
                        )
                      "
                      :spin="message.state == 'PENDING'"
                    />
                  </div>
                  <div class="py-3 pl-1">
                    <div>
                      {{ message.message }}
                    </div>
                    <div v-if="message.rejected.length > 0">
                      Rejected: {{ message.rejected.join(', ') }}
                    </div>
                  </div>
                  <div class="ml-3 cursor-pointer px-3 py-2" @click="deleteMessage(message.id)">
                    <FontAwesomeIcon icon="times" size="xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <MyInfoMessage
      v-model="storeGeneral.infoMessage.show"
      :class="storeGeneral.infoMessage.colorClass"
      :spinner="storeGeneral.infoMessage.spinner"
      :close-button="storeGeneral.infoMessage.closeButton"
      :time="storeGeneral.infoMessage.time"
      :timer="storeGeneral.infoMessage.timer"
      >{{ storeGeneral.infoMessage.message }}</MyInfoMessage
    >

    <!-- Email Change Modal -->
    <div
      v-if="showEmailModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="closeEmailModal"
    >
      <div class="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">Change Email Address</h3>
        <p class="mb-4 text-sm text-gray-600">Enter your current password and new email address.</p>

        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              v-model="currentPassword"
              type="password"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">New Email Address</label>
            <input
              v-model="newEmail"
              type="email"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Enter new email"
            />
          </div>
          <p v-if="emailChangeMessage" :class="emailChangeMessageClass" class="text-sm">
            {{ emailChangeMessage }}
          </p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="closeEmailModal"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleEmailChange"
            :disabled="isChangingEmail"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isChangingEmail ? 'Updating...' : 'Update Email' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div id="messages" class="absolute bottom-20 z-50 w-full"></div>
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

.app-layout-header {
  grid-area: header;
}

.app-layout-content {
  grid-area: content;
  width: calc(100vw - 2px);
  max-height: calc(100vh - 36px - 24px);
  overflow: hidden;
}
@media (min-width: 640px) {
  .app-layout-grid {
    grid-template-columns: [panel] 46px [main] 1fr [end];
    grid-template-areas:
      'header header'
      'sidebar content'
      'footer footer';
  }
  .app-layout-sidebar {
    grid-area: sidebar;
    max-height: calc(100vh - 36px - 24px);
  }
  .app-layout-content {
    grid-area: content;
    width: calc(100vw - 46px);
    max-height: calc(100vh - 36px - 24px);
    overflow: hidden;
  }
}
@media (max-height: 600px) {
  .app-layout-grid {
    grid-template-columns: [panel] 46px [main] 1fr [end];
    grid-template-areas:
      'header header'
      'sidebar content'
      'footer footer';
  }
  .app-layout-sidebar {
    grid-area: sidebar;
    max-height: calc(100vh - 36px - 24px);
  }
  .app-layout-content {
    grid-area: content;
    width: calc(100vw - 46px);
    max-height: calc(100vh - 36px - 24px);
    overflow: hidden;
  }
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
.bounce-enter-active {
  animation: bounce-in 0.2s;
}
.bounce-leave-active {
  animation: bounce-in 0.2s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
