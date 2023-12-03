import { ChannelLogsQueryOptions, Client, Message, MessageAttachment, TextChannel } from 'discord.js-selfbot-v13'
import { Config } from './config'
import { stringIntoChunks } from '../util/chunks';
import Parse from './parser';
import { DSTORE_HEADER } from '../util/header';

type File = {
    name: string,
    chunks: [att_url: string, msg_id: string][],
    size: number,
}

const byteSize = (str: string) => Buffer.byteLength(str, 'utf-8')

async function fetchAllMessages(channel: TextChannel): Promise<Message[]> {
    let allMessages: Message[] = [];
    let lastId;

    while (true) {
        const options: ChannelLogsQueryOptions = { limit: 100 };
        if (lastId) {
            options.before = lastId;
        }

        const messages = await channel.messages.fetch(options);
        allMessages = allMessages.concat(Array.from(messages.values()));
        if (messages.size != 100) {
            break;
        }

        lastId = messages.last()?.id;
    }

    return allMessages;
}

export default class DStore {
    files: File[] = []

    channel!: TextChannel;

    getPage(page: number): File[] {
        const files_on_page = process.stdout.rows - 2
        const arr: File[] = [];
        for (let i = page * files_on_page; i < Math.min((page + 1) * files_on_page, this.files.length); i++) {
            arr.push(this.files[i])
        }
        return arr;
    }
    async refreshFiles() {
        await this.getChannel();
        const msgs = await fetchAllMessages(this.channel);
        this.files = [];

        const cache: Record<string, number | undefined> = {};

        const handle = async (msg: Message) => {
            const att = msg.attachments.first()
            if (!att || !att.name) return;
            const split: string[] = att.name.split("_")
            if (split[0] === "CHUNK") {
                let ptr = cache[split[1]]
                if (!ptr) {
                    const file_msg = await this.channel.messages.fetch(split[1]);
                    if (!file_msg) {
                        console.log(`File ${split[1]} doesnt exist and all chunks of it are invalid`)
                        return;
                    }
                    await handle(file_msg);
                    ptr = cache[split[1]] as number
                }
                const file = this.files[ptr]
                const chunk_id = parseInt(split[2])
                file.chunks[chunk_id] = [att.url, msg.id];
            } else if (split[0] === "FILE" && cache[msg.id] === undefined) {
                cache[msg.id] = this.files.push({
                    name: split[1],
                    chunks: [[att.url, msg.id]],
                    size: parseInt(split[2]),
                }) - 1
            }
        }

        for (let i = 0; i < msgs.length; i++) {
            await handle(msgs[i])
        }
    }

    async getFile(file: File): Promise<string> {
        let content = "";

        for (let i = 0; i < file.chunks.length; i++) {
            const chunk = file.chunks[i];
            content += await (await fetch(chunk[0])).text()
        }
        return content
    }

    async deleteFile(file: File) {
        for (let i = 0; i < file.chunks.length; i++) {
            const chunk = file.chunks[i];
            (await this.channel.messages.fetch(chunk[1])).delete()
        }
    }

    async getChannel() {
        const channel = await this.client.channels.cache.get(Config.channel_id) as TextChannel;
        if (!channel) throw TypeError(`Channel ${Config.channel_id} doesnt exist update your cfg`);
        if (!channel.isText()) throw Error("Invalid channel type expected text");
        this.channel = channel;
    }

    // TODO FILE encryption and decryption
    async uploadFile(buffer: string, file_name: string, encryption: boolean) {
        await this.getChannel();
        file_name = file_name.replace("_", "");
        const chunks: string[] = stringIntoChunks(buffer, 1024 * 1024 * 25)

        const file_msg_id = (await this.channel.send({
            files: [
                new MessageAttachment(Buffer.from(chunks[0], 'utf8'), `FILE_${file_name}_${byteSize(buffer)}`)
            ]
        })).id

        for (let i = 1; i < chunks.length; i++) {
            await this.channel.send({
                files: [
                    new MessageAttachment(Buffer.from(chunks[i], 'utf8'), `CHUNK_${file_msg_id}_${i}`)
                ]
            })
        }
    }

    constructor(public client: Client) {
        this.getChannel();
    }
}
