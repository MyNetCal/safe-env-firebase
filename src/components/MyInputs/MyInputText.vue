<template>
  <!-- Regular Input -->
  <div class="relative pt-0" :name="'input-' + label" :class="{ 'mb-4': isError.label != '' }">
    <my-info-modal :info="info" :infoTitle="infoTitle" :label="label">
      <slot></slot>
    </my-info-modal>

    <div class="relative">
      <input
        :disabled="deactivated"
        :name="name"
        ref="input"
        :type="typeInput"
        @keyup.tab="$emit('onKeyTab')"
        @focus="onFocus"
        @blur="onBlur"
        :value="modelValue"
        @input="onInput"
        @change="onChange"
        @keyup.enter="onKeyEnter"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="input-ring relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        :class="{
          'ring-1 ring-red-500 focus:ring-red-300': (isError.formula || !isValid) && !deactivated,
          'cursor-not-allowed bg-gray-100 text-sky-800': deactivated,
          'text-sky-900': !deactivated
        }"
      />
      <div
        v-if="clear && modelValue != '' && !deactivated"
        class="absolute right-0 top-0 py-2 px-2 text-gray-500"
        @click="onClear"
      >
        <font-awesome-icon icon="times"></font-awesome-icon>
      </div>
    </div>

    <div v-if="(isError.formula || !isValid) && !deactivated" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
  </div>
</template>

<script>
import MyInfoModal from './MyInfoModal.vue'
export default {
  components: { MyInfoModal },
  props: {
    modelValue: {},
    isValid: { type: Boolean, default: true },
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
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' },
    deactivated: { type: Boolean, default: false },
    autocomplete: { type: String, default: 'off' },
    typeInput: { type: String, default: 'text' },
    requiered: { type: Boolean, default: true }
  },
  emits: [
    'update:modelValue',
    'update:isValid',
    'onFocus',
    'onBlur',
    'onKeyEnter',
    'onKeyTab',
    'onChange'
  ],
  data() {
    return {
      name: this.$attrs.name
    }
  },
  mounted() {
    if (this.typeInput == 'tel') {
      this.validateTel()
      return
    }
    if (this.typeInput == 'email') {
      this.validateEmail(this.modelValue)
      return
    }
  },
  updated() {
    if (this.typeInput == 'tel') {
      this.validateTel()
      return
    }
    if (this.typeInput == 'email') {
      this.validateEmail(this.modelValue)
      return
    }
  },
  methods: {
    onClear() {
      this.$refs.input.value = ''
      this.$emit('update:modelValue', '')
      this.$refs.input.focus()
    },
    onFocus() {
      this.$emit('onFocus')
    },
    onBlur(e) {
      const name = e.relatedTarget?.getAttribute('name')
      this.$emit('onBlur', name)
    },
    onKeyEnter() {
      this.$emit('onKeyEnter')
    },
    validateTel() {
      if (this.typeInput == 'tel') {
        if (!this.requiered && this.modelValue == '') {
          this.$emit('update:isValid', true)
          return
        }
        var x = this.modelValue.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/)
        x = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '')
        if (x != this.modelValue) {
          this.$emit('update:modelValue', x)
        }

        if (x.length != 14) {
          this.$emit('update:isValid', false)
          return
        }
        this.$emit('update:isValid', true)
      }
    },
    validateEmail(email) {
      console.log('validating...', email)
      if (!this.requiered && email == '') {
        this.$emit('update:isValid', true)
        return
      }
      // eslint-disable-next-line no-useless-escape
      const b = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
      this.$emit('update:isValid', b)
      console.log('b: ', b)
    },
    onInput(e) {
      this.$emit('update:modelValue', e.target.value)
    },
    onChange(e) {
      this.$emit('onChange', e.target.value)
    }
  }
}
</script>
