<template>
  <div>
    <teleport to="#body">
      <div
        v-if="showInfo"
        class="tooltip absolute top-6 left-1/2 z-50 max-w-md rounded-lg border border-green-300 bg-green-100"
        :class="[cModal]"
      >
        <div
          class="flex items-center justify-between border-b border-green-300 bg-green-200 py-1 px-2 text-green-800"
        >
          <div>
            <font-awesome-icon icon="info-circle" />
            {{ infoTitle }}
          </div>
          <font-awesome-icon
            class="cursor-pointer"
            @click="showInfo = !showInfo"
            :icon="['far', 'window-close']"
          />
        </div>
        <div class="p-2 text-green-800"><slot></slot></div>
      </div>
    </teleport>
    <div class="text-xs text-slate-600" :class="{ 'cursor-pointer': info }" @click="onClickInfo">
      {{ label }}
      <font-awesome-icon v-if="info" icon="info-circle" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    label: { type: String, default: '' },
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' },
    colorModal: { type: String, default: 'green' } // No working yet...
  },
  data() {
    return { showInfo: false, showInfoClick: false }
  },
  computed: {
    cModal() {
      return 'bg-' + this.colorModal + '-100'
    }
  },
  created() {
    window.addEventListener('click', this.onEventClick)
  },
  unmounted() {
    window.removeEventListener('click', this.onEventClick)
  },
  methods: {
    onEventClick() {
      if (this.showInfoClick) {
        this.showInfoClick = false
        return
      }
      this.showInfo = false
    },
    onClickInfo() {
      this.showInfoClick = true
      this.showInfo = !this.showInfo && this.info
    }
  },
  setup() {}
}
</script>

<style scoped>
.tooltip {
  transform: translateX(-50%);
}
</style>
