import { ChannelLogsQueryOptions, Client, Message, MessageAttachment, TextChannel } from 'discord.js-selfbot-v13'
import { Config } from './config'
import { stringIntoChunks } from '../util/chunks';
import { scryptSync, createCipher, createDecipher, randomBytes } from 'node:crypto'

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
            if (split[0] === "C") {
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
            } else if (split[0] === "F" && cache[msg.id] === undefined) {
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
            let split = (await (await fetch(chunk[0])).text()).split(":")
            if (split.length === 1) {
                content += split;
            } else if (split.length === 3) {
                let salt = split[1];
                Config.keys.forEach(key => {
                    const hash = scryptSync(key.key, salt, 64).toString('hex')
                    if (hash == split[0]) {
                        const decipher = createDecipher(key.encryption, key.key);
                        content += decipher.update(split[2], "hex", "utf8") + decipher.final("utf8")
                    }
                })
            }
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
    async uploadFile(buffer: string, file_name: string, key?: EncryptionKey) {
        await this.getChannel();
        file_name = file_name.replace("_", "");
        const chunks: string[] = stringIntoChunks(buffer, 1024 * 1024 * (key ? 10 : 25)).map(v => {
            if (!key) return v;
            const cipher = createCipher(key.encryption, key.key)
            return cipher.update(v, 'utf8', 'hex') + cipher.final("hex")
        })

        const salt = randomBytes(16).toString('hex');
        const hashed_key = key ? `${scryptSync(key.key, salt, 64).toString('hex')}:${salt}:` : ""

        let size = 0

        chunks.forEach((v) => {
            size += byteSize(hashed_key + v)
        })

        console.log(size)

        const file_msg_id = (await this.channel.send({
            files: [
                new MessageAttachment(Buffer.from(hashed_key + chunks[0], 'utf8'), `F_${file_name}_${size}`)
            ]
        })).id

        for (let i = 1; i < chunks.length; i++) {
            await this.channel.send({
                files: [
                    new MessageAttachment(Buffer.from(hashed_key + chunks[i], 'utf8'), `C_${file_msg_id}_${i}`)
                ]
            })
        }
    }

    constructor(public client: Client) {
        this.getChannel();
    }
}
