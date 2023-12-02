import { Box, ConfirmPopup, ConsoleGuiOptions, ConsoleManager, FileSelectorPopup, InPageWidgetBuilder, InputPopup, PageBuilder, Progress } from "console-gui-tools";
import { Config } from "./config";
import DStore from "./index";
import Sleep from "../util/sleep";
import { readFileSync, writeFileSync } from "node:fs"
import Parse from "./parser";

const FILE_SIZE = 1000

export default class DStore_UI {
    page = 0;
    file = 0;

    constructor(public dstore: DStore) {
        // dstore.uploadFile("H".repeat(100), "test.txt", false);
        this.render();
    }


    async render() {
        await this.dstore.refreshFiles()
        let files = this.dstore.getPage(this.page);
        const opt: ConsoleGuiOptions = {
            title: "DSTORE",
            layoutOptions: {
                type: "single",
                showTitle: true,
                boxed: true,
                fitHeight: true
            },
            enableMouse: true,
            logLocation: "popup"
        }

        const gui = new ConsoleManager(opt);

        const close_app = () => {
            console.clear()
            process.exit()
        }
        gui.on("exit", close_app)


        gui.on("keypressed", async (key) => {
            switch (key.name) {
                case Config.keymap.quit:
                    new ConfirmPopup({
                        id: "popupQuit", title: "Are you sure you want to quit?"
                    }).show().on("confirm", () => close_app())
                    break
                case Config.keymap.upload:
                    new FileSelectorPopup({
                        id: "filePopup",
                        title: "File to upload",
                        basePath: "./"
                    }).show().on("confirm", (file) => {
                        new ConfirmPopup({
                            id: "aysUpload", title: `Are you sure you want to upload '${file.name}'?`
                        }).show().on("confirm", () => {
                            const buffer = readFileSync(file.path, "utf8");
                            if (!buffer) {
                                return;
                            }
                            this.dstore.uploadFile(buffer, file.name, false);
                        })
                    })
                    await this.dstore.refreshFiles()
                    refresh()
                    break
                case Config.keymap.delete:
                    let file = files[this.file];
                    if (!file) break;
                    new ConfirmPopup({
                        id: "deletePopup", title: `Are you sure you want to delete '${file.name}'?`
                    }).show().on("confirm", async () => {
                        for (let i = 0; i < file.chunks.length; i++) {
                            const chunk_id = file.chunks[i];
                            (await this.dstore.channel.messages.fetch(chunk_id)).delete()
                        }
                    })
                    await this.dstore.refreshFiles()
                    if (this.file > files.length - 1) {
                        this.file = files.length - 2
                    }
                    refresh()
                    break
                case Config.keymap.download:
                    let getfile = files[this.file];
                    if (!getfile) break;

                    let content = "";

                    for (let i = 0; i < getfile.chunks.length; i++) {
                        const chunk_id = getfile.chunks[i];
                        const msg = (await this.dstore.channel.messages.fetch(chunk_id))
                        const parsed = Parse(msg.content, msg.id);
                        content += parsed?.chunk;
                    }

                    new InputPopup({
                        id: "namePopup",
                        title: "Save as... (leave empty to quit)",
                        value: "",
                    }).show().on("confirm", (value: string) => {
                        if (value == "") return;
                        writeFileSync(value, content);
                    })

                    refresh()
                    break;
                case Config.keymap.file_up:
                    this.file--
                    if (this.file < 0) {
                        this.file = files.length - 1
                    }
                    refresh()
                    break
                case Config.keymap.file_down:
                    this.file = (this.file + 1) % files.length
                    refresh()
                    break
                case Config.keymap.page_up:
                    this.page--
                    if (this.page < 0) {
                        this.page = Math.floor(this.dstore.files.length / process.stdout.rows - 2)
                    }
                    refresh()
                    break
                case Config.keymap.page_down:
                    this.page = (this.page + 1) % (Math.ceil(this.dstore.files.length / process.stdout.rows - 2))
                    refresh()
                    break
                default:
                    break
            }
        })

        const file_page = new PageBuilder()

        const refresh = async () => {

            files = this.dstore.getPage(this.page);
            file_page.clear();
            if (files.length === 0) {
                file_page.addRow({
                    text: "No files found on this page. Press 'u' to upload file"
                })
            } else {
                files.forEach((file, i) => {
                    let size = (file.size / FILE_SIZE);
                    let ext = "mb"
                    if (size > FILE_SIZE / 10) {
                        size = size / FILE_SIZE
                        ext = "gb"
                    }
                    file_page.addRow({
                        text: `${file.name} (${size.toString()}${ext})`,
                        color: "white",
                        bg: i === this.file ? "bgCyan" : undefined
                    })
                })
            }
            gui.refresh()
        }

        while (true) {
            gui.setPage(file_page, 0, `DSTORE - Page ${this.page + 1}/${Math.max(Math.ceil(this.dstore.files.length / process.stdout.rows - 2), 1)}`)
            await refresh()
            await Sleep(3000)
            await this.dstore.refreshFiles()
        }
    }
}
