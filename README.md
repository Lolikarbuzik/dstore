# DSTORE a CLI for storing files on discord
## Features not added
- Encryption

## Config
For DStore to work you have to create a config file

```json
{
    "channel_id": "Your channel id",
    "oauth": "Auth token",
    "files_on_page": 10,
    "keymap": {
        "quit": "q",
        "upload": "u",
        "delete": "r",
        "download": "g",
        "file_up": "w",
        "file_down": "s",
        "page_up": "a",
        "page_down": "d"
    }
}
```

### Windows
%LOCALAPPDATA%\lolikarbuzik\config\config.json
### Linux
~/.config/lolikarbuzik/config/config.json
