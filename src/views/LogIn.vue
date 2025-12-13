<template>
  <div
    class="absolute inset-0 z-10 flex h-full place-items-center content-center justify-center"
    :class="[orientation == 'portrait-primary' ? 'back-login-phone' : 'back-login']"
  >
    <div class="overlay"></div>
    <!-- Password Reset Modal -->
    <div
      v-if="showResetModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="closeResetModal"
    >
      <div class="w-80 rounded-lg bg-white p-4 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Reset Password</h3>
        <p class="mb-3 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <MyInputText
          label="Email"
          v-model="resetEmail"
          placeholder="Enter your email"
          class="mb-3"
        />
        <p v-if="resetMessage" :class="resetMessageClass" class="mb-3 text-sm">
          {{ resetMessage }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="closeResetModal"
            class="rounded bg-gray-300 px-4 py-2 text-sm hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handlePasswordReset"
            :disabled="isResetting"
            class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isResetting ? 'Sending...' : 'Send Reset Email' }}
          </button>
        </div>
      </div>
    </div>
    <div class="w-80 rounded-lg border bg-white/80 backdrop-blur">
      <div class="w-full rounded-t-lg bg-gray-100/90 py-1">
        <h3>Safe Environment</h3>
      </div>
      <form class="mx-2 my-5">
        <div class="text-left">
          <MyInputText
            label="Email"
            v-model="user"
            placeholder="Email"
            autocomplete="autocomplete"
            class="mb-2"
          >
          </MyInputText>
          <MyInputPassword
            label="Password"
            v-model="password"
            placeholder="Password"
            autocomplete="current-password"
            :is-error="isError"
            class=""
          />
          <button
            type="button"
            @click="showResetModal = true"
            class="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Forgot Password?
          </button>
        </div>
        <MyInputCheckBox v-model="checkKeepLogin">Keep me logged in</MyInputCheckBox>
        <MyButton color="bg-blue-600" @click="signInWithEmail">Login</MyButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputPassword from '@/components/MyInputs/MyInputPassword.vue'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MyButton from '@/components/MyButton.vue'
import { computed, ref } from 'vue'
import { useScreenOrientation } from '@vueuse/core'
import { onKeyStroke } from '@vueuse/core'
import router from '@/router'
import { useFirebaseAuth } from 'vuefire'
import { AuthErrorCodes, signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth'

const auth = useFirebaseAuth()

const user = ref('')
const password = ref('')
const loginFailed = ref(false)

const checkKeepLogin = ref(false)

// Password reset state
const showResetModal = ref(false)
const resetEmail = ref('')
const resetMessage = ref('')
const resetMessageClass = ref('')
const isResetting = ref(false)

function closeResetModal() {
  showResetModal.value = false
  resetEmail.value = ''
  resetMessage.value = ''
  resetMessageClass.value = ''
}

async function handlePasswordReset() {
  if (!resetEmail.value) {
    resetMessage.value = 'Please enter your email address.'
    resetMessageClass.value = 'text-red-600'
    return
  }

  isResetting.value = true
  resetMessage.value = ''

  try {
    await sendPasswordResetEmail(auth, resetEmail.value)
    resetMessage.value = 'Password reset email sent! Check your inbox.'
    resetMessageClass.value = 'text-green-600'
    setTimeout(() => {
      closeResetModal()
    }, 3000)
  } catch (error) {
    console.log('Password reset error:', error.code)
    switch (error.code) {
      case AuthErrorCodes.INVALID_EMAIL:
        resetMessage.value = 'Please enter a valid email address.'
        break
      case AuthErrorCodes.USER_DELETED:
        resetMessage.value = 'No account found with this email.'
        break
      default:
        resetMessage.value = 'Failed to send reset email. Please try again.'
        break
    }
    resetMessageClass.value = 'text-red-600'
  } finally {
    isResetting.value = false
  }
}

const { orientation } = useScreenOrientation()
const isErrorLabel = ref("Sorry, User and Password didn't match")

const isError = computed(() => {
  const formula = password.value == '' && loginFailed.value
  const label = isErrorLabel.value
  return { formula, label }
})

onKeyStroke('Enter', (e) => {
  e.preventDefault()
  signInWithEmail()
})

// iKfvQKNpV6J2DEm
async function signInWithEmail() {
  console.log('User is going to sign in...')

  // Set persistence based on "Keep me logged in" checkbox
  const persistence = checkKeepLogin.value ? browserLocalPersistence : browserSessionPersistence

  try {
    await setPersistence(auth, persistence)
    await signInWithEmailAndPassword(auth, user.value, password.value)
    router.push('/')
    console.log('Successful!!!!!!!')
  } catch (error) {
    const errorCode = error.code
    const errorMessage = error.message
    console.log('Error Code: ', errorCode, '     Message: ', errorMessage)
    switch (errorCode) {
      case AuthErrorCodes.INVALID_EMAIL:
      case AuthErrorCodes.INVALID_RECIPIENT_EMAIL:
      case AuthErrorCodes.UNVERIFIED_EMAIL:
        isErrorLabel.value = 'Error: Invalid Email'
        break
      case AuthErrorCodes.INVALID_PASSWORD:
      case AuthErrorCodes.WEAK_PASSWORD:
        isErrorLabel.value = 'Error: Invalid Password'
        break
      case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
        isErrorLabel.value = 'Error: Too many failed login attempts. Try again in a few minutes.'
        break
      default:
        isErrorLabel.value = 'Error: Invalid Credentials'
        break
    }
    password.value = ''
    loginFailed.value = true
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #202a2f60; /* Adjust the opacity to darken/lighten */
}
.back-login {
  background-image: url('@/assets/login-img/mentoring-landscape-1280.jpg');
  background-size: cover;
  background-position: top right;
}
.back-login-phone {
  background-image: url('@/assets/login-img/mentoring-portrait-1024.jpg');
  background-size: cover;
  background-position: top right;
}

@media (max-width: 1024px) {
  .back-login {
    background-image: url('@/assets/login-img/mentoring-landscape-1024.jpg');
    background-size: cover;
    background-position: top right;
  }
  .back-login-phone {
    background-image: url('@/assets/login-img/mentoring-portrait-1024.jpg');
    background-size: cover;
    background-position: top right;
  }
}

@media (max-width: 768px) {
  .back-login {
    background-image: url('@/assets/login-img/mentoring-landscape-768.jpg');
    background-size: cover;
    background-position: top right;
  }
  .back-login-phone {
    background-image: url('@/assets/login-img/mentoring-portrait-768.jpg');
    background-size: cover;
    background-position: top right;
  }
}

@media (max-width: 640px) {
  .back-login {
    background-image: url('@/assets/login-img/mentoring-landscape-640.jpg');
    background-size: cover;
    background-position: top right;
  }
  .back-login-phone {
    background-image: url('@/assets/login-img/mentoring-portrait-640.jpg');
    background-size: cover;
    background-position: top right;
  }
}

@media (max-width: 420px) {
  .back-login {
    background-image: url('@/assets/login-img/mentoring-landscape-640.jpg');
    background-size: cover;
    background-position: top right;
  }
  .back-login-phone {
    background-image: url('@/assets/login-img/mentoring-portrait-420.jpg');
    background-size: cover;
    background-position: top right;
  }
}
</style>
