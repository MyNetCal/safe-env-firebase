<template>
  <div class="">
    <teleport to="#body">
      <div class="z-20">
        <div v-if="showModal" class="fixed inset-0 z-20 bg-black opacity-25"></div>
        <div
          v-if="showModal"
          class="fixed inset-1 z-20 items-center justify-center outline-none focus:outline-none"
        >
          <span></span>
          <div class="relative my-1 mx-auto w-auto bg-slate-200" :class="[maxWidth]">
            <!--content-->
            <div
              class="relative flex w-full flex-col rounded-lg border-0 bg-slate-50/80 shadow-lg outline-none backdrop-blur focus:outline-none"
            >
              <!--header-->
              <div
                class="flex items-start justify-between rounded-t border-b border-solid border-slate-200 bg-slate-200 py-1 pl-3"
              >
                <h5 class="text-slate-700">{{ title }}</h5>
                <span v-on:click="$emit('onClose')" class="cursor-pointer pr-3">
                  <font-awesome-icon
                    :icon="['far', 'window-close']"
                    size="lg"
                    class="text-slate-500"
                  ></font-awesome-icon>
                </span>
              </div>
              <!--body-->
              <div
                class="modal-max-height mostly-customized-scrollbar relative flex-auto overflow-x-auto overflow-y-auto px-2 text-left"
                :class="{ 'modal-height': maxHight }"
              >
                <slot></slot>
              </div>
              <!--footer-->
              <div class="flex items-center justify-end rounded-b px-2">
                <slot name="footer"></slot>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
export default {
  components: {},
  props: {
    showModal: Boolean,
    title: String,
    dark: { type: Boolean, default: false },
    maxWidth: { type: String, default: 'max-w-4xl' },
    maxHight: { type: Boolean, defaault: false }
  },
  emits: ['onClose', 'onOpenModal', 'onCloseModal'],
  data() {
    return {}
  },
  watch: {
    showModal(n) {
      if (n) {
        this.$emit('onOpenModal')
      } else {
        this.$emit('onCloseModal')
      }
    }
  },
  methods: {}
}
</script>
<style scoped>
.modal-max-height {
  max-height: calc(100vh - 48px);
}
.modal-height {
  height: calc(100vh - 48px);
}
.mostly-customized-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 8px;
  border-radius: 5px;
  background-color: white; /* or add it to the track */
}
.mostly-customized-scrollbar::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 5px;
}
</style>
