import { Box, ConfirmPopup, ConsoleGuiOptions, ConsoleManager, FileSelectorPopup, InPageWidgetBuilder, InputPopup, PageBuilder, Progress } from "console-gui-tools";
import { Config } from "./config";
import DStore from "./index";
import Sleep from "../util/sleep";
import { readFileSync, writeFileSync } from "node:fs"
import Parse from "./parser";
function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default class DStore_UI {
    page = 0;
    file = 0;

    constructor(public dstore: DStore) {
        // dstore.uploadFile("H".repeat(100), "test.txt", false);
        this.render();
    }

    getPageCount() {
        return Math.ceil(this.dstore.files.length / (process.stdout.rows - 2))
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
                case Config.keymap.delete_page:
                    new ConfirmPopup({
                        id: "deletepagePopup", title: `Are you sure you want to delete this page?`
                    }).show().on("confirm", async () => {
                        for (let i = 0; i < files.length; i++) {
                            let file = files[i]
                            this.dstore.deleteFile(file)
                        }
                    })
                    this.dstore.refreshFiles();
                    refresh()
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
                        this.dstore.deleteFile(file)
                    })
                    await this.dstore.refreshFiles()
                    if (this.file > files.length - 1) {
                        this.file = files.length - 2
                    }
                    this.dstore.refreshFiles();
                    refresh()
                    break
                case Config.keymap.download:
                    let getfile = files[this.file];
                    if (!getfile) break;

                    new InputPopup({
                        id: "namePopup",
                        title: "Save as... (leave empty to quit)",
                        value: "",
                    }).show().on("confirm", async (value: string) => {
                        if (value == "") return;
                        writeFileSync(value, await this.dstore.getFile(getfile));
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
                case Config.keymap.page_previous:
                    this.page--
                    if (this.page < 0) {
                        this.page = this.getPageCount() - 1
                    }
                    refresh()
                    break
                case Config.keymap.page_next:
                    this.page = (this.page + 1) % this.getPageCount()
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
                    file_page.addRow({
                        text: `${file.name} (${formatBytes(file.size)})`,
                        color: "white",
                        bg: i === this.file ? "bgCyan" : undefined
                    })
                })
            }
            gui.refresh()
            gui.setPage(file_page, 0, `DSTORE - Page ${(this.page + 1).toString()}/${this.getPageCount()}`)
        }

        while (true) {
            await refresh()
            await Sleep(3000)
            await this.dstore.refreshFiles()
        }
    }
}
