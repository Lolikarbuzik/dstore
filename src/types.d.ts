interface Config {
    channel_id: string
    oauth: string,
    files_on_page: number,
    keymap: {
        quit: string,
        upload: string,
        delete: string,
        download: string,
        file_up: string,
        file_down: string,
        page_up: string,
        page_down: string
    }
}

// FILEOWNER STRUCTURE
// <DSTORE_HEADER>\0FILE\0<filename>\0<file size>\0<CHUNK_DATA>

type FileOwner = {
    name: string,
    size: number,
    chunk: string,
    chunk_id: number
    id: string,
}

// FILECHUNK STRUCTURE
// <DSTORE_HEADER>\0CHUNK\0<FILE_OWNER_MSG_ID>\0<CHUNK_ID>\0<CHUNK_DATA>

type FileChunk = {
    chunk_id: number,
    chunk: string,
    file_ptr: string
}