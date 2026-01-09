# Changelog

Todas as mudanças notáveis no projeto InvMap serão documentadas neste arquivo.

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