<template>
  <!-- Regular Input -->
  <div class="relative pt-0">
    <my-info-modal :info="info" :infoTitle="infoTitle" :label="label"><slot></slot> </my-info-modal>

    <div class="relative">
      <textarea
        ref="input"
        :value="modelValue"
        :rows="rows"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        class="mostly-customized-scrollbar relative w-full rounded border-0 bg-white px-1 py-1 text-sm text-sky-900 placeholder-gray-400 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300"
        :class="{ 'ring-1 ring-red-500': isError.formula }"
        v-bind="$attrs"
      ></textarea>
      <div
        v-if="clear && modelValue != ''"
        class="absolute right-3 -top-1 text-gray-600"
        @click="onClear"
      >
        <FontAwesomeIcon icon="times"></FontAwesomeIcon>
      </div>
    </div>

    <div v-if="isError.formula" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInfoModal from './MyInfoModal.vue'
export default {
  components: { MyInfoModal, FontAwesomeIcon },
  props: {
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
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' },
    rows: { type: String, default: '3' }
  },
  emits: ['update:modelValue'],
  data() {
    return {}
  },
  methods: {
    onClear() {
      this.$refs.input.value = ''
      this.$emit('update:modelValue', '')
    }
  }
}
</script>

<style scoped>
.mostly-customized-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 8px;
  border-radius: 3px;
  background-color: white; /* or add it to the track */
}
.mostly-customized-scrollbar::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 3px;
}
.scrollbar-white::-webkit-scrollbar {
  width: 6px;
  height: 8px;
  border-radius: 3px;
  background-color: white; /* or add it to the track */
}
.scrollbar-white::-webkit-scrollbar-thumb {
  background: white;
  border-radius: 3px;
}
</style>
