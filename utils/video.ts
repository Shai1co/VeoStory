import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreJsUrl from '@ffmpeg/core?url';
import coreWasmUrl from '@ffmpeg/core/wasm?url';

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
        await ffmpegInstance.deleteFile(fileName);
    }
    await ffmpegInstance.deleteFile('concat.txt');
    await ffmpegInstance.deleteFile('output.mp4');

    // Create Blob from a fresh ArrayBuffer to satisfy strict type expectations
    const arrayBuffer = new ArrayBuffer(outputData.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(outputData);
    return new Blob([arrayBuffer], { type: 'video/mp4' });
};
