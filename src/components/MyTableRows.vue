<template>
  <tr
    :data-num-row="index"
    class="border-b border-gray-100 hover:bg-blue-100 hover:opacity-100"
    :class="{
      'text-blue-600': false,
      'bg-gray-500 text-gray-700 line-through': row[activeRows] && row[activeRows] == '0',
      'line-through even:bg-gray-500': row[activeRows] && row[activeRows] == '0'
    }"
    ondragstart="event.dataTransfer.setData('text/plain','hi')"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragend="onReorder"
    @click="$emit('onClick', { rowId: row.id, rowIndex: index })"
    :key="row.id"
    :data-row-id="row.id"
  >
    <td
      :data-num-row="index"
      :data-row-id="row.id"
      :draggable="i == 0 && dataName !== undefined"
      ondragstart="event.dataTransfer.setData('text/plain','hi')"
      class="h-12 py-1 pl-1 pr-2"
      :class="[
        i == 0 && dataName ? 'min-w-cell cursor-move' : 'cursor-pointer',
        cell?.icon ? cell.icon.aligned : 'text-left'
      ]"
      v-for="(cell, i) of cells"
      :key="cell"
    >
      <font-awesome-icon
        v-if="i == 0 && dataName"
        class="mr-2"
        :data-num-row="index"
        :data-row-id="row.id"
        icon="grip-vertical"
      />

      <span v-if="!cell" class="text-gray-300">---</span>
      <span v-else-if="cell.icon">
        <font-awesome-icon
          v-if="cell.icon?.icon"
          :icon="cell.icon.icon"
          :class="cell.icon.colorClass"
          :size="cell.icon.size"
          :category="cell.Category"
        >
        </font-awesome-icon>
        <span v-if="cell.icon.text" v-html="cell.icon.text" class="ml-2"> </span>
      </span>

      <span v-else v-html="cell"></span>
    </td>
    <td
      v-if="deleteIcon"
      class="cursor-pointer border-b border-gray-100 px-2 opacity-80"
      @click="onDeleteIcon($event, { id: row.id, index: index })"
    >
      <font-awesome-icon icon="trash" class="text-red-500" />
    </td>
    <td
      v-for="(i, indexIcon) in iconOptions"
      :key="i.icon"
      class="cursor-pointer border-b border-gray-100 opacity-80"
      @click="$event.stopPropagation(), i.f(index, indexIcon, $event)"
    >
      <font-awesome-icon
        :icon="i.icon"
        :class="[i.class, 'p-2 rounded hover:bg-blue-700 hover:text-slate-50']"
      />
    </td>
  </tr>
</template>
<script>
export default {
  props: {
    row: Object,
    fields: Array,
    index: Number,
    dataName: String,
    dataNameIndex: Number,
    dataNameIndexName: String,
    activeRows: String,
    deleteIcon: { type: Boolean, default: false },
    iconOptions: {
      type: Array,
      default: () => []
      /*      
      [
        {
          icon: '',
          f: (index, indexIcon, $event)=>{},
          class: 'text-blue-800'
        }
      ]
 */
    }
  },

  emits: ['onReorder', 'onClick', 'onDeleteIcon'],
  computed: {
    cells() {
      return this.fields.map(function (field) {
        if (field.format) {
          return field.format(this.row[field.key], this.row, this.index)
        }
        if (field.icon) {
          return {
            icon: {
              aligned: 'text-center',
              ...field.icon(this.row[field.key], this.row)
            }
          }
        }
        return this.row[field.key]
      }, this)
    },
    catRow() {
      return this.row.Category
    }
  },

  methods: {
    onReorder() {
      this.$emit('onReorder', this.rowsAfected)
    }
  },

  setup(props, context) {
    function onDeleteIcon(e, row) {
      e.stopPropagation()
      context.emit('onDeleteIcon', row)
    }

    return {
      onDeleteIcon
    }
  }
}
</script>
