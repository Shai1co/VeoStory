let ffmpegInstancePromise: Promise<any> | null = null;

const loadFFmpegInstance = (): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if the FFmpeg script is already loaded on the window.
            if (!window.FFmpeg) {
                const ffmpegUmdUrl = 'https://aistudiocdn.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
                
                // Fetch the script content and load it via a blob URL.
                // This treats the script as same-origin, bypassing potential security
                // restrictions in sandboxed environments that might prevent a cross-origin
                // script from modifying the window object.
                try {
                    const response = await fetch(ffmpegUmdUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch FFmpeg script: ${response.statusText}`);
                    }
                    const scriptText = await response.text();
                    const blob = new Blob([scriptText], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);

                    const script = document.createElement('script');
                    script.src = blobUrl;

                    const loadPromise = new Promise<void>((resolveLoad, rejectLoad) => {
                        script.onload = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolveLoad();
                        };
                        script.onerror = () => {
                            URL.revokeObjectURL(blobUrl);
                            rejectLoad(new Error(`Error executing FFmpeg script loaded from blob URL.`));
                        };
                    });

                    document.head.appendChild(script);
                    await loadPromise;
                } catch(e) {
                    console.error("Failed to load FFmpeg script via blob method:", e);
                    throw e; // re-throw to be caught by the outer try-catch
                }
            }

            // After loading, the global `FFmpeg` object should be available.
            if (!window.FFmpeg) {
              throw new Error("FFmpeg script loaded, but window.FFmpeg is not defined.");
            }

            // The UMD export can be structured as `window.FFmpeg = { FFmpeg: class, ... }`
            // or as `window.FFmpeg = class`. We'll handle both possibilities.
            const ffmpegConstructor = window.FFmpeg.FFmpeg || window.FFmpeg;

            if (typeof ffmpegConstructor !== 'function') {
              console.error("Could not find a valid FFmpeg constructor on window.FFmpeg. Structure:", window.FFmpeg);
              throw new Error("FFmpeg script loaded, but a valid constructor function was not found.");
            }
            
            const instance = new ffmpegConstructor();
            
            instance.on('log', ({ message }: { message: string }) => {
                console.log('[FFMPEG]', message);
            });

            // Helper to fetch assets and convert them to blob URLs to bypass cross-origin restrictions.
            const toBlobURL = async (url: string, type: string): Promise<string> => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
                    }
                    const blob = await response.blob();
                    return URL.createObjectURL(new Blob([await blob.arrayBuffer()], { type }));
                } catch (error) {
                    console.error(`Error creating blob URL for ${url}:`, error);
                    throw error;
                }
            };

            const coreURL = "https://aistudiocdn.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
            const wasmURL = "https://aistudiocdn.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm";
            const workerURL = "https://aistudiocdn.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/worker.js";

            // Create local blob URLs for all required assets.
            const [blobCoreURL, blobWasmURL, blobWorkerURL] = await Promise.all([
                toBlobURL(coreURL, 'application/javascript'),
                toBlobURL(wasmURL, 'application/wasm'),
                toBlobURL(workerURL, 'application/javascript'),
            ]);

            await instance.load({
                coreURL: blobCoreURL,
                wasmURL: blobWasmURL,
                workerURL: blobWorkerURL,
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
    
    const concatFileContent = fileNames.map(name => `file '${name}'`).join('\n');
    await ffmpegInstance.writeFile('concat.txt', concatFileContent);

    // Use exec to run the command. Arguments are passed as an array.
    await ffmpegInstance.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4']);

    const outputData = await ffmpegInstance.readFile('output.mp4');

    // Clean up files from ffmpeg's virtual file system to prevent memory leaks
    for (const fileName of fileNames) {
        await ffmpegInstance.deleteFile(fileName);
    }
    await ffmpegInstance.deleteFile('concat.txt');
    await ffmpegInstance.deleteFile('output.mp4');

    return new Blob([(outputData as Uint8Array).buffer], { type: 'video/mp4' });
};
