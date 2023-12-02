export function stringIntoChunks(str: string, chunkSize: number): string[] {
    let chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
        chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
}