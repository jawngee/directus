<template>
	<div>
		<v-list-item
			v-if="folder.children === undefined"
			:to="`/files/folders/${folder.id}`"
			:active="currentFolder === folder.id"
			@contextmenu.prevent.stop="activateContextMenu"
			@focusout="deactivateContextMenu"
		>
			<v-list-item-icon><v-icon name="folder" /></v-list-item-icon>
			<v-list-item-content>
				<v-text-overflow :text="folder.name" />
			</v-list-item-content>
		</v-list-item>

		<v-list-group
			v-else
			:to="`/files/folders/${folder.id}`"
			:active="currentFolder === folder.id"
			:value="folder.id"
			scope="files-navigation"
			disable-groupable-parent
			@contextmenu.prevent.stop="activateContextMenu"
			@focusout="deactivateContextMenu"
		>
			<template #activator>
				<v-list-item-icon>
					<v-icon name="folder" />
				</v-list-item-icon>
				<v-list-item-content>
					<v-text-overflow :text="folder.name" />
				</v-list-item-content>
			</template>

			<navigation-folder
				v-for="childFolder in folder.children"
				:key="childFolder.id"
				:folder="childFolder"
				:current-folder="currentFolder"
				:click-handler="clickHandler"
			/>
		</v-list-group>

		<v-menu ref="contextMenu" show-arrow placement="bottom-start">
			<v-list>
				<v-list-item clickable @click="renameActive = true">
					<v-list-item-icon>
						<v-icon name="edit" outline />
					</v-list-item-icon>
					<v-list-item-content>
						<v-text-overflow :text="t('rename_folder')" />
					</v-list-item-content>
				</v-list-item>
				<v-list-item clickable @click="moveActive = true">
					<v-list-item-icon>
						<v-icon name="folder_move" />
					</v-list-item-icon>
					<v-list-item-content>
						<v-text-overflow :text="t('move_to_folder')" />
					</v-list-item-content>
				</v-list-item>
				<v-list-item clickable @click="deleteActive = true">
					<v-list-item-icon>
						<v-icon name="delete" outline />
					</v-list-item-icon>
					<v-list-item-content>
						<v-text-overflow :text="t('delete_folder')" />
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>

		<v-dialog v-model="renameActive" persistent @esc="renameActive = false">
			<v-card>
				<v-card-title>{{ t('rename_folder') }}</v-card-title>
				<v-card-text>
					<v-input v-model="renameValue" autofocus @keyup.enter="renameSave" />
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="renameActive = false">{{ t('cancel') }}</v-button>
					<v-button :disabled="renameValue === null" :loading="renameSaving" @click="renameSave">
						{{ t('save') }}
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="moveActive" persistent @esc="moveActive = false">
			<v-card>
				<v-card-title>{{ t('move_to_folder') }}</v-card-title>
				<v-card-text>
					<folder-picker v-model="moveValue" :disabled-folders="[folder.id]" />
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="moveActive = false">{{ t('cancel') }}</v-button>
					<v-button :loading="moveSaving" @click="moveSave">{{ t('save') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="deleteActive" persistent @esc="deleteActive = false">
			<v-card>
				<v-card-title>{{ t('delete_folder') }}</v-card-title>
				<v-card-text>
					<v-notice>
						{{ t('nested_files_folders_will_be_moved') }}
					</v-notice>
				</v-card-text>
				<v-card-actions>
					<v-button secondary @click="deleteActive = false">{{ t('cancel') }}</v-button>
					<v-button kind="danger" :loading="deleteSaving" @click="deleteSave">{{ t('delete_label') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, PropType, ref } from 'vue';
import useFolders, { Folder } from '@/composables/use-folders';
import api from '@/api';
import FolderPicker from './folder-picker.vue';
import { useRouter } from 'vue-router';
import { unexpectedError } from '@/utils/unexpected-error';

export default defineComponent({
	name: 'NavigationFolder',
	components: { FolderPicker },
	props: {
		folder: {
			type: Object as PropType<Folder>,
			required: true,
		},
		currentFolder: {
			type: String,
			default: null,
		},
		clickHandler: {
			type: Function,
			default: () => undefined,
		},
	},
	setup(props) {
		const { t } = useI18n();

		const router = useRouter();

		const contextMenu = ref();

		const { renameActive, renameValue, renameSave, renameSaving } = useRenameFolder();
		const { moveActive, moveValue, moveSave, moveSaving } = useMoveFolder();
		const { deleteActive, deleteSave, deleteSaving } = useDeleteFolder();

		const { fetchFolders } = useFolders();

		return {
			t,
			renameActive,
			renameValue,
			renameSave,
			renameSaving,
			moveActive,
			moveValue,
			moveSave,
			moveSaving,
			deleteActive,
			deleteSave,
			deleteSaving,
			contextMenu,
			activateContextMenu,
			deactivateContextMenu,
		};

		function useRenameFolder() {
			const renameActive = ref(false);
			const renameValue = ref(props.folder.name);
			const renameSaving = ref(false);

			return { renameActive, renameValue, renameSave, renameSaving };

			async function renameSave() {
				renameSaving.value = true;

				try {
					await api.patch(`/folders/${props.folder.id}`, {
						name: renameValue.value,
					});
				} catch (err: any) {
					unexpectedError(err);
				} finally {
					renameSaving.value = false;
					await fetchFolders();
					renameActive.value = false;
				}
			}
		}

		function useMoveFolder() {
			const moveActive = ref(false);
			const moveValue = ref(props.folder.parent);
			const moveSaving = ref(false);

			return { moveActive, moveValue, moveSave, moveSaving };

			async function moveSave() {
				moveSaving.value = true;

				try {
					await api.patch(`/folders/${props.folder.id}`, {
						parent: moveValue.value,
					});
				} catch (err: any) {
					unexpectedError(err);
				} finally {
					moveSaving.value = false;
					await fetchFolders();
					moveActive.value = false;
				}
			}
		}

		function useDeleteFolder() {
			const deleteActive = ref(false);
			const deleteSaving = ref(false);

			return { deleteActive, deleteSave, deleteSaving };

			async function deleteSave() {
				deleteSaving.value = true;

				try {
					const foldersToUpdate = await api.get('/folders', {
						params: {
							filter: {
								parent: {
									_eq: props.folder.id,
								},
							},
						},
					});

					const filesToUpdate = await api.get('/files', {
						params: {
							filter: {
								folder: {
									_eq: props.folder.id,
								},
							},
						},
					});

					const newParent = props.folder.parent || null;

					const folderKeys = foldersToUpdate.data.data.map((folder: { id: string }) => folder.id);
					const fileKeys = filesToUpdate.data.data.map((file: { id: string }) => file.id);

					if (folderKeys.length > 0) {
						await api.patch(`/folders`, {
							keys: folderKeys,
							data: {
								parent: newParent,
							},
						});
					}

					if (fileKeys.length > 0) {
						await api.patch(`/files`, {
							keys: fileKeys,
							data: {
								folder: newParent,
							},
						});
					}

					await api.delete(`/folders/${props.folder.id}`);

					if (newParent) {
						router.replace(`/files/folders/${newParent}`);
					} else {
						router.replace('/files');
					}

					deleteActive.value = false;
				} catch (err: any) {
					unexpectedError(err);
				} finally {
					await fetchFolders();
					deleteSaving.value = false;
				}
			}
		}

		function activateContextMenu(event: PointerEvent) {
			contextMenu.value.activate(event);
		}

		function deactivateContextMenu() {
			contextMenu.value.deactivate();
		}
	},
});
</script>
