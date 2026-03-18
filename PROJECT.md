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
|   |-- shell-integration.ts  # Wrappers e helpers compartilhados de shell/CMD
|   |-- types.ts              # Tipos compartilhados
|   |-- core/
|   |   |-- directory-rules.ts# Regras compartilhadas de visibilidade/exclusao
|   |   |-- root-utils.ts     # Compactacao de roots para evitar scans redundantes
|   |   |-- directory.ts      # Criacao/carregamento de nos de diretorio
|   |   |-- index-manager.ts  # Indice JSON de diretorios (~/.ncd_index.json)
|   |   |-- search.ts         # Busca no indice + varredura fisica de fallback
|   |   |-- navigation.ts     # Grava ~/.ncd_last e encerra
|   |   |-- bookmarks.ts      # Favoritos (~/.ncd_bookmarks.json)
|   |   `-- history.ts        # Historico (~/.ncd_history.json)
|   |-- tests/
|   |   `-- run.ts            # Regressao basica de ranking e regras de diretorio
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
npm test
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

## Estado atual (2026-03-18)

- Funcional e publicado no npm como `ncd-by-jair-lima`
- Integracao com CMD, PowerShell e Bash via `ncd setup`
- Multi-drive no Windows
- Bookmarks, historico e picker de ambiguidade implementados
- Host sem TTY ou PowerShell ISE recebe erro claro em vez de TUI quebrada
- Busca por nome agora aceita exato, prefixo, tokens e substring
- Regras de exclusao de diretorios foram centralizadas em `src/core/directory-rules.ts`
- Existe uma base inicial de testes automatizados cobrindo ranking e filtros de diretorio
- `tsconfig.json` agora exige `noImplicitAny`, mas o projeto ainda nao esta em `strict: true`
- `setup` e `postinstall` agora compartilham a mesma geracao de wrapper CMD via `src/shell-integration.ts`
- Indexacao e busca fisica agora compactam roots sobrepostas antes de varrer o disco
- O rebuild interativo do indice e o primeiro build interativo agora usam varredura assincrona por lotes
- O fallback de busca por nome no CLI agora usa varredura assincrona por lotes quando precisa ir ao disco
- Wrapper CMD corrigido em 2026-03-18: agora le `.ncd_last` e executa `cd /d` apos rodar o node

### Correcoes recentes

- `goToPath` valida a existencia do caminho antes de gravar `~/.ncd_last`
- Busca fisica atualiza o indice com diretorios visitados
- CWD nao indexada usa `scanAndAddToIndex` em vez de rebuild completo
- Mensagem de "nao encontrado" mostra o nome buscado
- Busca por nome foi ampliada com ranking e fallback mais profundo
- `directory.ts`, `search.ts` e `index-manager.ts` agora compartilham a mesma regra base de exclusao
- A TUI continua podendo exibir diretorios ocultos, mas indexacao e busca fisica seguem regras mais conservadoras
- O projeto passou a ter comando `npm test` para regressao basica
- `postinstall.ts` deixou de usar a estrategia antiga baseada em captura de `stdout` e agora segue o fluxo oficial de `.ncd_last`
- `root-utils.ts` elimina scans redundantes quando `cwd`, `home`, pai do `home` e raiz se sobrepoem
- `buildIndexAsync` reduz travamentos perceptiveis durante `F5` e no primeiro uso interativo
- `findDirectoriesAsync` reduz bloqueio no fluxo `ncd <nome>` quando o indice nao resolve a consulta
- Wrapper `ncd.cmd` corrigido: apos o node encerrar, le `%USERPROFILE%\.ncd_last` e executa `cd /d` para efetivar a mudanca de pasta no CMD
- (18/03/2026) Refatoração da integração de shell (PowerShell e CMD): corrigido o conflito onde o wrapper CMD consumia o arquivo `.ncd_last` antes de retornar ao shell pai, gerando o erro de sintaxe.
- (18/03/2026) O comando `ncd setup` foi aprimorado para atualizar (via regex) o conteúdo das funções no `PROFILE` do PowerShell e Bash, em vez de apenas ignorar caso a tag já existisse.
- (18/03/2026) Criação do arquivo `GEMINI.md` para documentar o resumo técnico e facilitar a continuidade por outras IAs.

---

## Problemas conhecidos / proximos passos

- O indice pode ficar desatualizado se pastas forem removidas
- A busca ainda nao e fuzzy; ela esta melhor que `startsWith`, mas ainda nao corrige erros de digitacao
- A varredura fisica profunda ainda pode ser custosa em maquinas com muitos arquivos
- A indexacao e boa parte da busca continuam sincronos; em discos grandes a UX pode travar temporariamente
- Falta ampliar os testes para cobrirem navegacao, persistencia de bookmarks/historico e cenarios de erro de integracao
- Integracao CMD pendente de validacao pelo usuario em terminal real apos correcao do wrapper em 2026-03-18
