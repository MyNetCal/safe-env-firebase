<template>
  <!-- Regular Input -->
  <div class="relative mb-4 flex place-items-center pt-0 text-left">
    <div class="">
      <!-- info dialog -->
      <my-info-modal :info="info" :info-title="infoTitle" :label="label"
        ><slot></slot>
      </my-info-modal>
      <!-- checkbox -->
      <div
        type="checkbox"
        tabindex="0"
        :value="modelValue"
        @click="onClick"
        true-value="trueValue"
        placeholder="Regular Input"
        class="flex h-9 w-min place-items-center justify-center rounded border-none bg-white px-2 shadow outline-none hover:shadow-md focus:outline-none focus:ring-0 active:shadow-inner"
        :class="{
          'ring-1 ring-red-500': isError.formula,
          'cursor-not-allowed text-slate-400': disable
        }"
      >
        <font-awesome-icon
          :icon="['far', 'check-square']"
          size="lg"
          v-if="modelValue == trueValue"
        ></font-awesome-icon>
        <font-awesome-icon :icon="['far', 'square']" size="lg" v-else></font-awesome-icon>
      </div>
      <!-- validation -->
      <div v-if="isError.formula" class="absolute text-xs text-red-500">
        {{ isError.label }}
      </div>
    </div>
    <div class="pl-2 text-sm"><slot></slot></div>
  </div>
</template>

<script>
import MyInfoModal from './MyInfoModal.vue'
export default {
  components: { MyInfoModal },
  props: {
    modelValue: {},
    label: String,
    isError: {
      type: Object,
      default: () => {
        return { formula: false, label: '' }
      }
    },
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' },
    disable: { type: Boolean, default: false },
    trueValue: { default: true },
    falseValue: { default: false }
  },
  emits: ['update:modelValue'],
  data() {
    return {}
  },
  methods: {
    onClick() {
      if (!this.disable) {
        this.$emit('update:modelValue', !(this.modelValue == this.trueValue) ? this.trueValue : this.falseValue)
      }
    }
  }
}
</script>

<style scoped></style>
