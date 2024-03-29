<template>
  <div
    class="absolute inset-0 z-10 flex h-full place-items-center content-center justify-center"
    :class="[orientation == 'portrait-primary' ? 'back-login-phone' : 'back-login']"
  >
    <div class="overlay"></div>
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
            :isError="isError"
            class=""
          />
          
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
import { AuthErrorCodes, signInWithEmailAndPassword } from 'firebase/auth'

const auth = useFirebaseAuth()

const user = ref('')
const password = ref('')
const loginFailed = ref(false)

const checkKeepLogin = ref(false)

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
function signInWithEmail() {
  console.log('User is going to sign in...')
  signInWithEmailAndPassword(auth, user.value, password.value)
    .then(() => {
      router.push('/')
      console.log('Succesful!!!!!!!')
      // Signed in
      //user.value = userCredential.user
      // ...
    })
    .catch((error) => {
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
      // ..
    })
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
