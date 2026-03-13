# NCD by Jair Lima

A modern, cross-platform clone of the classic Norton Change Directory (NCD) utility: a visual, keyboard-driven directory tree navigator for the terminal.

---

## Features

- Visual directory tree with expand/collapse
- Keyboard navigation with arrows or `j/k/h/l`
- Folder search with exact, prefix, token, and substring matching
- PageUp / PageDown for fast scrolling
- Cross-platform: Windows, Linux, macOS
- Shell integration to `cd` into the selected directory

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
# Open the TUI from the current directory
ncd

# Open the TUI from a specific path
ncd /home/user
ncd C:\Users

# Search by folder name
ncd claude
ncd "visual studio"
```

`ncd name` first searches the index and then falls back to a live disk scan when needed.
Results are ranked so exact names come first, then prefix matches, token-prefix matches,
and finally substring matches.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Up` / `k` | Move up |
| `Down` / `j` | Move down |
| `Right` / `l` | Expand directory |
| `Left` / `h` | Collapse directory |
| `Enter` | Select directory / change directory |
| `Space` | Expand or collapse directory |
| `PageUp` | Scroll up 10 items |
| `PageDown` | Scroll down 10 items |
| `/` | Start search |
| `Esc` | Cancel search |
| `Backspace` | Delete search character |
| `B` | Toggle bookmark |
| `F` | Open favorites |
| `H` | Open history |
| `Tab` | Switch drive on Windows |
| `F5` | Rebuild index |
| `Q` | Quit |

---

## Shell Integration

NCD cannot change the parent shell directory directly. It writes the selected path to
`~/.ncd_last`, and the shell wrapper reads that file and runs `cd`.

Run `ncd setup` to install shell integration automatically.

### Bash / Zsh

```bash
function ncd() {
  command ncd "$@"
  local selected=$(cat ~/.ncd_last 2>/dev/null)
  if [ -n "$selected" ]; then
    cd "$selected"
    rm -f ~/.ncd_last
  fi
}
```

### PowerShell

```powershell
function ncd {
  & ncd.cmd @args
  $selected = Get-Content "$env:USERPROFILE\.ncd_last" -ErrorAction SilentlyContinue
  if ($selected) {
    Set-Location $selected
    Remove-Item "$env:USERPROFILE\.ncd_last" -ErrorAction SilentlyContinue
  }
}
```

### CMD

`ncd setup` also installs a custom `ncd.cmd` wrapper in the npm global bin directory.

---

## Terminal Support

The full-screen TUI requires a real terminal with TTY support.

Recommended:
- Windows Terminal
- PowerShell console
- `pwsh`
- Linux/macOS terminals

Not supported for the TUI:
- PowerShell ISE

If NCD detects an unsupported host, it exits with a clear message instead of opening a broken screen.

---

## Development

```bash
npm run dev
npm run build
npm start
```

---

## Inspired by

[Norton Change Directory (NCD)](https://en.wikipedia.org/wiki/Norton_Utilities), a DOS-era utility that made directory navigation fast and visual.

---

## Author

Jair Lima - [github.com/jairslima](https://github.com/jairslima)

## License

MIT
