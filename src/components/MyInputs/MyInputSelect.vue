<template>
  <div class="mb-4 pt-0">
    <my-info-modal :info="info" :infoTitle="infoTitle" :label="label">
      <slot></slot>
    </my-info-modal>
    <div
      :tabindex="tabindex"
      @blur="isFocus = false"
      class="relative rounded"
      :class="{ 'focus:outline-none focus:ring-1': !deactivated }"
      ref="inputSelect"
    >
      <div
        class="focus:shadow-outline relative w-full rounded bg-white px-2 py-2 text-sm text-sky-900 placeholder-gray-300 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1"
        id="user-menu"
        aria-haspopup="true"
        @click="onClick"
        :class="{
          'ring-1 ring-red-500': isError.formula,
          'cursor-not-allowed bg-gray-100': deactivated
        }"
      >
        <span class="text-gray-400" v-if="labelSelected == '' && placeholder">
          {{ placeholder }}
        </span>
        <span v-else-if="labelSelected == ''">&nbsp;</span>
        <span v-else v-html="labelSelected"></span>

        <font-awesome-icon icon="caret-down" class="float-right ml-1" />
      </div>
      <div
        v-if="isFocus"
        :class="`${heightClass} ring-blue absolute left-0 z-50 w-full origin-top-right overflow-y-auto
        rounded bg-white py-1 text-left shadow-lg ring-1 ring-opacity-80`"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="user-menu"
      >
        <template v-for="item in items" :key="item.value">
          <div
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            @click="onSelected(item)"
          >
            <span v-html="item.label"></span>
          </div>
        </template>
      </div>
    </div>
    <div v-if="isError.formula" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
  </div>
</template>
<script>
import MyInfoModal from './MyInfoModal.vue'
export default {
  components: { MyInfoModal },
  props: {
    modelValue: String,
    label: { type: String, default: '' },
    items: Array,
    placeholder: { type: String, default: '' },
    isError: {
      type: Object,
      default: () => {
        return { formula: false, label: '' }
      }
    },
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' },
    heightClass: { type: String, default: 'max-h-40' },
    deactivated: { type: Boolean, default: false }
  },
  emits: ['input', 'update:modelValue'],
  data() {
    return {
      isFocus: false,
      isHover: false,

      tabindex: 0
    }
  },
  computed: {
    labelSelected() {
      return this.items.find((element) => element.value == this.modelValue)?.label || ''
    }
  },
  mounted() {},
  methods: {
    onSelected(sel) {
      this.isFocus = false
      this.$emit('update:modelValue', sel.value)
    },
    onClick() {
      if (!this.deactivated) this.isFocus = !this.isFocus
    }
  }
}
</script>
