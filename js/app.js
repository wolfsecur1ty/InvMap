document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores e Configuração Inicial ---
    const svg = document.getElementById('mindmap-svg');
    const svgContainer = document.getElementById('svg-container');
    const camera = document.getElementById('camera');
    const defs = document.getElementById('svg-defs');
    const nodesLayer = document.getElementById('nodes-layer');
    const edgesLayer = document.getElementById('edges-layer');
    const textMeasurer = document.getElementById('text-measurer');
    const detailsMeasurer = document.getElementById('details-measurer');
    const addControlsContainer = document.getElementById('add-controls-container');
    const contextMenuContainer = document.getElementById('context-menu-container');
    const contextLinkBtn = document.getElementById('context-link-btn');
    const contextDeleteBtn = document.getElementById('context-delete-btn');
    const centerX = svg.clientWidth / 2;
    const centerY = svg.clientHeight / 2;

    // --- Constantes de Configuração ---
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.5;

    // --- Seletores do Modal e Botões ---
    const entityModal = document.getElementById('entity-type-modal');
    const addEntityNodeBtn = document.getElementById('add-entity-node-btn');
    const addPersonBtn = document.getElementById('add-person-btn');
    const addCompanyBtn = document.getElementById('add-company-btn');
    const linkNodeBtn = document.getElementById('link-node-btn');
    const saveOptionsModal = document.getElementById('save-options-modal');
    const saveUnencryptedBtn = document.getElementById('save-unencrypted-btn');
    const saveEncryptedBtn = document.getElementById('save-encrypted-btn');
    const savePasswordModal = document.getElementById('save-password-modal');
    const loadPasswordModal = document.getElementById('load-password-modal');
    const confirmSaveBtn = document.getElementById('confirm-save-btn');
    const cancelSaveBtn = document.getElementById('cancel-save-btn');
    const confirmLoadBtn = document.getElementById('confirm-load-btn');
    const cancelLoadBtn = document.getElementById('cancel-load-btn');
    const entityEditModal = document.getElementById('entity-edit-modal');
    const saveEntityEditBtn = document.getElementById('save-entity-edit-btn');
    const cancelEntityEditBtn = document.getElementById('cancel-entity-edit-btn');
    const entityEditPhotoInput = document.getElementById('entity-edit-photo-input');
    const entityEditPhotoPreview = document.getElementById('entity-edit-photo-preview');


    // --- Gerenciamento de Estado ---
    let state = {
        nodes: {
            "root": { id: "root", x: centerX, y: centerY, width: 150, height: 50, label: "Tópico Principal" }
        },
        edges: {},
        selectedNodeId: "root",
        hoveredNodeId: null,
        dragging: false, draggedNodeId: null, dragOffset: { x: 0, y: 0 },
        panning: false, lastMousePos: { x: 0, y: 0 },
        cameraPos: { x: 0, y: 0 }, zoom: 1,
        editingNodeId: null,
        tempPhotoData: null,
        linkingFromNodeId: null
    };

    // --- Funções Auxiliares de Coordenadas ---
    function getSVGPoint(screenX, screenY) {
        let point = svg.createSVGPoint();
        point.x = screenX;
        point.y = screenY;
        return point.matrixTransform(camera.getScreenCTM().inverse());
    }

    function getModelToScreenCoordinates(modelX, modelY) {
        let point = svg.createSVGPoint();
        point.x = modelX;
        point.y = modelY;
        return point.matrixTransform(camera.getCTM());
    }

    // --- Lógica de Renderização e UI ---
    function updateCameraTransform() {
        camera.setAttribute('transform', `translate(${state.cameraPos.x}, ${state.cameraPos.y}) scale(${state.zoom})`);
    }

    function getAnchorPoint(node, anchorSide) {
        switch (anchorSide) {
            case 'top': return { x: node.x, y: node.y - node.height / 2 };
            case 'bottom': return { x: node.x, y: node.y + node.height / 2 };
            case 'left': return { x: node.x - node.width / 2, y: node.y };
            case 'right': return { x: node.x + node.width / 2, y: node.y };
            default: return { x: node.x, y: node.y };
        }
    }

    function calculateCurvedPath(edge) {
        const sourceNode = state.nodes[edge.source];
        const targetNode = state.nodes[edge.target];
        if (!sourceNode || !targetNode) return '';
        const startPoint = getAnchorPoint(sourceNode, edge.sourceAnchor);
        const endPoint = getAnchorPoint(targetNode, edge.targetAnchor);
        const sx = startPoint.x, sy = startPoint.y, tx = endPoint.x, ty = endPoint.y;
        let cp1x = sx, cp1y = sy, cp2x = tx, cp2y = ty;
        const curveFactor = 100;
        if (edge.sourceAnchor === 'top')    { cp1y -= curveFactor; }
        if (edge.sourceAnchor === 'bottom') { cp1y += curveFactor; }
        if (edge.sourceAnchor === 'left')   { cp1x -= curveFactor; }
        if (edge.sourceAnchor === 'right')  { cp1x += curveFactor; }
        if (edge.targetAnchor === 'top')    { cp2y -= curveFactor; }
        if (edge.targetAnchor === 'bottom') { cp2y += curveFactor; }
        if (edge.targetAnchor === 'left')   { cp2x -= curveFactor; }
        if (edge.targetAnchor === 'right')  { cp2x += curveFactor; }
        return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
    }

    function renderNode(nodeData) {
        const svgNS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("id", nodeData.id);
        group.setAttribute("class", "node-group");
        if (nodeData.id === state.selectedNodeId) group.classList.add('selected');
        group.setAttribute("transform", `translate(${nodeData.x}, ${nodeData.y})`);

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("class", "node-rect");
        rect.setAttribute("width", nodeData.width);
        rect.setAttribute("height", nodeData.height);
        rect.setAttribute("x", -nodeData.width / 2);
        rect.setAttribute("y", -nodeData.height / 2);

        group.appendChild(rect);

        const padding = 5;
        const foreignObject = document.createElementNS(svgNS, "foreignObject");
        foreignObject.setAttribute("width", nodeData.width - padding * 2);
        foreignObject.setAttribute("height", nodeData.height - padding * 2);
        foreignObject.setAttribute("x", -nodeData.width / 2 + padding);
        foreignObject.setAttribute("y", -nodeData.height / 2 + padding);

        const htmlContent = document.createElement("div");
        htmlContent.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

        if (nodeData.type === 'image') {
            htmlContent.className = "node-image-container";
            htmlContent.innerHTML = `
                <img src="${nodeData.imageData}" class="node-image" />
                <span class="image-node-label">${nodeData.label}</span>
                <button class="view-image-btn" title="Abrir imagem em nova aba">
                    <i class="fas fa-expand-alt" style="pointer-events: none;"></i>
                </button>
            `;
        } else if (nodeData.type === 'entity') {
            htmlContent.className = "entity-node-container";
            if (nodeData.entityType === 'person') {
                htmlContent.innerHTML = `
                    <div class="entity-photo">
                        ${nodeData.photoData ? `<img src="${nodeData.photoData}" />` : '<i class="fas fa-user"></i>'}
                    </div>
                    <div class="entity-info">
                        <div class="entity-info-header">
                            <div class="entity-field" style="flex-grow: 1;">
                                <span class="entity-field-label">Nome</span>
                                <div class="entity-name">${nodeData.name}</div>
                            </div>
                            <div class="entity-field">
                                <span class="entity-field-label">Idade</span>
                                <div class="entity-age">${nodeData.age}</div>
                            </div>
                        </div>
                        <div class="entity-field">
                            <span class="entity-field-label">Detalhes</span>
                            <div class="entity-details-box">${nodeData.details}</div>
                        </div>
                    </div>`;
            } else { // Fallback para Empresa ou outros tipos
                htmlContent.innerHTML = `
                    <div class="entity-photo">
                        ${nodeData.photoData ? `<img src="${nodeData.photoData}" />` : '<i class="fas fa-building"></i>'}
                    </div>
                    <div class="entity-info">
                        <div class="entity-field">
                            <span class="entity-field-label">Nome da Empresa</span>
                            <div class="entity-name company-field-name">${nodeData.name}</div>
                        </div>
                        <div class="entity-field">
                            <span class="entity-field-label">CNPJ</span>
                            <div class="entity-details-box company-field-cnpj">${nodeData.cnpj}</div>
                        </div>
                    </div>`;
            }
        } else { // Nó de texto padrão
            htmlContent.className = "node-html-content";
            htmlContent.innerHTML = `<span class="node-label">${nodeData.label.replace(/\n/g, '<br>')}</span><textarea class="node-editor-textarea" style="display: none;">${nodeData.label}</textarea>`;
        }

        foreignObject.appendChild(htmlContent);
        group.appendChild(foreignObject);
        nodesLayer.appendChild(group);
    }


    function renderEdge(edgeData) {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("id", edgeData.id);
        path.setAttribute("class", "edge-path");
        path.setAttribute("d", calculateCurvedPath(edgeData));
        edgesLayer.appendChild(path);
    }

    function render() {
        edgesLayer.innerHTML = '';
        nodesLayer.innerHTML = '';
        for (const edgeId in state.edges) renderEdge(state.edges[edgeId]);
        for (const nodeId in state.nodes) renderNode(state.nodes[nodeId]);
    }

    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    function updateConnectedEdges(nodeId) {
        for (const edgeId in state.edges) {
            const edge = state.edges[edgeId];
            if (edge.source === nodeId || edge.target === nodeId) {
                const pathElement = document.getElementById(edge.id);
                if (pathElement) pathElement.setAttribute("d", calculateCurvedPath(edge));
            }
        }
    }

    function updateAddControlsPosition(node) {
        if (!node) return;
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return;

        const nodeRect = nodeElement.getBoundingClientRect();
        const baseOffset = 20; // Offset em pixels da tela

        const positions = {
            top: {
                x: nodeRect.left + nodeRect.width / 2,
                y: nodeRect.top - baseOffset
            },
            bottom: {
                x: nodeRect.left + nodeRect.width / 2,
                y: nodeRect.bottom + baseOffset
            },
            left: {
                x: nodeRect.left - baseOffset,
                y: nodeRect.top + nodeRect.height / 2
            },
            right: {
                x: nodeRect.right + baseOffset,
                y: nodeRect.top + nodeRect.height / 2
            }
        };

        addControlsContainer.querySelectorAll('.add-node-context-btn').forEach(btn => {
            const direction = btn.dataset.direction;
            if (positions[direction]) {
                btn.style.left = `${positions[direction].x}px`;
                btn.style.top = `${positions[direction].y}px`;
                btn.style.transform = `translate(-50%, -50%)`;
            }
        });
    }

    function updateContextMenuPosition(node) {
        if (!node) return;
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return;

        const nodeRect = nodeElement.getBoundingClientRect();
        const yOffset = 15; // Distância (em pixels) acima do nó

        // Posição alvo: acima do canto direito do nó
        const menuX = nodeRect.right + 35;
        const menuY = nodeRect.top - yOffset;

        contextMenuContainer.style.left = `${menuX}px`;
        contextMenuContainer.style.top = `${menuY}px`;
        contextMenuContainer.style.transform = `translate(-100%, -100%)`;
    }

    function showNodeControls(node) {
        if (node) {
            // Mostra os botões '+'
            updateAddControlsPosition(node);
            addControlsContainer.classList.add('visible');
            updateContextMenuPosition(node);
            contextMenuContainer.classList.add('visible');
        }
    }

    function hideNodeControls() {
        addControlsContainer.classList.remove('visible');
        contextMenuContainer.classList.remove('visible');
    }

    let hideTimeout;
    svg.addEventListener('mouseover', (e) => {
        if (state.selectedNodeId) return;
        const targetNodeGroup = e.target.closest('.node-group');
        if (targetNodeGroup) {
            clearTimeout(hideTimeout);
            targetNodeGroup.parentNode.appendChild(targetNodeGroup);
            state.hoveredNodeId = targetNodeGroup.id;
            showNodeControls(state.nodes[state.hoveredNodeId]);
        }
    });

    svg.addEventListener('mouseout', (e) => {
        if (state.selectedNodeId) return;
        const targetNodeGroup = e.target.closest('.node-group');

        if (targetNodeGroup && (!e.relatedTarget || (!e.relatedTarget.closest('#add-controls-container') && !e.relatedTarget.closest('#context-menu-container')))) {
            hideTimeout = setTimeout(() => {
                state.hoveredNodeId = null;
                hideNodeControls();
            }, 100);
        }
    });

    addControlsContainer.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    addControlsContainer.addEventListener('mouseleave', () => {
        if (state.selectedNodeId) return;
        hideTimeout = setTimeout(hideNodeControls, 100);
    });

    contextMenuContainer.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    contextMenuContainer.addEventListener('mouseleave', () => {
        if (state.selectedNodeId) return;
        hideTimeout = setTimeout(hideNodeControls, 100);
    });

    svg.addEventListener('click', (e) => {
        const clickedNodeGroup = e.target.closest('.node-group');

        // --- LÓGICA DO MODO DE LIGAÇÃO ---
        if (state.linkingFromNodeId && clickedNodeGroup) {
            const sourceNodeId = state.linkingFromNodeId;
            const targetNodeId = clickedNodeGroup.id;

            // Impede a ligação de um nó com ele mesmo
            if (sourceNodeId === targetNodeId) {
                // Cancela o modo de ligação
                state.linkingFromNodeId = null;
                svgContainer.classList.remove('linking-mode');
                return;
            }

            const newEdgeId = 'edge_' + Date.now();
            // Lógica para determinar os pontos de ancoragem
            const sourceNode = state.nodes[sourceNodeId];
            const targetNode = state.nodes[targetNodeId];
            let anchors = { source: 'right', target: 'left' };
            if (targetNode.x < sourceNode.x) { anchors = { source: 'left', target: 'right' }; }
            if (targetNode.y < sourceNode.y - 50) { anchors = { source: 'top', target: 'bottom' }; }
            if (targetNode.y > sourceNode.y + 50) { anchors = { source: 'bottom', target: 'top' }; }

            state.edges[newEdgeId] = { id: newEdgeId, source: sourceNodeId, target: targetNodeId, sourceAnchor: anchors.source, targetAnchor: anchors.target };

            // Sai do modo de ligação e renderiza a nova conexão
            state.linkingFromNodeId = null;
            svgContainer.classList.remove('linking-mode');
            render();
            return;
        } else if (state.linkingFromNodeId) {
            // Se estava no modo de ligação e clicou no fundo, cancela
            state.linkingFromNodeId = null;
            svgContainer.classList.remove('linking-mode');
            return;
        }

        const viewBtn = e.target.closest('.view-image-btn');
        if (viewBtn) {
            const nodeGroup = e.target.closest('.node-group');
            if (nodeGroup) {
                const nodeData = state.nodes[nodeGroup.id];
                if (nodeData && nodeData.imageData) {
                    const blob = dataURLtoBlob(nodeData.imageData);
                    const url = URL.createObjectURL(blob);
                    window.open(url);
                }
            }
            return;
        }

        if (state.selectedNodeId) {
            document.getElementById(state.selectedNodeId)?.classList.remove('selected');
        }
        if (clickedNodeGroup) {
            state.selectedNodeId = clickedNodeGroup.id;
            state.hoveredNodeId = clickedNodeGroup.id;
            clickedNodeGroup.classList.add('selected');
            showNodeControls(state.nodes[state.selectedNodeId]);
        } else {
            state.selectedNodeId = null;
            state.hoveredNodeId = null;
            hideNodeControls();
        }
    });

    svg.addEventListener('dblclick', (e) => {
        const nodeGroup = e.target.closest('.node-group');
        if (!nodeGroup) return;

        const nodeId = nodeGroup.id;
        const nodeData = state.nodes[nodeId];

        if (nodeData && nodeData.type === 'image') {
            const blob = dataURLtoBlob(nodeData.imageData);
            const url = URL.createObjectURL(blob);
            window.open(url);
            return;
        }

        if (nodeData && nodeData.type === 'entity') {
            openEntityEditModal(nodeData);
            return;
        }

        hideNodeControls();

        const foreignObject = nodeGroup.querySelector('foreignObject');
        if (!foreignObject) {
            console.error("Elemento foreignObject não encontrado para o nó:", nodeId);
            return;
        }

        const label = foreignObject.querySelector('.node-label');
        const textarea = foreignObject.querySelector('.node-editor-textarea');
        const rect = nodeGroup.querySelector('.node-rect');

        textarea.value = nodeData.label;
        label.style.display = 'none';
        textarea.style.display = 'block';
        textarea.focus();
        textarea.select();

        const onInput = () => {
            const lines = textarea.value.split('\n');
            let longestLine = '';
            lines.forEach(line => { if (line.length > longestLine.length) longestLine = line; });
            textMeasurer.textContent = longestLine || ' ';
            const newWidth = textMeasurer.offsetWidth + 40;
            nodeData.width = newWidth;
            rect.setAttribute('width', newWidth);
            rect.setAttribute('x', -newWidth / 2);
            foreignObject.setAttribute('width', newWidth - 20);
            foreignObject.setAttribute('x', -(newWidth / 2) + 10);

            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
            const newHeight = textarea.scrollHeight + 20;
            nodeData.height = newHeight;
            rect.setAttribute('height', newHeight);
            rect.setAttribute('y', -newHeight / 2);
            foreignObject.setAttribute('height', newHeight);
            foreignObject.setAttribute('y', -newHeight / 2);
            updateConnectedEdges(nodeId);
        };
        onInput();
        textarea.addEventListener('input', onInput);

        const finishEditing = (save) => {
            textarea.removeEventListener('input', onInput);
            if (save) {
                nodeData.label = textarea.value;
            }
            label.innerHTML = nodeData.label.replace(/\n/g, '<br>');
            label.style.display = 'block';
            textarea.style.display = 'none';
            if(state.selectedNodeId === nodeId) {
                showNodeControls(nodeData);
            }
        };

        textarea.addEventListener('blur', () => finishEditing(true), { once: true });
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                finishEditing(true);
            }
            if (e.key === 'Escape') {
                finishEditing(false);
            }
        });
    });

    svg.addEventListener('mousedown', (e) => {
        const targetNodeGroup = e.target.closest('.node-group');
        if (targetNodeGroup) {
            e.preventDefault();
            hideNodeControls();
            state.dragging = true;
            state.draggedNodeId = targetNodeGroup.id;
            const mousePos = getSVGPoint(e.clientX, e.clientY);
            const nodePos = state.nodes[state.draggedNodeId];
            state.dragOffset.x = mousePos.x - nodePos.x;
            state.dragOffset.y = mousePos.y - nodePos.y;
        } else {
            state.panning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    svg.addEventListener('mousemove', (e) => {
        if (state.dragging && state.draggedNodeId) {
            e.preventDefault();
            const node = state.nodes[state.draggedNodeId];
            const mousePos = getSVGPoint(e.clientX, e.clientY);
            node.x = mousePos.x - state.dragOffset.x;
            node.y = mousePos.y - state.dragOffset.y;
            const nodeElement = document.getElementById(state.draggedNodeId);
            if (nodeElement) {
                nodeElement.setAttribute("transform", `translate(${node.x}, ${node.y})`);
                updateConnectedEdges(state.draggedNodeId);
                if (state.selectedNodeId === state.draggedNodeId) updateAddControlsPosition(node);
            }
        } else if (state.panning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.cameraPos.x += dx;
            state.cameraPos.y += dy;
            updateCameraTransform();
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            if (state.selectedNodeId) showNodeControls(state.nodes[state.selectedNodeId]);
        }
    });

    window.addEventListener('mouseup', (e) => {
        const wasDragging = state.dragging;
        state.dragging = false;
        state.draggedNodeId = null;
        state.panning = false;
        if (wasDragging && state.selectedNodeId) {
            showNodeControls(state.nodes[state.selectedNodeId]);
        }
    });

    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const zoomFactor = 1 - e.deltaY * zoomSpeed;

        const newZoom = state.zoom * zoomFactor;

        // Clampa o novo zoom entre os valores MIN e MAX
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

        // Se o zoom não mudou (porque atingiu um limite), interrompe a função
        if (clampedZoom === state.zoom) {
            return;
        }

        // Recalcula o zoom real após o clamp
        const actualZoomFactor = clampedZoom / state.zoom;

        const mousePos = getSVGPoint(e.clientX, e.clientY);
        state.cameraPos.x = mousePos.x + (state.cameraPos.x - mousePos.x) * actualZoomFactor;
        state.cameraPos.y = mousePos.y + (state.cameraPos.y - mousePos.y) * actualZoomFactor;
        state.zoom = clampedZoom;

        updateCameraTransform();

        const activeNode = state.nodes[state.selectedNodeId || state.hoveredNodeId];
        if (activeNode) {
            showNodeControls(activeNode);
        }
    });

    const addRootNodeBtn = document.getElementById('add-root-node-btn');
    const removeNodeBtn = document.getElementById('remove-node-btn');
    const saveFileBtn = document.getElementById('save-file-btn');
    const loadFileInput = document.getElementById('load-file-input');
    const addImageInput = document.getElementById('add-image-input');

    addRootNodeBtn.addEventListener('click', () => {
        const screenCenterX = svg.clientWidth / 2;
        const screenCenterY = svg.clientHeight / 2;
        const centerSVGPoint = getSVGPoint(screenCenterX, screenCenterY);
        const newNodeId = 'node_' + Date.now();
        state.nodes[newNodeId] = {
            id: newNodeId, x: centerSVGPoint.x, y: centerSVGPoint.y,
            width: 150, height: 50, label: "Novo Tópico"
        };
        render();
    });

    addControlsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.add-node-context-btn');
        if (target) {
            const direction = target.dataset.direction;
            const parentId = state.hoveredNodeId || state.selectedNodeId;
            const parentNode = state.nodes[parentId];
            if (!parentNode) return;
            const newNodeId = 'node_' + Date.now();
            const newEdgeId = 'edge_' + Date.now();
            let newNodePos = { x: parentNode.x, y: parentNode.y };
            const offsetWidth = (parentNode.width / 2) + 75 + 30;
            const offsetHeight = (parentNode.height / 2) + 25 + 30;
            let anchors = { source: 'right', target: 'left' };
            switch (direction) {
                case 'top': newNodePos.y -= offsetHeight; anchors = { source: 'top', target: 'bottom' }; break;
                case 'right': newNodePos.x += offsetWidth; anchors = { source: 'right', target: 'left' }; break;
                case 'bottom': newNodePos.y += offsetHeight; anchors = { source: 'bottom', target: 'top' }; break;
                case 'left': newNodePos.x -= offsetWidth; anchors = { source: 'left', target: 'right' }; break;
            }
            state.nodes[newNodeId] = { id: newNodeId, x: newNodePos.x, y: newNodePos.y, width: 150, height: 50, label: "Novo Nó" };
            state.edges[newEdgeId] = { id: newEdgeId, source: parentId, target: newNodeId, sourceAnchor: anchors.source, targetAnchor: anchors.target };
            if(state.selectedNodeId) document.getElementById(state.selectedNodeId)?.classList.remove('selected');
            state.selectedNodeId = newNodeId;
            render();
            showNodeControls(state.nodes[newNodeId]);
        }
    });

    function startLinkingMode() {
        const sourceNodeId = state.hoveredNodeId || state.selectedNodeId;
        if (!sourceNodeId) {
            alert('Por favor, selecione um nó de origem primeiro.');
            return;
        }
        state.linkingFromNodeId = sourceNodeId;
        svgContainer.classList.add('linking-mode');
        hideNodeControls();
    }
    linkNodeBtn.addEventListener('click', startLinkingMode);
    contextLinkBtn.addEventListener('click', startLinkingMode);

    function deleteSelectedNode() {
        const nodeIdToRemove = state.hoveredNodeId || state.selectedNodeId;
        if (!nodeIdToRemove || nodeIdToRemove === "root") {
            alert('O Tópico Principal não pode ser removido.');
            return;
        }
        delete state.nodes[nodeIdToRemove];
        for (const edgeId in state.edges) {
            if (state.edges[edgeId].source === nodeIdToRemove || state.edges[edgeId].target === nodeIdToRemove) {
                delete state.edges[edgeId];
            }
        }
        if (state.selectedNodeId === nodeIdToRemove) state.selectedNodeId = null;
        state.hoveredNodeId = null;
        hideNodeControls();
        render();
    }
    removeNodeBtn.addEventListener('click', deleteSelectedNode);
    contextDeleteBtn.addEventListener('click', deleteSelectedNode);

    saveFileBtn.addEventListener('click', () => {
        saveOptionsModal.style.display = 'flex';
    });

    // --- Lógica de Salvamento ---

    saveOptionsModal.addEventListener('click', (e) => {
        if (e.target === saveOptionsModal) {
            saveOptionsModal.style.display = 'none';
        }
    });

    // Botão: Salvar como .json (sem criptografia)
    saveUnencryptedBtn.addEventListener('click', () => {
        const dataToSave = { nodes: state.nodes, edges: state.edges };
        const jsonString = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meu_mapa.json';
        a.click();
        URL.revokeObjectURL(url);
        saveOptionsModal.style.display = 'none';
    });

    // Botão: Salvar como .invmap
    saveEncryptedBtn.addEventListener('click', () => {
        saveOptionsModal.style.display = 'none';
        savePasswordModal.style.display = 'flex';
        document.getElementById('save-password-input').focus();
    });

    // Lógica do modal de senha para salvar
    cancelSaveBtn.addEventListener('click', () => {
        savePasswordModal.style.display = 'none';
        document.getElementById('save-password-input').value = '';
        document.getElementById('save-password-confirm').value = '';
    });

    confirmSaveBtn.addEventListener('click', () => {
        const password = document.getElementById('save-password-input').value;
        const confirmPassword = document.getElementById('save-password-confirm').value;

        if (!password || password !== confirmPassword) {
            alert('As senhas não coincidem ou estão em branco.');
            return;
        }

        const jsonString = JSON.stringify({ nodes: state.nodes, edges: state.edges });
        const encryptedData = CryptoJS.AES.encrypt(jsonString, password).toString();

        const blob = new Blob([encryptedData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meu_mapa.invmap';
        a.click();
        URL.revokeObjectURL(url);
        cancelSaveBtn.click();
    });

    let encryptedFileContent = null;
    loadFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            try {
                // Tenta analisar como JSON. Se funcionar, é um arquivo não criptografado.
                const data = JSON.parse(fileContent);
                if (data && data.nodes && data.edges) {
                    state = { ...state, nodes: data.nodes, edges: data.edges, selectedNodeId: null, hoveredNodeId: null, cameraPos: { x: 0, y: 0 }, zoom: 1 };
                    hideNodeControls();
                    updateCameraTransform();
                    render();
                } else { throw new Error(); } // Força o 'catch' se o JSON for inválido
            } catch (error) {
                // Se falhar ao analisar o JSON, assume que é um arquivo criptografado.
                encryptedFileContent = fileContent;
                loadPasswordModal.style.display = 'flex';
                document.getElementById('load-password-input').focus();
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Lógica do modal de senha para carregar
    cancelLoadBtn.addEventListener('click', () => {
        loadPasswordModal.style.display = 'none';
        document.getElementById('load-password-input').value = '';
        encryptedFileContent = null;
    });

    confirmLoadBtn.addEventListener('click', () => {
        const password = document.getElementById('load-password-input').value;
        if (!password || !encryptedFileContent) return;

        try {
            const bytes = CryptoJS.AES.decrypt(encryptedFileContent, password);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedData) throw new Error('Senha incorreta.');

            const data = JSON.parse(decryptedData);
            if (data && data.nodes && data.edges) {
                state = { ...state, nodes: data.nodes, edges: data.edges, selectedNodeId: null, hoveredNodeId: null, cameraPos: { x: 0, y: 0 }, zoom: 1 };
                hideNodeControls();
                updateCameraTransform();
                render();
            } else { throw new Error('Formato de arquivo inválido.'); }
        } catch (error) {
            console.error("Erro ao carregar o arquivo:", error);
            alert('Não foi possível abrir o mapa. Verifique a senha ou o formato do arquivo.');
        } finally {
            cancelLoadBtn.click();
        }
    });

    addImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageDataUrl = event.target.result;
            const img = new Image();
            img.onload = () => {
                const screenCenterX = svg.clientWidth / 2;
                const screenCenterY = svg.clientHeight / 2;
                const centerSVGPoint = getSVGPoint(screenCenterX, screenCenterY);
                const newNodeId = 'node_' + Date.now();
                const maxWidth = 250;
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const newWidth = img.width * scale;
                const newHeight = img.height * scale;
                state.nodes[newNodeId] = {
                    id: newNodeId, type: 'image',
                    x: centerSVGPoint.x, y: centerSVGPoint.y,
                    width: newWidth, height: newHeight,
                    label: file.name.substring(0, 40),
                    imageData: imageDataUrl
                };
                render();
            };
            img.src = imageDataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });

    // --- Lógica para Adicionar Nós de Entidade ---

    function createEntityNode(type) {
        const centerSVGPoint = getSVGPoint(svg.clientWidth / 2, svg.clientHeight / 2);
        const newNodeId = 'node_' + Date.now();
        const baseNode = { id: newNodeId, type: 'entity', x: centerSVGPoint.x, y: centerSVGPoint.y, photoData: null };

        if (type === 'person') {
            state.nodes[newNodeId] = { ...baseNode, entityType: 'person', width: 320, height: 150, name: '', age: '', details: '' };
        } else if (type === 'company') {
            state.nodes[newNodeId] = { ...baseNode, entityType: 'company', width: 280, height: 130, name: '', cnpj: '' };
        }
        render();
        entityModal.style.display = 'none';
    }

    addEntityNodeBtn.addEventListener('click', () => {
        entityModal.style.display = 'flex';
    });

    addPersonBtn.addEventListener('click', () => createEntityNode('person'));
    addCompanyBtn.addEventListener('click', () => createEntityNode('company'));

    entityModal.addEventListener('click', (e) => {
        if (e.target === entityModal) {
            entityModal.style.display = 'none';
        }
    });

    // --- Lógica para o Modal de Edição de Entidade ---
    function openEntityEditModal(nodeData) {
        state.editingNodeId = nodeData.id;
        state.tempPhotoData = nodeData.photoData;

        const personFields = entityEditModal.querySelector('.form-group-person');
        const companyFields = entityEditModal.querySelector('.form-group-company');

        if (nodeData.entityType === 'person') {
            personFields.style.display = 'block';
            companyFields.style.display = 'none';
            document.getElementById('entity-edit-name').value = nodeData.name || '';
            document.getElementById('entity-edit-age').value = nodeData.age || '';
            document.getElementById('entity-edit-details').value = nodeData.details || '';
        } else if (nodeData.entityType === 'company') {
            personFields.style.display = 'none';
            companyFields.style.display = 'block';
            document.getElementById('entity-edit-company-name').value = nodeData.name || '';
            document.getElementById('entity-edit-cnpj').value = nodeData.cnpj || '';
        }

        entityEditPhotoPreview.src = nodeData.photoData || '';
        entityEditModal.style.display = 'flex';
    }

    function closeEntityEditModal() {
        state.editingNodeId = null;
        state.tempPhotoData = null;
        entityEditModal.style.display = 'none';
    }

    saveEntityEditBtn.addEventListener('click', () => {
        if (!state.editingNodeId) return;
        const node = state.nodes[state.editingNodeId];

        if (node.entityType === 'person') {
            const newName = document.getElementById('entity-edit-name').value;
            const newAge = document.getElementById('entity-edit-age').value;
            const newDetails = document.getElementById('entity-edit-details').value;

            detailsMeasurer.innerText = newDetails || ' ';
            const detailsHeight = detailsMeasurer.scrollHeight;

            const baseHeight = 100;

            node.name = newName;
            node.age = newAge;
            node.details = newDetails;
            node.height = baseHeight + detailsHeight;

        } else if (node.entityType === 'company') {
            node.name = document.getElementById('entity-edit-company-name').value;
            node.cnpj = document.getElementById('entity-edit-cnpj').value;
            // Empresas podem ter uma altura fixa por enquanto
            node.height = 130;
        }

        node.photoData = state.tempPhotoData;

        closeEntityEditModal();
        render();
    });

    cancelEntityEditBtn.addEventListener('click', closeEntityEditModal);
    
    let mouseDownOnOverlay = false;
    entityEditModal.addEventListener('mousedown', (e) => {
        if (e.target === entityEditModal) {
            mouseDownOnOverlay = true;
        }
    });
    entityEditModal.addEventListener('mouseup', (e) => {
        if (e.target === entityEditModal && mouseDownOnOverlay) {
            closeEntityEditModal();
        }
        mouseDownOnOverlay = false;
    });
    
    entityEditPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageDataUrl = event.target.result;
            entityEditPhotoPreview.src = imageDataUrl;
            state.tempPhotoData = imageDataUrl;
        };
        reader.readAsDataURL(file);
    });

    // --- Lógica para Hotkeys ---
    window.addEventListener('keydown', (e) => {
        // Ignora atalhos se o usuário estiver digitando em um campo de texto ou modal
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || entityModal.style.display === 'flex' || entityEditModal.style.display === 'flex') {
            return;
        }

        // --- Atalhos de Criação ---
        if (!e.ctrlKey && !e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'a': // Adicionar novo nó de texto
                    e.preventDefault();
                    addRootNodeBtn.click();
                    break;
                case 'i': // Adicionar Imagem
                    e.preventDefault();
                    document.getElementById('add-image-input').click();
                    break;
                case 'e': // Adicionar Entidade
                    e.preventDefault();
                    addEntityNodeBtn.click();
                    break;
                case 'l': // Ligar Nós
                    e.preventDefault();
                    startLinkingMode();
                    break;
            }
        }

        // --- Atalhos de Edição e Navegação ---
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                deleteSelectedNode();
                break;
            case 'Tab':
                e.preventDefault();
                // Cria um nó filho à direita do nó selecionado
                const parentId = state.selectedNodeId || state.hoveredNodeId;
                if (parentId) {
                    // Pega a referência do botão '+' da direita e simula um clique
                    const rightButton = addControlsContainer.querySelector('[data-direction="right"]');
                    if (rightButton) {
                        rightButton.click();
                    }
                }
                break;
            case 'F2':
                e.preventDefault();
                const nodeToEdit = state.nodes[state.selectedNodeId];
                if (nodeToEdit && !nodeToEdit.type) { // Garante que é um nó de texto
                    const nodeElement = document.getElementById(state.selectedNodeId);
                    nodeElement.dispatchEvent(new Event('dblclick', { bubbles: true }));
                }
                break;
            case 'Escape':
                if (state.linkingFromNodeId) {
                    state.linkingFromNodeId = null;
                    svgContainer.classList.remove('linking-mode');
                } else if (state.selectedNodeId) {
                    document.getElementById(state.selectedNodeId)?.classList.remove('selected');
                    state.selectedNodeId = null;
                    state.hoveredNodeId = null;
                    hideNodeControls();
                }
                break;
        }

        // --- Atalhos com Ctrl/Cmd ---
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's': // Salvar
                    e.preventDefault();
                    saveFileBtn.click();
                    break;
                case 'o': // Carregar
                    e.preventDefault();
                    loadFileInput.click();
                    break;
            }
        }
    });

    // --- Renderização Inicial ---
    render();
    if (state.selectedNodeId) {
        document.getElementById(state.selectedNodeId)?.classList.add('selected');
        showNodeControls(state.nodes[state.selectedNodeId]);
    }
});