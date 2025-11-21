<template>
  <!-- Regular Input -->
  <div class="relative mb-4 pt-0" :name="'input-' + label">
    <my-info-modal :info="info" :info-title="infoTitle" :label="label">
      <slot></slot>
    </my-info-modal>

    <div class="relative">
      <input
        :disabled="deactivated"
        ref="input"
        :type="type"
        @focus="onFocus"
        @blur="onBlur"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @keyup.enter="onKeyEnter"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="relative w-full rounded border-0 bg-white px-2 py-2 text-sm placeholder-gray-300 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300"
        :class="{
          'ring-1 ring-red-500': (isError.formula && !deactivated) || (strong && !isStrong),
          'cursor-not-allowed bg-gray-100 text-sky-800': deactivated,
          'text-sky-900': !deactivated
        }"
      />
      <div class="absolute right-0 top-0 cursor-pointer py-2 px-2 text-gray-500" @click="onEye">
        <font-awesome-icon :icon="icon"></font-awesome-icon>
      </div>
    </div>

    <div v-if="isError.formula && !deactivated" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
    <div v-if="strong && !isStrong && modelValue" class="absolute text-xs text-red-500">
      This password is too weak
    </div>
  </div>
</template>

<script>
import { computed, ref, toRefs } from 'vue'
import MyInfoModal from './MyInfoModal.vue'
export default {
  data() {
    return {}
  },
  methods: {
    onFocus() {
      this.$emit('onFocus')
    },
    onBlur(e) {
      const name = e.relatedTarget?.getAttribute('name')
      this.$emit('onBlur', name)
    },
    onKeyEnter() {
      this.$emit('onKeyEnter')
    }
  }
}
</script>

<script setup>
/* global defineProps defineEmits */

const props = defineProps({
  modelValue: String,
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  isError: {
    type: Object,
    default: () => {
      return { formula: false, label: '' }
    }
  },
  clear: {
    type: Boolean,
    default: false
  },
  strong: { type: Boolean, default: false },
  info: { type: Boolean, default: false },
  infoTitle: { type: String, default: '' },
  deactivated: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'current-password' }
})
defineEmits(['update:modelValue', 'onFocus', 'onBlur', 'onKeyEnter'])

const { modelValue } = toRefs(props)
const icon = ref('eye-slash')
const type = ref('password')

// 6-20 chars: 1 digit, 1 Upercase, 1 Lowercase
//const isWeakReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
// 7-15 chars: 1 digit, 1 Special char
//const isMediumReg = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
// 8-15 chars: 1 Lowercase, 1 Upercase, 1 Digit, 1 Special char
const isStrongReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/

//const isWeak = computed(() => modelValue.value.match(isWeakReg));
const isStrong = computed(() => modelValue.value.match(isStrongReg))
function onEye(e) {
  e.preventDefault()
  icon.value = icon.value == 'eye' ? 'eye-slash' : 'eye'
  type.value = icon.value == 'eye' ? 'text' : 'password'
}
</script>
