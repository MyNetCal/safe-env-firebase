<script setup>
import MyButton from '@/components/MyButton.vue';
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue';
import MyInputPassword from '@/components/MyInputs/MyInputPassword.vue';
import MyInputText from '@/components/MyInputs/MyInputText.vue';
import { toRefs, ref } from 'vue'
import { useScreenOrientation } from '@vueuse/core'


const props = defineProps({email: String})
const {email} = toRefs(props)

const user = ref(email.value)
const password = ref('')

const { orientation } = useScreenOrientation()

</script>

<template>
  <div
    class="back-login absolute inset-0 z-10 flex h-full place-items-center content-center justify-center bg-cover bg-right"
    :class="[orientation == 'portrait-primary' ? 'back-login-phone' : 'back-login']"
  >
    <div class="w-80 rounded-lg border bg-white/80 backdrop-blur">
      <div class="w-full rounded-t-lg bg-gray-100/90 py-1">
        <h3>Welcome to SafeEnv App</h3>
      </div>
      <form class="mx-2 my-5">
        <div class="text-left">
          <MyInputText
            label="Email"
            v-model="user"
            placeholder="Username"
            autocomplete="autocomplete"
            deactivated
          >
          </MyInputText>
          <MyInputPassword
            label="Enter New Password"
            v-model="password"
            placeholder="Password"
            autocomplete="current-password"
            :isError="isError"
            class="mb-6"
          />
        </div>
        <MyInputCheckBox v-model="checkKeepLogin">Keep me logged in</MyInputCheckBox>
        <MyButton color="bg-blue-600" @click="signInWithEmail">Login</MyButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.back-login {
  background-image: url("@/assets/mentoring.jpg");
}
.back-login-phone {
  background-image: url("@/assets/mentoring-landscape.jpg");
}
</style>
