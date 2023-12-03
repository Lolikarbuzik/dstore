import { Client } from 'discord.js-selfbot-v13'
import { Config } from './dstore/config'
import DStore from './dstore/index'
import DStore_UI from './dstore/ui'
import { writeFileSync } from "node:fs"

const client = new Client({
    checkUpdate: false,
})


client.on('ready', async (_) => {
    const dstore = new DStore(client)

    // TESTS
    // await dstore.uploadFile("H".repeat(1024 * 1024), "test.txt", Config.keys[0] as EncryptionKey)
    // await dstore.refreshFiles()
    // const files = dstore.files;

    // if (!files[0]) return;
    // writeFileSync("test.txt", await dstore.getFile(files[0]));
    // dstore.deleteFile(files[0])

    new DStore_UI(dstore);
})

console.log("Connecting to discord...")
client.login(Config.oauth)