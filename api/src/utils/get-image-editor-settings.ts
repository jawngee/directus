import fs from 'fs';

type ImageEditorAspectRatio = {
	title?: string;
	aspect_ratio: number[];
	icon: string;
	ratio?: number;
};

type ImageEditorSettings = {
	cropper: {
		view_mode: number;
		aspect_ratios: ImageEditorAspectRatio[];
	};
};

export default function getImageEditorSettings(): ImageEditorSettings {
	let currentSettings: ImageEditorSettings = {
		cropper: {
			view_mode: 0,
			aspect_ratios: [
				{
					aspect_ratio: [16, 9],
					icon: 'crop_16_9',
				},
				{
					aspect_ratio: [3, 2],
					icon: 'crop_3_2',
				},
				{
					aspect_ratio: [5, 4],
					icon: 'crop_5_4',
				},
				{
					aspect_ratio: [7, 5],
					icon: 'crop_7_5',
				},
				{
					aspect_ratio: [1, 1],
					icon: 'crop_square',
				},
			],
		},
	};

	if (fs.existsSync('./image-editor.json')) {
		currentSettings = JSON.parse(fs.readFileSync('./image-editor.json', { encoding: 'utf-8' }));
	}

	currentSettings.cropper.aspect_ratios.forEach((aspectRatio: ImageEditorAspectRatio) => {
		aspectRatio.ratio = aspectRatio.aspect_ratio[0] / aspectRatio.aspect_ratio[1];
		if (!aspectRatio.title) {
			aspectRatio.title = `${aspectRatio.aspect_ratio[0]}:${aspectRatio.aspect_ratio[1]}`;
		}
	});

	return currentSettings;
}
