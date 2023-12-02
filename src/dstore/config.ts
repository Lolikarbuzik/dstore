import { projectDirs } from '../directories/src/index'
import { readFileSync } from 'node:fs'

const PROJECT_ID = 'lolikarbuzik/dstore'
const CONFIG_PATH = projectDirs.config(PROJECT_ID)
if (!CONFIG_PATH) throw Error(`Couldn't get config path for ${PROJECT_ID}`)
const READ_PATH = CONFIG_PATH + "\\config.json";
//@ts-ignore
this.config = JSON.parse(readFileSync(READ_PATH))

//@ts-ignore
export const Config: Config = this.config ?? {
    oauth: "",
    server_id: "",
    files_on_page: 10,
    keymap: {
        quit: "q",
        upload: "u",
        delete: "r",
        download: "d",
        file_up: "w",
        file_down: "s",
        page_up: "up",
        page_down: "down"
    }
}