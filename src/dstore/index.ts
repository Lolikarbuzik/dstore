import { Client, Message, TextChannel } from 'discord.js-selfbot-v13'
import { Config } from './config'
import { stringIntoChunks } from '../util/chunks';
import Parse from './parser';
import { DSTORE_HEADER } from '../util/header';

type File = {
    name: string,
    chunks: string[],
    size: number,
}

const byteSize = (str: string) => new Blob([str]).size;

export default class DStore {
    files: File[] = []

    channel: TextChannel;

    getPage(page: number): File[] {
        const arr: File[] = [];
        for (let i = page * Config.files_on_page; i < Math.min((page + 1) * Config.files_on_page, this.files.length); i++) {
            arr.push(this.files[i])
        }
        return arr;
    }
    async refreshFiles() {
        const channel = await this.client.channels.cache.get(Config.channel_id) as TextChannel;
        if (!channel) throw TypeError(`Channel ${Config.channel_id} doesnt exist update your cfg`);
        if (!channel.isText()) throw Error("Invalid channel type expected text");
        const msgs = await channel.messages.fetch({ limit: 100 });

        this.files = [];
        const cache: Record<string, number> = {};

        const handleFile = async (file: FileOwner & FileChunk, msg: Message) => {
            if (file.chunk_id == 0) {
                if (cache[file.id] !== undefined) return;
                console.log("adding", file)
                cache[file.id] = this.files.push({
                    chunks: [file.id],
                    name: file.name,
                    size: file.size
                }) - 1
            } else {
                let ptr: number | undefined = cache[file.file_ptr];
                if (!ptr) {
                    const msg_owner = await channel.messages.fetch(file.file_ptr)
                    if (!msg_owner.content) throw Error(`Invalid file_ptr ${file.file_ptr}`)
                    let file_owner = Parse<FileOwner & FileChunk>(msg_owner.content, msg_owner.id);
                    if (!file_owner) return;
                    // console.log("no ptr fetching ", file.file_ptr, msg_owner)
                    await handleFile(file_owner, msg_owner);
                    ptr = cache[file.file_ptr]
                }
                const file_owner = this.files[ptr];
                file_owner.chunks[file.chunk_id] = msg.id;
                // file_owner.chunks.push(msg.id)
            }
        }

        msgs.forEach(async (msg, i) => {
            const file = Parse<FileOwner & FileChunk>(msg.content, msg.id);
            if (!file) return;
            await handleFile(file, msg);
            console.log(cache)
        })
    }

    async uploadFromPath(filepath: string, encryption: boolean) {

    }

    // TODO FILE encryption and decryption
    async uploadFile(buffer: string, file_name: string, encryption: boolean) {
        const chunks: string[] = stringIntoChunks(buffer, 1800)
        chunks[0] = DSTORE_HEADER + "\0" + "FILE\0"
            + file_name + '\0'
            + byteSize(buffer) + '\0'
            + chunks[0];

        const file_msg_id = (await this.channel.send(chunks[0])).id;

        for (let i = 1; i < chunks.length; i++) {
            const chunk = DSTORE_HEADER + "\0CHUNK\0"
                + file_msg_id + "\0"
                + i + "\0"
                + chunks[i];

            this.channel.send(chunk);
        }
    }

    constructor(public client: Client) {
        this.channel = this.client.channels.cache.get(Config.channel_id) as TextChannel;
        if (!this.channel || !this.channel.isText()) throw Error("Channel doesnt exist or isnt a TextChannel")
    }
}
