# DSTORE a CLI for storing files on discord

## Features

-   Encryption
-   File saving
-   Automaticly zipping and unzipping zip files (in future)

## Installation

```bash
git clone https://github.com/Lolikarbuzik/dstore.git
cd dstore
npm install
```

To start the cli you can build the project using `npm run build` or use `ts-node .`

## Config

For DStore to work you have to create a config file

```json
{
    "channel_id": "Your channel id",
    "oauth": "Auth token",
    "keymap": {
        "quit": "q",
        "upload": "u",
        "delete": "r",
        "download": "g",
        "file_up": "w",
        "file_down": "s",
        "page_up": "a",
        "page_down": "d"
    },
    "keys": {
        {
            "key": "your_private_key_with_24_bytes_for_aes192_or_32_aes256",
            "encryption": "aes192",
            "name": "your_key_name"
        }
    }
}
```

### Windows

%LOCALAPPDATA%\lolikarbuzik\config\config.json

### Linux

~/.config/lolikarbuzik/config/config.json
