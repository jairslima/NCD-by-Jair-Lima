# NCD by Jair Lima

A modern, cross-platform clone of the classic **Norton Change Directory (NCD)** utility — a visual, keyboard-driven directory tree navigator for the terminal.

---

## Features

- Visual directory tree with expand/collapse
- Keyboard navigation (arrows, vim keys `j/k/h/l`)
- Real-time search/filter by folder name
- PageUp / PageDown for fast scrolling
- Cross-platform: Windows, Linux, macOS
- Shell integration to `cd` into selected directory

---

## Installation

```bash
git clone https://github.com/jairslima/NCD-by-Jair-Lima.git
cd NCD-by-Jair-Lima
npm install
npm run build
npm install -g .
```

---

## Usage

```bash
# Navigate from current directory
ncd

# Navigate from a specific directory
ncd /home/user
ncd C:\Users
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `→` / `l` | Expand directory |
| `←` / `h` | Collapse directory |
| `Enter` / `Space` | Expand or select directory |
| `PageUp` | Scroll up 10 items |
| `PageDown` | Scroll down 10 items |
| `/` | Start search |
| `Esc` | Cancel search |
| `Backspace` | Delete search character |
| `Q` | Quit |

---

## Shell Integration (cd to selected directory)

To make `ncd` change your shell's working directory, add the function below to your shell config file.

### Bash / Zsh (`~/.bashrc` or `~/.zshrc`)

```bash
function ncd() {
  command ncd "$@"
  local selected=$(cat /tmp/.ncd_path 2>/dev/null)
  [ -n "$selected" ] && cd "$selected" && rm -f /tmp/.ncd_path
}
```

### Fish (`~/.config/fish/config.fish`)

```fish
function ncd
  command ncd $argv
  set selected (cat /tmp/.ncd_path 2>/dev/null)
  if test -n "$selected"
    cd $selected
    rm -f /tmp/.ncd_path
  end
end
```

### PowerShell (`$PROFILE`)

```powershell
function ncd {
  & ncd.cmd @args
  $selected = Get-Content "$env:USERPROFILE\.ncd_last" -ErrorAction SilentlyContinue
  if ($selected) { Set-Location $selected; Remove-Item "$env:USERPROFILE\.ncd_last" }
}
```

Run `ncd setup` to install the shell integration automatically.

The full-screen TUI requires a real terminal with TTY support. Use Windows Terminal,
PowerShell console, or `pwsh`. PowerShell ISE is not supported for the TUI.

---

## Development

```bash
npm run dev          # Run directly with ts-node
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled version
```

---

## Inspired by

[Norton Change Directory (NCD)](https://en.wikipedia.org/wiki/Norton_Utilities) — a beloved utility from the DOS era by Peter Norton, that made navigating directory trees fast and visual.

---

## Author

**Jair Lima** — [github.com/jairslima](https://github.com/jairslima)

## License

MIT
