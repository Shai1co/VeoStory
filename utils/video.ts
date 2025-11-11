import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreJsUrl from '@ffmpeg/core?url';
import coreWasmUrl from '@ffmpeg/core/wasm?url';
import { StoredVideoSegment } from '../types';

let ffmpegInstancePromise: Promise<any> | null = null;

const loadFFmpegInstance = (): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            const instance = new FFmpeg();
            instance.on('log', ({ message }: { message: string }) => {
                console.log('[FFMPEG]', message);
            });

            await instance.load({
                coreURL: coreJsUrl,
                wasmURL: coreWasmUrl,
            });

            resolve(instance);

        } catch (error) {
            console.error("Error during FFmpeg initialization:", error);
            ffmpegInstancePromise = null; // Reset promise so the next call can try again.
            reject(error);
        }
    });
};

const getFFmpegInstance = (): Promise<any> => {
    if (!ffmpegInstancePromise) {
        ffmpegInstancePromise = loadFFmpegInstance();
    }
    return ffmpegInstancePromise;
};

export const combineVideos = async (videoBlobs: Blob[]): Promise<Blob> => {
    const ffmpegInstance = await getFFmpegInstance();

    const fileNames: string[] = [];
    for (let i = 0; i < videoBlobs.length; i++) {
        const fileName = `input${i}.mp4`;
        fileNames.push(fileName);
        const data = new Uint8Array(await videoBlobs[i].arrayBuffer());
        await ffmpegInstance.writeFile(fileName, data);
    }
    
    const concatFileContent = fileNames.map((name) => `file '${name}'`).join('\n') + '\n';
    // Ensure the concat list is written as bytes for compatibility across ffmpeg.wasm versions
    await ffmpegInstance.writeFile('concat.txt', new TextEncoder().encode(concatFileContent));

    // Use exec to run the command. Arguments are passed as an array.
    // Add -y to force overwrite if a previous run left artifacts in the FS
    let outputData: Uint8Array | null = null;
    try {
        await ffmpegInstance.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4']);
        outputData = (await ffmpegInstance.readFile('output.mp4')) as Uint8Array;
        if (!outputData || outputData.length === 0) {
            throw new Error('Empty output after stream copy concat');
        }
    } catch (primaryError) {
        console.warn('[FFMPEG] Concat with -c copy failed, falling back to re-encode:', primaryError);
        // Fallback: re-encode using concat filter, video-only
        // Build inputs
        const inputArgs = fileNames.flatMap((f) => ['-i', f]);
        const streams = fileNames.map((_, idx) => `[${idx}:v:0]`).join('');
        const filter = `${streams}concat=n=${fileNames.length}:v=1:a=0[v]`;
        const args = [
            '-y',
            ...inputArgs,
            '-filter_complex',
            filter,
            '-map',
            '[v]',
            // Choose a broadly supported output profile without requiring GPL encoders
            '-c:v',
            'mpeg4',
            '-r',
            '30',
            '-pix_fmt',
            'yuv420p',
            'output.mp4',
        ];
        await ffmpegInstance.exec(args);
        outputData = (await ffmpegInstance.readFile('output.mp4')) as Uint8Array;
        if (!outputData || outputData.length === 0) {
            throw new Error('Empty output after re-encode concat');
        }
    }

    // Clean up files from ffmpeg's virtual file system to prevent memory leaks
    for (const fileName of fileNames) {
        try {
            await ffmpegInstance.deleteFile(fileName);
        } catch (e) {
            // File might not exist, ignore
        }
    }
    try {
        await ffmpegInstance.deleteFile('concat.txt');
    } catch (e) {
        // File might not exist, ignore
    }
    try {
        await ffmpegInstance.deleteFile('output.mp4');
    } catch (e) {
        // File might not exist, ignore
    }

    // Create Blob from a fresh ArrayBuffer to satisfy strict type expectations
    const arrayBuffer = new ArrayBuffer(outputData.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(outputData);
    return new Blob([arrayBuffer], { type: 'video/mp4' });
};

// Constants for choice overlay timing and styling
const CHOICE_DISPLAY_DURATION_SECONDS = 3;
const SELECTION_ANIMATION_DURATION_SECONDS = 1;
const TOTAL_OVERLAY_DURATION_SECONDS = CHOICE_DISPLAY_DURATION_SECONDS + SELECTION_ANIMATION_DURATION_SECONDS;
const CHOICE_STAGGER_DELAY_SECONDS = 0.15;
const CHOICE_BOX_PADDING = 20;
const CHOICE_FONT_SIZE = 32;
const HIGHLIGHT_COLOR = '0x38bdf8'; // Sky blue from theme
const TEXT_COLOR = 'white';
const BOX_COLOR = '0x1e293b@0.85'; // Semi-transparent dark background

export const combineVideosWithChoiceOverlays = async (segments: StoredVideoSegment[]): Promise<Blob> => {
    const ffmpegInstance = await getFFmpegInstance();

    const processedFileNames: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const inputFileName = `segment_${i}_input.mp4`;
        const outputFileName = `segment_${i}_processed.mp4`;
        
        // Write the input video
        const data = new Uint8Array(await segment.videoBlob.arrayBuffer());
        await ffmpegInstance.writeFile(inputFileName, data);
        
        // Check if this segment has choices and a selection
        if (segment.choices && segment.choices.length > 0 && segment.selectedChoice) {
            // Process video with choice overlays
            await processVideoWithChoiceOverlay(
                ffmpegInstance,
                inputFileName,
                outputFileName,
                segment.choices,
                segment.selectedChoice
            );
            processedFileNames.push(outputFileName);
        } else {
            // No choices, just use the original video
            processedFileNames.push(inputFileName);
        }
    }
    
    // Concatenate all processed videos
    const concatFileContent = processedFileNames.map((name) => `file '${name}'`).join('\n') + '\n';
    await ffmpegInstance.writeFile('concat.txt', new TextEncoder().encode(concatFileContent));
    
    let outputData: Uint8Array | null = null;
    try {
        await ffmpegInstance.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4']);
        outputData = (await ffmpegInstance.readFile('output.mp4')) as Uint8Array;
        if (!outputData || outputData.length === 0) {
            throw new Error('Empty output after stream copy concat');
        }
    } catch (primaryError) {
        console.warn('[FFMPEG] Concat with -c copy failed, falling back to re-encode:', primaryError);
        const inputArgs = processedFileNames.flatMap((f) => ['-i', f]);
        const streams = processedFileNames.map((_, idx) => `[${idx}:v:0]`).join('');
        const filter = `${streams}concat=n=${processedFileNames.length}:v=1:a=0[v]`;
        const args = [
            '-y',
            ...inputArgs,
            '-filter_complex',
            filter,
            '-map',
            '[v]',
            '-c:v',
            'mpeg4',
            '-r',
            '30',
            '-pix_fmt',
            'yuv420p',
            'output.mp4',
        ];
        await ffmpegInstance.exec(args);
        outputData = (await ffmpegInstance.readFile('output.mp4')) as Uint8Array;
        if (!outputData || outputData.length === 0) {
            throw new Error('Empty output after re-encode concat');
        }
    }
    
    // Clean up all files
    for (let i = 0; i < segments.length; i++) {
        const inputFileName = `segment_${i}_input.mp4`;
        const outputFileName = `segment_${i}_processed.mp4`;
        try {
            await ffmpegInstance.deleteFile(inputFileName);
        } catch (e) {
            // File might not exist, ignore
        }
        try {
            await ffmpegInstance.deleteFile(outputFileName);
        } catch (e) {
            // File might not exist, ignore
        }
    }
    try {
        await ffmpegInstance.deleteFile('concat.txt');
    } catch (e) {
        // File might not exist, ignore
    }
    try {
        await ffmpegInstance.deleteFile('output.mp4');
    } catch (e) {
        // File might not exist, ignore
    }
    
    // Create Blob from output
    const arrayBuffer = new ArrayBuffer(outputData.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(outputData);
    return new Blob([arrayBuffer], { type: 'video/mp4' });
};

async function processVideoWithChoiceOverlay(
    ffmpegInstance: any,
    inputFileName: string,
    outputFileName: string,
    choices: string[],
    selectedChoice: string
): Promise<void> {
    // Escape text for FFmpeg drawtext filter
    const escapeText = (text: string): string => {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '');
    };
    
    // Truncate text if too long (max 80 characters)
    const truncateText = (text: string, maxLength: number = 80): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };
    
    // Find which choice was selected
    const selectedIndex = choices.indexOf(selectedChoice);
    
    // Build the filter chain
    // Step 1: Extend video by freezing last frame
    let filterChain = `[0:v]tpad=stop_mode=clone:stop_duration=${TOTAL_OVERLAY_DURATION_SECONDS}[extended]`;
    
    // Step 2: Add choice text overlays
    let currentLabel = 'extended';
    
    // Calculate video dimensions and positioning
    // We'll position choices in a grid at the bottom third of the video
    const videoWidth = 1920; // Assuming HD video, will be scaled by FFmpeg
    const videoHeight = 1080;
    const choiceAreaTop = Math.floor(videoHeight * 0.65); // Start at 65% down
    
    // Adjust layout based on number of choices
    const numChoices = Math.min(choices.length, 3);
    const totalPadding = CHOICE_BOX_PADDING * (numChoices + 1);
    const choiceWidth = Math.floor((videoWidth - totalPadding) / numChoices);
    const choiceHeight = 120;
    
    for (let i = 0; i < choices.length && i < 3; i++) {
        const choice = choices[i];
        const truncatedChoice = truncateText(choice);
        const escapedText = escapeText(truncatedChoice);
        const isSelected = i === selectedIndex;
        
        // Calculate position (up to 3 choices in a row)
        const xPos = CHOICE_BOX_PADDING + (i * (choiceWidth + CHOICE_BOX_PADDING));
        const yPos = choiceAreaTop;
        
        // Stagger the appearance
        const appearTime = i * CHOICE_STAGGER_DELAY_SECONDS;
        const disappearTime = TOTAL_OVERLAY_DURATION_SECONDS;
        
        const nextLabel = `choice${i}`;
        
        // Draw semi-transparent background box for choice
        filterChain += `;[${currentLabel}]drawbox=x=${xPos}:y=${yPos}:w=${choiceWidth}:h=${choiceHeight}:color=${BOX_COLOR}:t=fill:enable='between(t,${appearTime},${disappearTime})'[${nextLabel}_box]`;
        
        // Draw choice text
        const textX = xPos + Math.floor(choiceWidth / 2);
        const textY = yPos + Math.floor(choiceHeight / 2);
        
        filterChain += `;[${nextLabel}_box]drawtext=text='${escapedText}':fontsize=${CHOICE_FONT_SIZE}:fontcolor=${TEXT_COLOR}:x=${textX}-text_w/2:y=${textY}-text_h/2:enable='between(t,${appearTime},${disappearTime})'[${nextLabel}]`;
        
        // If this is the selected choice, add highlight border after 3 seconds
        if (isSelected) {
            const highlightLabel = `${nextLabel}_highlight`;
            const borderThickness = 4;
            // Draw highlight border
            filterChain += `;[${nextLabel}]drawbox=x=${xPos}:y=${yPos}:w=${choiceWidth}:h=${choiceHeight}:color=${HIGHLIGHT_COLOR}:t=${borderThickness}:enable='between(t,${CHOICE_DISPLAY_DURATION_SECONDS},${disappearTime})'[${highlightLabel}]`;
            currentLabel = highlightLabel;
        } else {
            currentLabel = nextLabel;
        }
    }
    
    // Execute FFmpeg command
    const args = [
        '-y',
        '-i', inputFileName,
        '-filter_complex', filterChain,
        '-map', `[${currentLabel}]`,
        '-c:v', 'mpeg4',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        outputFileName
    ];
    
    await ffmpegInstance.exec(args);
}
