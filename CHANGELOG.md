# Changelog

Todas as mudanças notáveis no projeto InvMap serão documentadas neste arquivo.

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