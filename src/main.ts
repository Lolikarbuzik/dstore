import { Client } from 'discord.js-selfbot-v13'
import { Config } from './dstore/config'
import DStore from './dstore/index'
import DStore_UI from './dstore/ui'

const client = new Client({
    checkUpdate: false,
})

client.on('ready', (_) => {
    new DStore_UI(
        new DStore(client)
    );
})

console.log("Connecting to discord...")
client.login(Config.oauth)
