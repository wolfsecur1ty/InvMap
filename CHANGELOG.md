# Changelog

Todas as mudanças notáveis no projeto InvMap serão documentadas neste arquivo.

## [v2.2] - 06/05/2026
### ✔Adicionado
- **Redo/Undo (Ctrl+Z/Ctrl+Y):** Adicionado sistema de redo e undo para o mapa. Agora é possível desfazer e refazer alterações feitas nos nós e conexões.
### 🖊 Alterado
- **Sistema de Camadas Melhorado:** Agora ao invés de usar o DOM para ordenar os elementos, é usado z-index.

## [v2.1] - 02/04/2026
### ✔Adicionado
- **Detecção de Ambiente:** Adicionado sistema de detecção de ambiente, agora é possível saber se o mapa está sendo usado em modo desktop ou web.
- **Atualização Automática (Versão Desktop):** Agora ao abrir o InvMap em modo desktop, ele verificará se há uma nova versão disponível e mostrará um aviso para o usuário.
### ⚙ Corrigido
- **Nó de Entidade:** Corrigido bug que ignorava quebra de linha no campo de detalhes e largava visivel um campo de texto no canto do mapa.


## [v2.0] - 27/03/2026
### ✔Adicionado
- **Configurações do Mapa:** Adicionado sistema de configurações do mapa, agora você pode deixar o mapa mais com a sua cara.
- **Modo Privacidade:** Adicionado modo privacidade que oculta todas as informações do mapa. Agora você pode apresentar o seu mapa sem se preocupar com informações sensíveis.
- **Auto-Save:** Adicionado sistema de auto-save (desabilitado por padrão). O usuário pode habilitar o auto-save nas configurações do mapa.
- **Informações do Mapa:** Adicionado sistema de informações do mapa, agora você pode ver varias estatísticas e informações sobre o mapa.
- **Modo Claro/Escuro Com Cores:** Adicionado modo claro/escuro com cores personalizáveis.

### 🖊 Alterado
- **Refatoração Completa do Visual:** O visual do mapa foi completamente refeito, agora ele é mais moderno e agradável de usar.
- **Hierarquia da Interface:** Botões de sistema e gerenciamento de arquivos (Salvar, Exportar, etc.) foram movidos para o Header.

### ⚙ Corrigido
- **Movimentação dos Nodes:** Corrigido bug que causava desalinhamento do botão de contexto e dos botões de adicionar conexão.
- **Stickers Defeituosos:** Corrigidos varios bugs que causavam problemas com os stickers de texto solto, forma, seta, linha e ícone.
- **Menu Não-Adaptável:** Corrigidos varios menus que não respeitavam os limites da tela em dispositivos móveis.

## [v1.5] - 20/01/2026
### ✔Adicionado
- **Alinhamento:** Adicionado sistema de alinhamento com a grid (Shift + Arrastar).
- **Funções de Copiar, Colar e Duplicar:** Agora é possível copiar, colar e duplicar nós e visuais.
- **Sistema de Seleção:** Agora é possível selecionar múltiplos nós e visuais para operações em massa.
- **Layers:** Agora você pode organizar o nível de camadas dos elementos do mapa.

### 🖊 Alterado
- **Setas de Conexão selecionáveis:** Agora é possível selecionar e apagar setas de conexão sem a necessidade de apagar um dos nós da conexão.
- **Melhoria na Interface do Header:** Agora é possível editar o título do mapa diretamente no header, também é possível verificar se o mapa está salvo ou não.

### ⚙ Corrigido
- **Preview de Conexão Otimizado:** O preview agora é mais preciso e leve.
- **Seleção Padrão:** Antes os elementos de texto e imagem dos nós poderiam ser selecionados acidentalmente pelo navegador, agora isso foi corrigido.
- **Criar Nó Ligado a Seleção Antiga:** Antes em alguns casos ao criar um novo nó a partir de um nó existe, poderia acontecer do nó ser criado a partir do nó selecionado anteriormente ao invés do nó selecionado atualmente. Agora isso foi corrigido.
- **Botões de Contexto Não Somem:** Corrigido bug que fazia com que os botões de contexto continuassem visiveis mesmo após começar a movimentar o nó.

## [v1.4] - 09/01/2026
### ✔Adicionado
- **Changelog:** Adicionado arquivo de changelog para documentar todas as mudanças notáveis no projeto InvMap.
- **Interface Mobile Melhorada:** Novo sistema de menu "hambúrguer" para dispositivos móveis. Os botões agora ficam organizados em uma coluna flutuante com rolagem, melhorando a área de visualização do mapa.

### ⚙ Corrigido
- **Motor de Exportação:** Substituição do método antigo pela biblioteca `html-to-image`. Agora:
    - Imagens dentro dos nós são renderizadas corretamente.
    - Textos digitados em `inputs` e `textareas` aparecem na exportação.
    - Ícones e estilos CSS são preservados.
- **Exportação SVG:** Agora gera um arquivo vetorial híbrido (com foreignObject) que mantém a editabilidade e a fidelidade visual.
- **Correção de Bugs:** Corrigido varios bugs que afetavam negativamente a experiência do mapa.

### 🖊 Alterado
- Reorganização visual da barra de ferramentas (agora utiliza um wrapper flutuante para melhor posicionamento).