import fs from "fs/promises";
import yauzl from "yauzl";
import zlib from "zlib";
import { Deferred } from "evt/tools/Deferred";
import { dirname as pathDirname, sep as pathSep } from "path";
import { existsAsync } from "./fs.existsAsync";

export async function extractArchive(params: {
    archiveFilePath: string;
    onArchiveFile: (params: {
        relativeFilePathInArchive: string;
        readFile: () => Promise<Buffer>;
        /** NOTE: Will create the directory if it does not exist */
        writeFile: (params: { filePath: string; modifiedData?: Buffer }) => Promise<void>;
        earlyExit: () => void;
    }) => Promise<void>;
}) {
    const { archiveFilePath, onArchiveFile } = params;

    const zipFile = await new Promise<yauzl.ZipFile>((resolve, reject) => {
        yauzl.open(archiveFilePath, { lazyEntries: true }, async (error, zipFile) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(zipFile);
        });
    });

    const dDone = new Deferred<void>();

    zipFile.once("end", () => {
        zipFile.close();
        dDone.resolve();
    });

    zipFile.once("error", error => {
        dDone.reject(error);
    });

    // NOTE: yauzl's decompressed stream can stall on some Keycloak jar entries.
    // Read compressed bytes and inflate explicitly instead.
    const readFile = async (entry: yauzl.Entry): Promise<Buffer> => {
        const compressedData = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];

            const onReadStream = (error: Error | null, readStream?: NodeJS.ReadableStream) => {
                if (error !== null) {
                    reject(error);
                    return;
                }

                if (readStream === undefined) {
                    reject(new Error(`Failed to open zip entry stream for ${entry.fileName}`));
                    return;
                }

                readStream.on("data", chunk => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });

                readStream.once("error", reject);

                readStream.once("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            };

            try {
                if (entry.compressionMethod === 8) {
                    zipFile.openReadStream(entry, { decompress: false }, onReadStream);
                    return;
                }

                zipFile.openReadStream(entry, onReadStream);
            } catch (error) {
                reject(error);
            }
        });

        const data = (() => {
            switch (entry.compressionMethod) {
                case 0:
                    return compressedData;
                case 8:
                    return zlib.inflateRawSync(compressedData);
                default:
                    throw new Error(
                        `Unsupported compression method ${entry.compressionMethod} for ${entry.fileName}`
                    );
            }
        })();

        if (data.length !== entry.uncompressedSize) {
            throw new Error(
                `Unexpected uncompressed size for ${entry.fileName}: ${data.length} !== ${entry.uncompressedSize}`
            );
        }

        return data;
    };

    const writeFile = async (
        entry: yauzl.Entry,
        params: {
            filePath: string;
            modifiedData?: Buffer;
        }
    ): Promise<void> => {
        const { filePath, modifiedData } = params;

        {
            const dirPath = pathDirname(filePath);

            if (!(await existsAsync(dirPath))) {
                await fs.mkdir(dirPath, { recursive: true });
            }
        }

        if (modifiedData !== undefined) {
            await fs.writeFile(filePath, modifiedData);
            return;
        }

        await fs.writeFile(filePath, await readFile(entry));
    };

    zipFile.on("entry", async (entry: yauzl.Entry) => {
        try {
            handle_file: {
                // NOTE: Skip directories
                if (entry.fileName.endsWith("/")) {
                    break handle_file;
                }

                let hasEarlyExitBeenCalled = false;

                await onArchiveFile({
                    relativeFilePathInArchive: entry.fileName.split("/").join(pathSep),
                    readFile: () => readFile(entry),
                    writeFile: params => writeFile(entry, params),
                    earlyExit: () => {
                        hasEarlyExitBeenCalled = true;
                    }
                });

                if (hasEarlyExitBeenCalled) {
                    zipFile.close();
                    dDone.resolve();
                    return;
                }
            }

            zipFile.readEntry();
        } catch (error) {
            zipFile.close();
            dDone.reject(error);
        }
    });

    zipFile.readEntry();

    await dDone.pr;
}
