import MyModal from '@/components/MyModal.vue';
import MyButton from '@/components/MyButton.vue';
import { toRefs, ref, computed } from 'vue';
import MyInputText from '@/components/MyInputs/MyInputText.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useGeneralStore } from '@/stores/general';
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useFirebaseStorage, useFirestore } from 'vuefire';
import { useFileDialog } from '@vueuse/core';
import {
deleteObject,
getDownloadURL,
listAll,
ref as storageRef,
uploadBytesResumable
} from 'firebase/storage';

export default (() => {
const __VLS_setup = async () => {
const emit = defineEmits(['onClose', 'onUpdate']);
const props = defineProps({ showModal: Boolean, id: String, branch: String, rowSelected: Object });
const { showModal, id, branch, rowSelected } = toRefs(props);

const db = useFirestore();
const store = useGeneralStore();
const activities = computed(() => store.activities);
const entities = store.entities;
const storage = useFirebaseStorage();

const inputGroup = ref('');

function addGroup() {
if (inputGroup.value == '') {
return;
}
dataToEdit.value.ActivityGroups.push(inputGroup.value);
inputGroup.value = '';
}

function removeFromNewGroups(group) {
let index = dataToEdit.value.ActivityGroups.indexOf(group);
dataToEdit.value.ActivityGroups.splice(index, 1);
}

const percentage = ref(0);
const isLoading = ref(false);

function toggleActivities(id) {
const index = dataToEdit.value.Activities.indexOf(id);
index >= 0 ? dataToEdit.value.Activities.splice(index, 1) : dataToEdit.value.Activities.push(id);
}

function uploadPicture() {
const data = files.value?.item(0);
if (data) {
isLoading.value = true;
percentage.value = 0;
const fileRef = storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${data.name}`);
const uploadTask = uploadBytesResumable(fileRef, data);
uploadTask.on(
'state_changed',
(snapshot) => {
percentage.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
},
(error) => {
isLoading.value = false;
console.log('ERROR', error);
},
() => {
console.log('DONE');
isLoading.value = false;
getCodeOfConductFile();
}
);
}
}

const codeOfConductFileName = ref('');

function getCodeOfConductFile() {
console.log('reading files: ', `Corporations/${dataToEdit.value.id}/Code`);
const dirFiles = storageRef(storage, `Corporations/${dataToEdit.value.id}/Code`);
listAll(dirFiles)
.then((res) => {
codeOfConductFileName.value = '';
res.items.forEach((itemRef) => {
console.log('File Item: ', itemRef);
console.log('Name: ', itemRef.name);
codeOfConductFileName.value = itemRef.name;
});
})
.catch((error) => {
// Uh-oh, an error occurred!
console.log('Error: ', error);
});
}

const { files, open, onChange } = useFileDialog();

onChange(() => {
uploadPicture();
});

function openFileDiologAndUpload() {
open({ multiple: false });
}

function deleteFile() {
deleteObject(
storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${codeOfConductFileName.value}`)
)
.then(() => {
console.log('File Deleted');
getCodeOfConductFile();
})
.catch((error) => {
console.log('Error: ', error);
});
}

function downloadFile() {
getDownloadURL(
storageRef(storage, `Corporations/${dataToEdit.value.id}/Code/${codeOfConductFileName.value}`)
)
.then((url) => {
// `url` is the download URL for 'images/stars.jpg'
window.open(url, '_blank');
// This can be downloaded directly:
})
.catch((error) => {
console.log('Error: ', error);
// Handle any errors
});
}

const dataToEdit = ref({});

function initPlace() {
dataToEdit.value = {
id: '',
Name: '',
Short: '',
Branch: branch.value,
Code: '',
Entity: '',
Activities: [],
Screening: {
Staff: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
},
Junior_Counselor: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
},
Low_Access: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
}
}
};
}

function onOpenModal() {
initPlace();
if (id.value != '0') {
dataToEdit.value = {
Screening: {
Staff: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
},
Junior_Counselor: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
},
Low_Access: {
Application: true,
Interview: true,
Reference: 0,
Background: true,
Code: true,
Consent: true
}
},
...JSON.parse(JSON.stringify(rowSelected.value))
};
}
getCodeOfConductFile();
}

const isErrorName = computed(() => {
const formula = dataToEdit.value.Name?.length < 2;
const label = 'No Valid';
return { formula, label };
});

const isErrorShort = computed(() => {
const formula = dataToEdit.value.Short.length < 2;
const label = 'No Valid';
return { formula, label };
});

const isAllValid = computed(() => !isErrorName.value.formula && !isErrorShort.value.formula);

function onSave() {
if (id.value != '0') {
const docRef = doc(db, 'Corporations', id.value);
updateDoc(docRef, dataToEdit.value).then(() => console.log('Updated: ', dataToEdit.value));
emit('onUpdate');
return;
}
addDoc(collection(db, 'Corporations'), dataToEdit.value);

emit('onUpdate');
}
const __VLS_publicComponent = (await import('vue')).defineComponent({
setup() {
return {
$props: (await import('./__VLS_types.js')).makeOptional(defineProps({ showModal: Boolean, id: String, branch: String, rowSelected: Object })),
$emit: emit,
};
},
});

const __VLS_componentsOption = {};

let __VLS_name!: 'CorporationViewEdit';
function __VLS_template() {
let __VLS_ctx!: InstanceType<import('./__VLS_types.js').PickNotAny<typeof __VLS_publicComponent, new () => {}>> & InstanceType<import('./__VLS_types.js').PickNotAny<typeof __VLS_internalComponent, new () => {}>> & {};
/* Components */
let __VLS_localComponents!: NonNullable<typeof __VLS_internalComponent extends { components: infer C; } ? C : {}> & typeof __VLS_componentsOption & typeof __VLS_ctx;
let __VLS_otherComponents!: typeof __VLS_localComponents & import('./__VLS_types.js').GlobalComponents;
let __VLS_own!: import('./__VLS_types.js').SelfComponent<typeof __VLS_name, typeof __VLS_internalComponent & typeof __VLS_publicComponent & (new () => { $slots: typeof __VLS_slots; }) >;
let __VLS_components!: typeof __VLS_otherComponents & Omit<typeof __VLS_own, keyof typeof __VLS_otherComponents>;
/* Style Scoped */
type __VLS_StyleScopedClasses = {};
let __VLS_styleScopedClasses!: __VLS_StyleScopedClasses | keyof __VLS_StyleScopedClasses | (keyof __VLS_StyleScopedClasses)[];
/* CSS variable injection */
/* CSS variable injection end */
let __VLS_templateComponents!: {} &
import('./__VLS_types.js').WithComponent<'MyModal', typeof __VLS_components, 'MyModal'> &
import('./__VLS_types.js').WithComponent<'FontAwesomeIcon', typeof __VLS_components, 'FontAwesomeIcon'> &
import('./__VLS_types.js').WithComponent<'MyInputText', typeof __VLS_components, 'MyInputText'> &
import('./__VLS_types.js').WithComponent<'MySelectAuto', typeof __VLS_components, 'MySelectAuto'> &
import('./__VLS_types.js').WithComponent<'MyButton', typeof __VLS_components, 'MyButton'>;
__VLS_components.MyModal; __VLS_components.MyModal;
// @ts-ignore
[MyModal, MyModal,];
__VLS_components.FontAwesomeIcon; __VLS_components.FontAwesomeIcon; __VLS_components.FontAwesomeIcon; __VLS_components.FontAwesomeIcon; __VLS_components.FontAwesomeIcon; __VLS_components.FontAwesomeIcon;
// @ts-ignore
[FontAwesomeIcon, FontAwesomeIcon, FontAwesomeIcon, FontAwesomeIcon, FontAwesomeIcon, FontAwesomeIcon,];
__VLS_components.MyInputText; __VLS_components.MyInputText; __VLS_components.MyInputText; __VLS_components.MyInputText;
// @ts-ignore
[MyInputText, MyInputText, MyInputText, MyInputText,];
__VLS_components.MySelectAuto; __VLS_components.MySelectAuto;
// @ts-ignore
[MySelectAuto, MySelectAuto,];
__VLS_components.MyButton; __VLS_components.MyButton; __VLS_components.MyButton; __VLS_components.MyButton;
// @ts-ignore
[MyButton, MyButton, MyButton, MyButton,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = {};
{
__VLS_templateComponents.MyModal;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MyModal>) = { showModal: ((__VLS_ctx.showModal)), title: ("Sponsoring Entity"), maxWidth: ("max-w-2xl"), };
const __VLS_0 = new __VLS_templateComponents.MyModal({ showModal: ((__VLS_ctx.showModal)), title: ("Sponsoring Entity"), maxWidth: ("max-w-2xl"), });
const __VLS_1 = __VLS_templateComponents.MyModal({ showModal: ((__VLS_ctx.showModal)), title: ("Sponsoring Entity"), maxWidth: ("max-w-2xl"), });
let __VLS_2!: import('./__VLS_types.js').PickNotAny<typeof __VLS_0, typeof __VLS_1>;
type __VLS_3 = import('./__VLS_types.js').InstanceProps<typeof __VLS_2, typeof __VLS_templateComponents.MyModal>;
const __VLS_4: import('./__VLS_types.js').EventObject<typeof __VLS_2, 'onClose', typeof __VLS_templateComponents.MyModal, __VLS_3['onOnClose']> = {
onClose: $event => {
__VLS_ctx.$emit('onClose');
}
};
// @ts-ignore
[showModal, showModal, showModal, $emit,];
type __VLS_5 = import('./__VLS_types.js').InstanceProps<typeof __VLS_2, typeof __VLS_templateComponents.MyModal>;
const __VLS_6: import('./__VLS_types.js').EventObject<typeof __VLS_2, 'onOpenModal', typeof __VLS_templateComponents.MyModal, __VLS_5['onOnOpenModal']> = {
onOpenModal: $event => {
__VLS_ctx.onOpenModal();
}
};
// @ts-ignore
[onOpenModal,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("w-full flex-col"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mb-12 mt-5 flex justify-end"), };
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { color: ((__VLS_ctx.isAllValid ? 'green' : 'red')), icon: ("circle"), };
// @ts-ignore
[isAllValid,];
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex gap-x-2"), };
{
__VLS_templateComponents.MyInputText;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MyInputText>) = { label: ("Name"), class: ("grow"), modelValue: ((__VLS_ctx.dataToEdit.Name)), isError: ((__VLS_ctx.isErrorName)), };
// @ts-ignore
[dataToEdit, isErrorName,];
}
{
__VLS_templateComponents.MyInputText;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MyInputText>) = { label: ("Short"), modelValue: ((__VLS_ctx.dataToEdit.Short)), isError: ((__VLS_ctx.isErrorShort)), };
// @ts-ignore
[dataToEdit, isErrorShort,];
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = {};
{
__VLS_templateComponents.MySelectAuto;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MySelectAuto>) = { modelValue: ((__VLS_ctx.dataToEdit.Entity)), label: ("Entity"), items: ((__VLS_ctx.entities)), };
// @ts-ignore
[dataToEdit, entities,];
}
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mt-3"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("text-xs text-slate-600"), };
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("min-h-[52px] rounded border bg-white p-1"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex flex-wrap gap-1"), };
for (const [act, index] of (await import('./__VLS_types.js')).getVForSourceType(__VLS_ctx.activities)) {
// @ts-ignore
[activities,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex w-[158px] cursor-pointer rounded border px-1.5 text-sm"), };
([
__VLS_ctx.dataToEdit.Activities.includes(act.id)
? 'bg-orange-300 text-orange-900'
: 'bg-stone-200  text-slate-700'
]);
type __VLS_7 = JSX.IntrinsicElements['div'];
const __VLS_8: import('./__VLS_types.js').EventObject<typeof undefined, 'click', {}, __VLS_7['onClick']> = {
click: $event => {
__VLS_ctx.toggleActivities(act.id);
}
};
// @ts-ignore
[dataToEdit, toggleActivities,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("py-1"), };
(index + 1);
(act.Name);
}
}
}
}
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex gap-x-2"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("grow"), };
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mt-3 flex place-items-center"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mr-2"), };
}
if (__VLS_ctx.codeOfConductFileName) {
// @ts-ignore
[codeOfConductFileName,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("cursor-pointer rounded px-2 py-1 hover:bg-slate-300"), };
type __VLS_9 = JSX.IntrinsicElements['div'];
const __VLS_10: import('./__VLS_types.js').EventObject<typeof undefined, 'click', {}, __VLS_9['onClick']> = {
click: $event => {
__VLS_ctx.deleteFile();
}
};
// @ts-ignore
[deleteFile,];
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { icon: ("trash"), class: ("text-slate-600"), };
}
}
}
else {
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { icon: ("cloud-arrow-up"), class: ("cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"), };
const __VLS_11 = new __VLS_templateComponents.FontAwesomeIcon({ icon: ("cloud-arrow-up"), class: ("cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"), });
const __VLS_12 = __VLS_templateComponents.FontAwesomeIcon({ icon: ("cloud-arrow-up"), class: ("cursor-pointer rounded bg-slate-300 p-2 hover:bg-slate-600 hover:text-slate-50"), });
let __VLS_13!: import('./__VLS_types.js').PickNotAny<typeof __VLS_11, typeof __VLS_12>;
type __VLS_14 = import('./__VLS_types.js').InstanceProps<typeof __VLS_13, typeof __VLS_templateComponents.FontAwesomeIcon>;
const __VLS_15: import('./__VLS_types.js').EventObject<typeof __VLS_13, 'click', typeof __VLS_templateComponents.FontAwesomeIcon, __VLS_14['onClick']> = {
click: $event => {
__VLS_ctx.openFileDiologAndUpload();
}
};
// @ts-ignore
[openFileDiologAndUpload,];
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("ml-1 min-h-[28px] rounded border bg-white shadow"), };
if (__VLS_ctx.codeOfConductFileName) {
// @ts-ignore
[codeOfConductFileName,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("m-1 flex grow cursor-pointer place-items-center rounded bg-blue-200 p-1 text-sm hover:bg-blue-300"), };
type __VLS_16 = JSX.IntrinsicElements['div'];
const __VLS_17: import('./__VLS_types.js').EventObject<typeof undefined, 'click', {}, __VLS_16['onClick']> = {
click: (__VLS_ctx.downloadFile)
};
// @ts-ignore
[downloadFile,];
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { icon: ("file-archive"), };
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("ml-2"), };
(__VLS_ctx.codeOfConductFileName);
// @ts-ignore
[codeOfConductFileName,];
}
}
}
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mt-3"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("text-xs text-slate-600"), };
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("relative min-h-[80px] rounded border bg-white p-1"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex flex-wrap gap-2"), };
for (const [group] of (await import('./__VLS_types.js')).getVForSourceType(__VLS_ctx.dataToEdit.ActivityGroups)) {
// @ts-ignore
[dataToEdit,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex rounded border bg-orange-300 pl-2 text-sm text-orange-900"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("py-1"), };
(group);
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("ml-2 cursor-pointer rounded p-1 hover:bg-stone-300"), };
type __VLS_18 = JSX.IntrinsicElements['div'];
const __VLS_19: import('./__VLS_types.js').EventObject<typeof undefined, 'click', {}, __VLS_18['onClick']> = {
click: $event => {
__VLS_ctx.removeFromNewGroups(group);
}
};
// @ts-ignore
[removeFromNewGroups,];
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { icon: ("times"), };
}
}
}
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("absolute -bottom-6 right-0"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex place-items-center opacity-70"), };
{
({} as JSX.IntrinsicElements).input;
(__VLS_x as JSX.IntrinsicElements)['input'] = { class: ("relative left-4 rounded border border-blue-600 bg-blue-50 p-2 text-sm text-slate-900 focus:outline-blue-700"), };
(__VLS_ctx.inputGroup);
type __VLS_20 = JSX.IntrinsicElements['input'];
const __VLS_21: import('./__VLS_types.js').EventObject<typeof undefined, 'keyup', {}, __VLS_20['onKeyup']> = {
keyup: (__VLS_ctx.addGroup)
};
// @ts-ignore
[inputGroup, addGroup,];
}
{
({} as JSX.IntrinsicElements).button;
({} as JSX.IntrinsicElements).button;
(__VLS_x as JSX.IntrinsicElements)['button'] = { class: ("hover:shadow-lgs right z-10 h-12 w-12 rounded-full bg-blue-800 px-4 py-2 text-xs font-bold uppercase text-white shadow-md outline-none transition-all duration-100 ease-linear hover:brightness-125 focus:outline-none active:shadow-inner active:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-500/60 disabled:text-slate-200 disabled:shadow-none disabled:brightness-100"), type: ("button"), };
type __VLS_22 = JSX.IntrinsicElements['button'];
const __VLS_23: import('./__VLS_types.js').EventObject<typeof undefined, 'click', {}, __VLS_22['onClick']> = {
click: (__VLS_ctx.addGroup)
};
// @ts-ignore
[addGroup,];
{
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.FontAwesomeIcon>) = { icon: ("plus"), };
}
}
}
}
}
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("mb-20 mt-8 flex justify-center"), };
{
__VLS_templateComponents.MyButton;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MyButton>) = { color: ("bg-stone-600"), };
const __VLS_24 = new __VLS_templateComponents.MyButton({ color: ("bg-stone-600"), });
const __VLS_25 = __VLS_templateComponents.MyButton({ color: ("bg-stone-600"), });
let __VLS_26!: import('./__VLS_types.js').PickNotAny<typeof __VLS_24, typeof __VLS_25>;
type __VLS_27 = import('./__VLS_types.js').InstanceProps<typeof __VLS_26, typeof __VLS_templateComponents.MyButton>;
const __VLS_28: import('./__VLS_types.js').EventObject<typeof __VLS_26, 'click', typeof __VLS_templateComponents.MyButton, __VLS_27['onClick']> = {
click: $event => {
__VLS_ctx.$emit('onClose');
}
};
// @ts-ignore
[$emit,];
}
{
__VLS_templateComponents.MyButton;
(__VLS_x as import('./__VLS_types.js').ComponentProps<typeof __VLS_templateComponents.MyButton>) = { color: ("bg-green-600"), };
const __VLS_29 = new __VLS_templateComponents.MyButton({ color: ("bg-green-600"), });
const __VLS_30 = __VLS_templateComponents.MyButton({ color: ("bg-green-600"), });
let __VLS_31!: import('./__VLS_types.js').PickNotAny<typeof __VLS_29, typeof __VLS_30>;
type __VLS_32 = import('./__VLS_types.js').InstanceProps<typeof __VLS_31, typeof __VLS_templateComponents.MyButton>;
const __VLS_33: import('./__VLS_types.js').EventObject<typeof __VLS_31, 'click', typeof __VLS_templateComponents.MyButton, __VLS_32['onClick']> = {
click: (__VLS_ctx.onSave)
};
// @ts-ignore
[onSave,];
}
}
if (__VLS_ctx.isLoading) {
// @ts-ignore
[isLoading,];
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("absolute top-7 flex w-full place-items-center justify-center"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = {};
}
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("relative ml-3 h-3 w-60 rounded-full bg-slate-300"), };
{
({} as JSX.IntrinsicElements).div;
({} as JSX.IntrinsicElements).div;
(__VLS_x as JSX.IntrinsicElements)['div'] = { class: ("absolute left-0 h-3 rounded-full bg-orange-400"), style: (({ width: __VLS_ctx.percentage + '%' })), };
// @ts-ignore
[percentage,];
}
}
}
}
}
}
}
}
if (typeof __VLS_styleScopedClasses === 'object' && !Array.isArray(__VLS_styleScopedClasses)) {
}
declare var __VLS_slots: {};
return __VLS_slots;
}
const __VLS_internalComponent = (await import('vue')).defineComponent({
setup() {
return {
...props,
MyModal: MyModal,
MyButton: MyButton,
MyInputText: MyInputText,
FontAwesomeIcon: FontAwesomeIcon,
MySelectAuto: MySelectAuto,
showModal: showModal,
activities: activities,
entities: entities,
inputGroup: inputGroup,
addGroup: addGroup,
removeFromNewGroups: removeFromNewGroups,
percentage: percentage,
isLoading: isLoading,
toggleActivities: toggleActivities,
codeOfConductFileName: codeOfConductFileName,
openFileDiologAndUpload: openFileDiologAndUpload,
deleteFile: deleteFile,
downloadFile: downloadFile,
dataToEdit: dataToEdit,
onOpenModal: onOpenModal,
isErrorName: isErrorName,
isErrorShort: isErrorShort,
isAllValid: isAllValid,
onSave: onSave,
};
},
});
return {} as typeof __VLS_publicComponent;
};
return {} as typeof __VLS_setup extends () => Promise<infer T> ? T : never;
})({} as any);
