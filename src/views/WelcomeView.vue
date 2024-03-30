<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputPassword from '@/components/MyInputs/MyInputPassword.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { toRefs, ref, computed } from 'vue'
import { useScreenOrientation } from '@vueuse/core'
import { useFirebaseAuth, useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import router from '@/router'

const props = defineProps({ id: String })
const { id } = toRefs(props)

const auth = useFirebaseAuth()
const db = useFirestore()

const userEmail = ref('')
const password = ref('')
const password2 = ref('')

const { orientation } = useScreenOrientation()

const userRef = doc(db, 'Users', id.value)
const user = ref(null)
console.log('We are in welcome!');
getDoc(userRef).then((u) => {
  user.value = u.data()
  userEmail.value = user.value?.Email || ''
  if (user.value?.LastLogin) {
    console.log('User has already login! Redirecting to Login page ', user.value?.Name);
    router.push('/')
  }
})

const loginFailed = ref(false)
const isErrorLabel = ref('Password no valid!')

const isError = computed(() => {
  const formula = password.value == '' && loginFailed.value
  const label = isErrorLabel.value
  return { formula, label }
})

const isValidPasswords = computed(
  () => password.value.length >= 8 && password.value == password2.value
)

function createNewUser() {
  console.log('Create new user')
  createUserWithEmailAndPassword(auth, userEmail.value, password.value)
    .then(() => {
      // Signed in
      router.push('/')
      // ...
    })
    .catch((error) => {
      //const errorCode = error.code
      isErrorLabel.value = error.message
      const errorCode = error.code
      const errorMessage = error.message

      console.log(
        'Error: ',
        error,
        '  ==>  Error Code: ',
        errorCode,
        '     Message: ',
        errorMessage
      )
    })
}
</script>

<template>
  <div
    class="back-login absolute inset-0 z-10 flex h-full place-items-center content-center justify-center bg-cover bg-right"
    :class="[orientation == 'portrait-primary' ? 'back-login-phone' : 'back-login']"
  >
    <div class="w-80 rounded-lg border bg-white/80 backdrop-blur">
      <div class="w-full rounded-t-lg bg-gray-300/90 py-1 shadow">
        <h3>Welcome to SafeEnv App</h3>
      </div>
      <h2 class="mt-2">{{ user?.Name }} {{ user?.LastName }}</h2>
      <form class="mx-2 my-2">
        <div class="text-left">
          <MyInputText
            label="Email"
            v-model="userEmail"
            placeholder="Username"
            autocomplete="autocomplete"
            deactivated
            class="mb-6"
          >
          </MyInputText>
          <MyInputPassword
            label="Enter New Password"
            v-model="password"
            placeholder="Password"
            autocomplete="current-password"
            class=""
          />
          <div class="relative -top-4 text-xs text-slate-500">At least 8 characters</div>
          <MyInputPassword
            label="Re-enter Password"
            v-model="password2"
            placeholder="Password"
            autocomplete="current-password"
            :isError="isError"
            class="mb-6"
          />
        </div>
        <MyButton color="bg-blue-600 mb-3" @click="createNewUser" :disabled="!isValidPasswords"
          >Login</MyButton
        >
      </form>
    </div>
  </div>
</template>

<style scoped>
.back-login {
  background-image: url('@/assets/login-img/mentoring-landscape-1280.jpg');
}
.back-login-phone {
  background-image: url('@/assets/login-img/mentoring-portrait-1024.jpg');
}
</style>
