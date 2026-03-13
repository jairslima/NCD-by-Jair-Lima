# NCD by Jair Lima - PROJECT.md

Documento de continuidade. Qualquer IA ou desenvolvedor pode assumir este projeto a partir deste arquivo.

---

## Descricao

NCD (New Change Directory) e uma ferramenta CLI para Windows, Linux e macOS que oferece um navegador visual de diretorios no terminal, inspirado no utilitario classico NCD do Norton Commander. Permite navegar, buscar, favoritar e mudar de diretorio com integracao ao shell.

---

## Stack e dependencias

- Linguagem: TypeScript (Node.js)
- Build: `tsc`
- TUI: `blessed`
- CLI parser: `commander`
- Publicacao: npm (`ncd-by-jair-lima`)

---

## Estrutura de pastas

```text
NCD/
|-- src/
|   |-- index.ts              # Ponto de entrada e roteamento de comandos
|   |-- setup.ts              # Instalacao da integracao com shells
|   |-- types.ts              # Tipos compartilhados
|   |-- core/
|   |   |-- directory.ts      # Criacao/carregamento de nos de diretorio
|   |   |-- index-manager.ts  # Indice JSON de diretorios (~/.ncd_index.json)
|   |   |-- search.ts         # Busca no indice + varredura fisica de fallback
|   |   |-- navigation.ts     # Grava ~/.ncd_last e encerra
|   |   |-- bookmarks.ts      # Favoritos (~/.ncd_bookmarks.json)
|   |   `-- history.ts        # Historico (~/.ncd_history.json)
|   `-- ui/
|       `-- app.ts            # TUI principal + picker de ambiguidade
|-- dist/                     # Saida do build
|-- package.json
|-- tsconfig.json
`-- PROJECT.md
```

---

## Arquivos de dados do usuario

| Arquivo | Descricao |
|---|---|
| `~/.ncd_index.json` | Indice de diretorios |
| `~/.ncd_last` | Caminho temporario para `cd` no shell |
| `~/.ncd_bookmarks.json` | Diretorios favoritados |
| `~/.ncd_history.json` | Historico de diretorios visitados |

---

## Comandos essenciais

```bash
npm run build
npm run dev
ncd
ncd nome
ncd "nome com espacos"
ncd setup
```

---

## Integracao com shell

O NCD nao pode mudar o diretorio do processo pai diretamente. O fluxo e:

1. O CLI grava o caminho escolhido em `~/.ncd_last`.
2. O wrapper do shell le esse arquivo e executa `cd`.
3. O arquivo temporario e removido depois do uso.

Perfis suportados pelo `ncd setup`:

- Bash
- PowerShell
- CMD

O setup atual tambem grava perfis de PowerShell para:

- Windows PowerShell
- PowerShell 7
- PowerShell ISE

Observacao: o PowerShell ISE pode carregar a funcao, mas a TUI de tela cheia continua nao suportada nele.

---

## Fluxo de busca por nome

1. Busca no indice (`~/.ncd_index.json`).
2. Os resultados sao ranqueados por:
   - nome exato
   - prefixo do nome
   - prefixo por tokens
   - substring
3. Se nao houver resultado no indice, cai para varredura fisica.
4. A varredura fisica faz uma passada curta primeiro e, se necessario, uma passada mais profunda.
5. Diretorios encontrados na varredura fisica sao adicionados ao indice quando ele existe.
6. Zero resultados: mostra `Pasta nao encontrada`.
7. Um resultado: navega direto.
8. Varios resultados: abre o picker.

---

## Indexacao automatica

- Primeiro uso sem indice: build completo varrendo os drives disponiveis
- CWD fora do indice: usa `scanAndAddToIndex` no diretorio atual
- `F5` na TUI: rebuild completo do indice
- Busca fisica: adiciona ao indice os diretorios visitados

---

## Requisitos de terminal

A TUI requer um terminal real com suporte a TTY.

Recomendado:

- Windows Terminal
- PowerShell console
- `pwsh`
- Terminais Linux/macOS

Nao suportado para a TUI:

- PowerShell ISE

Quando o host nao suporta a TUI, o CLI sai com mensagem clara em vez de abrir uma tela quebrada.

---

## Teclas do TUI

| Tecla | Acao |
|---|---|
| `Up/Down` ou `j/k` | Navegar |
| `Enter` | Ir para o diretorio selecionado |
| `Space` | Expandir/recolher |
| `Right/Left` ou `l/h` | Abrir/recolher |
| `/` | Busca inline |
| `B` | Favoritar/desfavoritar |
| `F` | Ver favoritos |
| `H` | Ver historico |
| `Tab` | Trocar de drive |
| `F5` | Rebuild do indice |
| `Esc` ou `Q` | Sair |

---

## Estado atual (2026-03-13)

- Funcional e publicado no npm como `ncd-by-jair-lima`
- Integracao com CMD, PowerShell e Bash via `ncd setup`
- Multi-drive no Windows
- Bookmarks, historico e picker de ambiguidade implementados
- Host sem TTY ou PowerShell ISE recebe erro claro em vez de TUI quebrada
- Busca por nome agora aceita exato, prefixo, tokens e substring

### Correcoes recentes

- `goToPath` valida a existencia do caminho antes de gravar `~/.ncd_last`
- Busca fisica atualiza o indice com diretorios visitados
- CWD nao indexada usa `scanAndAddToIndex` em vez de rebuild completo
- Mensagem de "nao encontrado" mostra o nome buscado
- Busca por nome foi ampliada com ranking e fallback mais profundo

---

## Problemas conhecidos / proximos passos

- O indice pode ficar desatualizado se pastas forem removidas
- A busca ainda nao e fuzzy; ela esta melhor que `startsWith`, mas ainda nao corrige erros de digitacao
- A varredura fisica profunda ainda pode ser custosa em maquinas com muitos arquivos
