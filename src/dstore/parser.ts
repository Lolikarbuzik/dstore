import { DSTORE_HEADER } from '../util/header';

export default function Parse<T extends FileChunk | FileOwner>(content: string, id: string): T | undefined {
    if (content.slice(0, DSTORE_HEADER.length) !== DSTORE_HEADER) {
        // console.log("Invalid file header");
        return;
    }
    const split = content.split("\0")
    let file: T;
    if (split[1] == "FILE") {
        //@ts-ignore
        file = {
            name: split[2],
            size: parseInt(split[3]),
            chunk: split[4],
            chunk_id: 0,
            id: id
        } as FileOwner
    } else if (split[1] == "CHUNK") {
        //@ts-ignore
        file = {
            file_ptr: split[2],
            chunk_id: parseInt(split[3]),
            chunk: split[4]
        } as FileChunk
    }

    //@ts-ignore
    return file
}