<template>
  <div class="relative mb-4 pt-0">
    <my-info-modal :info="info" :infoTitle="infoTitle" :label="label">
      <slot></slot>
    </my-info-modal>
    <div
      class="relative rounded focus:outline-none focus:ring-1"
      ref="inputSelectEl"
      :tabindex="auto ? '' : '0'"
      :data-auto="name"
    >
      <!-- text input -->
      <input
        :data-auto="name"
        type="text"
        ref="input"
        :disabled="!auto"
        :value="labelInput"
        @input="onInput"
        @click="onClickInput"
        :placeholder="placeholder"
        :class="{ 'ring-1 ring-red-500': isError.formula }"
        class="relative w-full rounded border-0 bg-white px-2 py-2 text-sm text-gray-700 placeholder-gray-400 shadow outline-none hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300"
      />
      <!-- caret icon -->
      <font-awesome-icon
        v-if="!auto"
        :data-auto="name"
        icon="caret-down"
        class="absolute top-3 inline-block"
        :class="[editOptions ? 'right-9' : 'right-1']"
      />
      <!-- ediit options icon -->
      <font-awesome-icon
        v-if="editOptions"
        :data-auto="name"
        icon="edit"
        @click="onEditOptions"
        class="absolute right-1 top-3 inline-block cursor-pointer"
      />
      <!-- icon to delete input -->
      <div
        :data-auto="name"
        v-if="clear && labelInput != '' && auto"
        class="absolute right-2 top-0 py-2 px-2 text-gray-600"
        @click="onClear"
      >
        <font-awesome-icon :data-auto="name" icon="times"></font-awesome-icon>
      </div>

      <!-- panel with options -->
      <div
        :data-auto="name"
        v-if="isFocus && itemsFiltered.length > 0"
        :class="`${heightClass} ring-blue mostly-customized-scrollbar absolute left-0 z-40 w-full
        origin-top-right cursor-default overflow-y-auto rounded bg-white py-1 text-left shadow-lg ring-1 ring-opacity-80`"
        aria-orientation="vertical"
        aria-labelledby="user-menu"
      >
        <template v-for="(item, index) in itemsFiltered" :key="item[keyName]">
          <div
            :ref="'item-' + index"
            :data-auto="name"
            class="block cursor-default px-4 py-2 text-sm text-gray-700 hover:bg-blue-100"
            :class="{
              'bg-blue-100': index == defaultSelIndex,
              'bg-blue-200': index == originalValue
            }"
            @click="onClickSelection(item)"
            @mouseover="defaultSelIndex = index"
          >
            <span v-if="item.icon" class="mr-2">
              <font-awesome-icon :icon="item.icon" color="blue" />
            </span>
            <span :data-auto="name" v-html="item.label" class="cursor-default"></span>
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
  props: {
    modelValue: String,
    label: { type: String, default: '' },
    items: Array,
    keyName: { type: String, default: 'value' },
    placeholder: { type: String, default: '' },
    isError: {
      type: Object,
      default: () => {
        return { formula: false, label: '' }
      }
    },
    heightClass: { type: String, default: 'max-h-40' },
    auto: {
      type: Boolean,
      default: false
    },
    name: {
      type: String,
      default: 'auto'
    },
    clear: {
      type: Boolean,
      default: true
    },
    editOptions: {
      type: Boolean,
      default: false
    },
    info: { type: Boolean, default: false },
    infoTitle: { type: String, default: '' }
  },
  emits: ['input', 'update:modelValue', 'editOptions'],
  components: { MyInfoModal },
  data() {
    return {
      isFocus: false,
      isHover: false,
      labelInput: '', // is the v-model input
      tabindex: 0,
      inputText: '',
      justClick: false, // use co show all items when click on input
      defaultSelIndex: 0,
      itemsRef: [],
      originalValue: -1
    }
  },
  computed: {
    labelSelected() {
      return this.items.find((element) => element.keyName == this.modelValue)?.label || ''
    },
    itemsFiltered() {
      if (!this.items) return []
      if (this.inputText == '' || this.justClick || !this.auto) {
        return this.items
      }
      const newItems = []

      for (let index = 0; index < this.items.length; index++) {
        const item = { ...this.items[index] }
        const indexSearch = item.label.toLowerCase().search(this.inputText.toLowerCase())
        if (indexSearch >= 0) {
          newItems.push(item)
        }
      }
      return newItems
    }
  },
  watch: {
    inputText() {
      this.defaultSelIndex = 0
    },
    labelInput(n) {
      this.inputText = n
      this.justClick = false
    },
    modelValue() {
      if (!this.items) return
      this.labelInput =
        this.items.find((element) => element[this.keyName] == this.modelValue)?.label || ''
    },
    items() {
      if (!this.items) return
      this.labelInput =
        this.items.find((element) => element[this.keyName] == this.modelValue)?.label || ''
    }
  },
  created() {
    window.addEventListener('keydown', this.onEventKey)
    window.addEventListener('click', this.onEventClick)
  },
  mounted() {
    if (!this.items) return
    this.labelInput =
      this.items.find((element) => element[this.keyName] == this.modelValue)?.label || ''
    this.originalValue = this.items.findIndex((element) => element.label == this.labelInput)
  },
  updated() {
    this.labelInput =
      this.items?.find((element) => element[this.keyName] == this.modelValue)?.label || ''
    this.originalValue = this.items?.findIndex((element) => element.label == this.labelInput)
  },
  unmounted() {
    window.removeEventListener('click', this.onEventClick)
    window.removeEventListener('keydown', this.onEventKey)
  },
  beforeUpdate() {
    this.itemRefs = []
  },
  methods: {
    onEventKey(e) {
      if (document.activeElement.dataset.auto != this.name) return
      if (e.key == 'Enter') {
        if (this.defaultSelIndex < this.itemsFiltered.length) {
          this.onClickSelection(this.itemsFiltered[this.defaultSelIndex])
        }
      }
      if (e.key == 'ArrowDown') {
        if (this.defaultSelIndex < this.itemsFiltered.length - 1) {
          this.defaultSelIndex += 1
          if (!this.isFocus) {
            this.isFocus = true
            this.defaultSelIndex = 0
          }
        }
      }
      if (e.key == 'ArrowUp') {
        if (this.defaultSelIndex > 0) {
          this.defaultSelIndex -= 1
        }
      }
      if (e.key == 'Tab') {
        this.onLeavingInput()
      }
      if (this.$refs['item-' + this.defaultSelIndex]) {
        this.$refs['item-' + this.defaultSelIndex].scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'nearest'
        })
      }
    },
    onEventClick(e) {
      let count = 0
      let ne = e.target
      let clickOut = true

      do {
        if (ne.dataset?.auto == this.name) {
          clickOut = false
        }
        // clickOut = ne.dataset.auto != this.name;
        ne = ne?.parentNode
        count += 1
      } while (count < 5 && ne && ne?.nodeName != 'DIV')

      if (clickOut) {
        this.onLeavingInput()
      } else {
        if (['svg', 'INPUT', 'path'].includes(e.target.nodeName) && !this.auto) {
          if (!this.items && this.editOptions) {
            this.onEditOptions()
          }
          this.isFocus = !this.isFocus
          this.scrollToSel()
        }
      }
    },
    onInput(input) {
      this.isFocus = true
      this.labelInput = input.target.value
      let valSel = ''
      const el = this.items.find((element) => element.label == input.target.value)
      if (el) {
        valSel = el[this.keyName]
      }

      if (valSel) {
        this.$emit('update:modelValue', valSel)
      } else {
        this.$emit('update:modelValue', '')
      }
    },
    onClickSelection(sel) {
      this.labelInput = sel.label
      this.$emit('update:modelValue', sel[this.keyName])
      this.isFocus = false
    },
    onLeavingInput() {
      let valSel = ''
      if (!this.items) return
      const el = this.items.find((element) => element.label == this.labelInput)
      if (el) {
        valSel = el[this.keyName]
      }

      if (!valSel) {
        this.labelInput = ''
      }
      this.isFocus = false
    },
    onClickInput(e) {
      this.isFocus = true
      this.justClick = true
      e.target.select()
      this.scrollToSel()
    },
    setItemRef(el) {
      if (el) {
        this.itemRefs.push(el)
      }
    },
    scrollToSel() {
      if (!this.items) return
      const indexSel = this.items.findIndex((element) => element.label == this.labelInput)
      if (indexSel >= 0) {
        this.defaultSelIndex = indexSel

        this.$nextTick(() => {
          if (this.$refs['item-' + this.defaultSelIndex][0]) {
            this.$refs['item-' + this.defaultSelIndex][0].scrollIntoView({
              behavior: 'auto',
              block: 'nearest',
              inline: 'nearest'
            })
          }
        })
      }
    },
    onClear() {
      this.labelInput = ''
      this.$emit('update:modelValue', '')
      this.isFocus = true
    },
    onEditOptions() {
      this.$emit('editOptions')
    }
  }
}
</script>

<style scoped>
.mostly-customized-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 8px;
  border-radius: 5px;
  background-color: white; /* or add it to the track */
  padding: 2px;
}
.mostly-customized-scrollbar::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 5px;
}
.scrollbar-white::-webkit-scrollbar {
  width: 10px;
  height: 8px;
  border-radius: 5px;
  background-color: white; /* or add it to the track */
}
.scrollbar-white::-webkit-scrollbar-thumb {
  background: white;
  border-radius: 5px;
}
</style>
