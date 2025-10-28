document.addEventListener('DOMContentLoaded', () => {
    // DEBUG
    let debugMode = false;

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

    // --- Detecção de Toque ---
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let lastTouchPos = { x: 0, y: 0 };
    let initialPinchDistance = null;
    let initialPinchCenter = null;
    let touchStartTime = 0;
    let lastTapTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    const DOUBLE_TAP_DELAY = 300;
    const MAX_TAP_MOVEMENT = 10;
    let dragStartTimeout = null;
    const DRAG_START_DELAY = 100;

    // --- Seletores do Modal e Botões ---
    const exportMapBtn = document.getElementById('export-map-btn');
    const exportModal = document.getElementById('export-modal');
    const cancelExportBtn = document.getElementById('cancel-export-btn');
    const confirmExportBtn = document.getElementById('confirm-export-btn');
    const exportFormatSelect = document.getElementById('export-format');
    const exportFilenameInput = document.getElementById('export-filename');
    const pdfOptionsDiv = document.getElementById('pdf-options');
    const pngOptionsDiv = document.getElementById('png-options');
    const svgOptionsDiv = document.getElementById('svg-options');
    const addLogoCheckbox = document.getElementById('export-add-logo');
    const logoOptionsDiv = document.getElementById('logo-options');
    const logoTypeSelect = document.getElementById('export-logo-type');
    const logoUploadInput = document.getElementById('export-logo-upload');
    const logoUploadLabel = document.querySelector('label[for="export-logo-upload"]');
    const addTitleCheckbox = document.getElementById('export-add-title');
    const titleOptionsDiv = document.getElementById('title-options');
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
        linkingFromNodeId: null,
        isModified: false
    };

    // --- Funções Auxiliares de Coordenadas ---
    function getSVGPoint(screenX, screenY) {
        let point = svg.createSVGPoint();
        point.x = screenX;
        point.y = screenY;
        return point.matrixTransform(camera.getScreenCTM().inverse());
    }

    function getMapBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasElements = false;

        for (const nodeId in state.nodes) {
            const node = state.nodes[nodeId];
            const halfWidth = node.width / 2;
            const halfHeight = node.height / 2;
            minX = Math.min(minX, node.x - halfWidth);
            minY = Math.min(minY, node.y - halfHeight);
            maxX = Math.max(maxX, node.x + halfWidth);
            maxY = Math.max(maxY, node.y + halfHeight);
            hasElements = true;
        }

        const padding = 20;
        if (hasElements) {
            return {
                x: minX - padding,
                y: minY - padding,
                width: (maxX - minX) + (padding * 2),
                height: (maxY - minY) + (padding * 2)
            };
        } else {
            return { x: 0, y: 0, width: 100, height: 100 };
        }
    }

    // --- Funções Auxiliares para Pinch-Zoom ---
    function getPinchDistance(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy); // Teorema de Pitágoras :(
    }

    function getPinchCenter(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    function setModifiedStatus(status) {
        if(status){if(!state.isModified){state.isModified=true;}}else{if(state.isModified){state.isModified=false;}}
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

    function startTextNodeEditing(nodeGroup, nodeId, nodeData) {
        hideNodeControls();

        const foreignObject = nodeGroup.querySelector('foreignObject');
        if (!foreignObject) {
            console.error("Elemento foreignObject não encontrado para o nó:", nodeId);
            return;
        }

        const label = foreignObject.querySelector('.node-label');
        const textarea = foreignObject.querySelector('.node-editor-textarea');
        const rect = nodeGroup.querySelector('.node-rect');

        if (!label || !textarea || !rect) {
            console.error("Elementos internos do nó não encontrados:", nodeId);
            return;
        }

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
            const newWidth = Math.max(100, textMeasurer.offsetWidth + 40);
            nodeData.width = newWidth;
            rect.setAttribute('width', newWidth);
            rect.setAttribute('x', -newWidth / 2);
            foreignObject.setAttribute('width', newWidth - 20);
            foreignObject.setAttribute('x', -(newWidth / 2) + 10);

            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
            const newHeight = Math.max(50, textarea.scrollHeight + 20);
            nodeData.height = newHeight;
            rect.setAttribute('height', newHeight);
            rect.setAttribute('y', -newHeight / 2);
            foreignObject.setAttribute('height', newHeight);
            foreignObject.setAttribute('y', -(newHeight / 2) + 10);
            updateConnectedEdges(nodeId);
        };
        onInput();
        textarea.addEventListener('input', onInput);

        const finishEditing = (save) => {
            textarea.removeEventListener('input', onInput);
            if (save) {
                nodeData.label = textarea.value;
            }
            if (label) {
                label.innerHTML = nodeData.label.replace(/\n/g, '<br>');
                label.style.display = 'block';
            }
            textarea.style.display = 'none';

            render();

            if(state.selectedNodeId === nodeId) {
                showNodeControls(nodeData);
            }
        };

        textarea.addEventListener('blur', () => finishEditing(true), { once: true });
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                finishEditing(true);
                textarea.blur();
            }
            if (e.key === 'Escape') {
                finishEditing(false);
                textarea.blur();
            }
        });
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
            setModifiedStatus(true);
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

        if (nodeData && nodeData.type === 'entity') {
            openEntityEditModal(nodeData);
            setModifiedStatus(true);
            return;
        }
        if (nodeData && nodeData.type === 'image') {
            const blob = dataURLtoBlob(nodeData.imageData);
            const url = URL.createObjectURL(blob);
            window.open(url);
            return;
        }

        if (nodeData && !nodeData.type) {
            startTextNodeEditing(nodeGroup, nodeId, nodeData);
            setModifiedStatus(true);
        }
    });

    function handleMouseDown(e) {
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
            setModifiedStatus(true);
        } else {
            state.panning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
        }
    };

    function handleMouseMove(e) {
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
            setModifiedStatus(true);
        } else if (state.panning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.cameraPos.x += dx;
            state.cameraPos.y += dy;
            updateCameraTransform();
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            if (state.selectedNodeId) showNodeControls(state.nodes[state.selectedNodeId]);
        }
    };

    function handleMouseUp(e) {
        const wasDragging = state.dragging;
        state.dragging = false;
        state.draggedNodeId = null;
        state.panning = false;
        if (wasDragging && state.selectedNodeId) {
            showNodeControls(state.nodes[state.selectedNodeId]);
        }
    };

    function handleMouseWheel(e) {
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
    };
    
    // --- Funções Handler para Eventos de Toque ---

    function handleTouchStart(e) {
        e.preventDefault();
        clearTimeout(dragStartTimeout);
        if (e.touches.length === 2) {
            state.panning = false; // Garante que não está fazendo pan/drag
            state.dragging = false;
            initialPinchDistance = getPinchDistance(e.touches);
            initialPinchCenter = getPinchCenter(e.touches); // Guarda o centro em coordenadas da tela
            hideNodeControls();
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];

            touchStartTime = Date.now();
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            const targetNodeGroup = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.node-group');

            // Verifica se tocou em nó ou no fundo
            if (targetNodeGroup) {
                state.draggedNodeId = targetNodeGroup.id;
                const touchPosSVG = getSVGPoint(touch.clientX, touch.clientY);
                const nodePos = state.nodes[state.draggedNodeId];
                state.dragOffset.x = touchPosSVG.x - nodePos.x;
                state.dragOffset.y = touchPosSVG.y - nodePos.y;

                if (state.selectedNodeId !== targetNodeGroup.id) {
                    if (state.selectedNodeId) {
                        document.getElementById(state.selectedNodeId)?.classList.remove('selected');
                    }
                    state.selectedNodeId = targetNodeGroup.id;
                    targetNodeGroup.classList.add('selected');
                }
                state.hoveredNodeId = targetNodeGroup.id;

                dragStartTimeout = setTimeout(() => {
                    if (state.draggedNodeId) {
                        state.dragging = true;
                        hideNodeControls();
                    }
                }, DRAG_START_DELAY);
                setModifiedStatus(true);
            } else {
                // Inicia o Pan
                state.panning = true;
                lastTouchPos = { x: touch.clientX, y: touch.clientY };
                hideNodeControls();
            }
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();

        if (e.touches.length === 2 && initialPinchDistance !== null && initialPinchCenter !== null) {
            // --- LÓGICA DO PINCH-ZOOM ---
            const currentPinchDistance = getPinchDistance(e.touches);
            const currentPinchCenter = getPinchCenter(e.touches);

            const zoomFactor = currentPinchDistance / initialPinchDistance;
            const newZoom = state.zoom * zoomFactor;
            const clampedZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

            if (clampedZoom === state.zoom && zoomFactor !== 1) {
                initialPinchDistance = currentPinchDistance;
                initialPinchCenter = currentPinchCenter;
                return;
            }

            const actualZoomFactor = clampedZoom / state.zoom;
            const initialCenterSVG = getSVGPoint(initialPinchCenter.x, initialPinchCenter.y);
            state.cameraPos.x = initialCenterSVG.x + (state.cameraPos.x - initialCenterSVG.x) * actualZoomFactor;
            state.cameraPos.y = initialCenterSVG.y + (state.cameraPos.y - initialCenterSVG.y) * actualZoomFactor;
            state.zoom = clampedZoom;

            updateCameraTransform();

            initialPinchDistance = currentPinchDistance;
            initialPinchCenter = currentPinchCenter;

            const activeNode = state.nodes[state.selectedNodeId || state.hoveredNodeId];
            if (activeNode) showNodeControls(activeNode);

        } else if (e.touches.length === 1) { // Só executa lógica de drag/pan se for um único toque
            const touch = e.touches[0];

            const dx = touch.clientX - touchStartPos.x;
            const dy = touch.clientY - touchStartPos.y;
            const movementDistance = Math.sqrt(dx * dx + dy * dy);

            // Se o dedo se moveu antes do timeout de drag e estava sobre um nó,
            // cancela o timeout e inicia o drag imediatamente.
            // MAX_TAP_MOVEMENT / 2 base para detectar movimento intencional.
            if (dragStartTimeout && movementDistance > MAX_TAP_MOVEMENT / 2) {
                clearTimeout(dragStartTimeout);
                dragStartTimeout = null;
                if (state.draggedNodeId) {
                    state.dragging = true;
                    hideNodeControls();
                }
            }

            // Agora, executa a lógica de drag ou pan SOMENTE se o estado correspondente estiver ativo
            if (state.dragging && state.draggedNodeId) {
                // Lógica de Drag
                const touchPosSVG = getSVGPoint(touch.clientX, touch.clientY);
                const node = state.nodes[state.draggedNodeId];
                node.x = touchPosSVG.x - state.dragOffset.x;
                node.y = touchPosSVG.y - state.dragOffset.y;
                const nodeElement = document.getElementById(state.draggedNodeId);
                if (nodeElement) {
                    nodeElement.setAttribute("transform", `translate(${node.x}, ${node.y})`);
                    updateConnectedEdges(state.draggedNodeId);
                    showNodeControls(node);
                }
                setModifiedStatus(true);
            } else if (state.panning) {
                // Lógica de Pan
                const panDx = touch.clientX - lastTouchPos.x;
                const panDy = touch.clientY - lastTouchPos.y;
                state.cameraPos.x += panDx;
                state.cameraPos.y += panDy;
                updateCameraTransform();
                lastTouchPos = { x: touch.clientX, y: touch.clientY };
                const activeNode = state.nodes[state.selectedNodeId || state.hoveredNodeId];
                if (activeNode) showNodeControls(activeNode);
            }
        }
    }

    function handleTouchEnd(e) {
        clearTimeout(dragStartTimeout);
        dragStartTimeout = null;

        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const touch = e.changedTouches[0];
        const currentTime = Date.now();
        const touchDuration = currentTime - touchStartTime;

        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const movementDistance = Math.sqrt(dx * dx + dy * dy);

        // Verifica se foi um Tap válido: curta duração, pouco movimento, não era pinch
        const isTap = touchDuration < DOUBLE_TAP_DELAY && movementDistance < MAX_TAP_MOVEMENT && initialPinchDistance === null;

        // Guarda os estados ANTES de resetar para saber o que aconteceu
        const wasDragging = state.dragging;
        const wasPanning = state.panning;
        const wasPinching = initialPinchDistance !== null;

        // --- Reseta todos os estados de interação ---
        state.dragging = false;
        state.draggedNodeId = null;
        state.panning = false;
        initialPinchDistance = null;
        initialPinchCenter = null;
        lastTouchPos = { x: 0, y: 0 };

        // --- LÓGICA DE TAP E DOUBLE-TAP ---
        if (isTap) {
            const targetNodeGroup = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.node-group');
            const timeSinceLastTap = currentTime - lastTapTime;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && targetNodeGroup) {
                // --- É DOUBLE-TAP ---
                //console.log("Double Tap detected on node:", targetNodeGroup.id); // Debug
                const nodeId = targetNodeGroup.id;
                const nodeData = state.nodes[nodeId];

                if (nodeData && nodeData.type === 'entity') {
                    openEntityEditModal(nodeData);
                } else if (nodeData && nodeData.type === 'image') {
                    const blob = dataURLtoBlob(nodeData.imageData);
                    const url = URL.createObjectURL(blob);
                    window.open(url);
                } else if (nodeData && !nodeData.type) {
                    startTextNodeEditing(targetNodeGroup, nodeId, nodeData);
                }
                lastTapTime = 0; // Reseta para evitar triple-tap
            } else {
                // --- É SINGLE-TAP ---
                //console.log("Single Tap detected"); // Debug
                if (targetNodeGroup) {
                    state.selectedNodeId = targetNodeGroup.id;
                    state.hoveredNodeId = targetNodeGroup.id;
                    targetNodeGroup.classList.add('selected');
                    showNodeControls(state.nodes[state.selectedNodeId]);
                } else {
                    // Tocou no fundo, desmarca
                    if (state.selectedNodeId) {
                        document.getElementById(state.selectedNodeId)?.classList.remove('selected');
                        state.selectedNodeId = null;
                    }
                    state.hoveredNodeId = null;
                    hideNodeControls();
                }
                lastTapTime = currentTime;
            }
        } else { // Não foi um tap válido (foi drag, pan, pinch ou toque longo)
             if ((wasDragging || wasPanning || wasPinching) && state.selectedNodeId) {
                 showNodeControls(state.nodes[state.selectedNodeId]);
             } else if (state.selectedNodeId && !wasDragging && !wasPanning && !wasPinching) {
                 // Se foi um toque longo sem mover (que não é tap),
                 // e tinha um nó selecionado (pelo touchstart), mostra os controles dele.
                  showNodeControls(state.nodes[state.selectedNodeId]);
             } else if (!state.selectedNodeId){
                 // Se terminou uma interação e nada está selecionado, garante que controles estão escondidos
                 hideNodeControls();
             }
             lastTapTime = 0; // Reseta se não foi tap
        }

        touchStartPos = { x: 0, y: 0 };

        // Se ainda houver outros dedos, reseta o estado de pinch
        if (e.touches.length > 0) {
             initialPinchDistance = null;
             initialPinchCenter = null;
        }
    }

    function handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const currentTime = Date.now();
        const touchDuration = currentTime - touchStartTime;

        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const movementDistance = Math.sqrt(dx * dx + dy * dy);

        // Verifica se foi um Tap válido (curta duração, pouco movimento, não estava fazendo pinch)
        const isTap = touchDuration < DOUBLE_TAP_DELAY && movementDistance < MAX_TAP_MOVEMENT && initialPinchDistance === null && !state.dragging && !state.panning;

        // --- Reseta estados de interação ---
        const wasDragging = state.dragging;
        const wasPanning = state.panning;
        const wasPinching = initialPinchDistance !== null;

        state.dragging = false;
        state.draggedNodeId = null;
        state.panning = false;
        initialPinchDistance = null;
        initialPinchCenter = null;
        lastTouchPos = { x: 0, y: 0 };

        // --- LÓGICA DE TAP E DOUBLE-TAP ---
        if (isTap) {
            const targetNodeGroup = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.node-group');
            const timeSinceLastTap = currentTime - lastTapTime;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && targetNodeGroup) {
                // --- É DOUBLE-TAP ---
                const nodeId = targetNodeGroup.id;
                const nodeData = state.nodes[nodeId];

                if (nodeData && nodeData.type === 'entity') {
                    openEntityEditModal(nodeData);
                } else if (nodeData && nodeData.type === 'image') {
                    const blob = dataURLtoBlob(nodeData.imageData);
                    const url = URL.createObjectURL(blob);
                    window.open(url);
                } else if (nodeData && !nodeData.type) {
                    startTextNodeEditing(targetNodeGroup, nodeId, nodeData);
                }
                lastTapTime = 0; // Reseta para evitar triple-tap
            } else {
                // --- É SINGLE-TAP ---
                if (targetNodeGroup) {
                    if (state.selectedNodeId !== targetNodeGroup.id) {
                        if (state.selectedNodeId) {
                            document.getElementById(state.selectedNodeId)?.classList.remove('selected');
                        }
                        state.selectedNodeId = targetNodeGroup.id;
                        targetNodeGroup.classList.add('selected');
                    }
                    state.hoveredNodeId = targetNodeGroup.id;
                    showNodeControls(state.nodes[state.selectedNodeId]);
                } else {
                    // Tocou no fundo, desmarca
                    if (state.selectedNodeId) {
                        document.getElementById(state.selectedNodeId)?.classList.remove('selected');
                        state.selectedNodeId = null;
                    }
                    state.hoveredNodeId = null;
                    hideNodeControls();
                }
                lastTapTime = currentTime;
            }
        } else {
            // Se não foi tap (foi drag, pan ou pinch), apenas mostra controles se necessário
            if (wasDragging || wasPanning || wasPinching) {
                const activeNode = state.nodes[state.selectedNodeId || state.hoveredNodeId];
                if (activeNode) showNodeControls(activeNode);
            }
            lastTapTime = 0;
        }

        touchStartPos = { x: 0, y: 0 };
    }

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
        setModifiedStatus(true);
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
            setModifiedStatus(true);
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
        setModifiedStatus(true);
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
        setModifiedStatus(false);
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
        setModifiedStatus(false);
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
        setModifiedStatus(false);
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
                setModifiedStatus(false);
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
        setModifiedStatus(true);
    });

    // --- Funções de Exportação ---

    async function generateCleanSvgString(options) {
        const svgElement = document.getElementById('mindmap-svg');
        if (!svgElement) { return null; }

        const bounds = getMapBounds();
        if (bounds.width <= 0 || bounds.height <= 0) {
            console.error("Bounds inválidos calculados:", bounds);
            return null;
        }

        const svgClone = svgElement.cloneNode(true);
        const svgNS = "http://www.w3.org/2000/svg";
        const gridBackground = svgClone.querySelector('#grid-background');
        if (gridBackground) gridBackground.remove();

        let nodeBgColor = '#363640';
        let nodeStrokeColor = '#AAAAAA';
        let textColor = '#F0F0F0';
        let edgeColor = '#666666';

        if (options.exportTheme === 'light') {
            nodeBgColor = '#E0E0E0';
            nodeStrokeColor = '#888888';
            textColor = '#333333';
            edgeColor = '#555555';
        } else if (options.exportTheme === 'dark') {
            nodeBgColor = '#363640';
            nodeStrokeColor = '#AAAAAA';
            textColor = '#F0F0F0';
            edgeColor = '#666666';
        }

        svgClone.querySelectorAll('.node-group').forEach(group => {
            const nodeId = group.getAttribute('id');
            const nodeData = state.nodes[nodeId];
            const rect = group.querySelector('.node-rect');
            const foreignObject = group.querySelector('foreignObject');

            if (rect) {
                rect.setAttribute('style', `fill: ${nodeBgColor}; stroke: ${nodeStrokeColor}; stroke-width: 1.5px; rx: 8px;`);
            }
            if (foreignObject && nodeData) {
                let labelText = "", fontSize = 14, textYOffset = 0, nodeHeight = nodeData.height || 50;
                if (!nodeData.type) { labelText = nodeData.label || ""; }
                else if (nodeData.type === 'entity') { labelText = `${nodeData.name || "[Entidade]"}${nodeData.age ? ` (${nodeData.age})` : ''}`; fontSize = 16; }
                else if (nodeData.type === 'image') { labelText = nodeData.label || "[Imagem]"; fontSize = 10; textYOffset = (nodeHeight / 2) - (fontSize / 2) - 5; }
                foreignObject.remove();
                const textElement = document.createElementNS(svgNS, "text");
                textElement.setAttribute('style', `fill: ${textColor}; font-family: sans-serif; font-size: ${fontSize}px; text-anchor: middle; dominant-baseline: middle;`);
                textElement.setAttribute('x', '0');
                textElement.setAttribute('y', textYOffset.toString());
                const lines = labelText.split('\n');
                const lineHeight = fontSize * 1.2;
                textElement.setAttribute('y', (textYOffset - ((lines.length - 1) * lineHeight) / 2).toString());
                lines.forEach((line, index) => {
                    const tspan = document.createElementNS(svgNS, "tspan");
                    tspan.setAttribute('x', '0');
                    tspan.setAttribute('dy', index === 0 ? '0' : `${lineHeight}px`);
                    tspan.textContent = line;
                    textElement.appendChild(tspan);
                });
                group.appendChild(textElement);
            }
        });

        svgClone.querySelectorAll('.edge-path').forEach(path => {
            path.setAttribute('style', `stroke: ${edgeColor}; stroke-width: 1.5px; fill: none; marker-end: url(#arrowhead);`);
        });
        svgClone.querySelectorAll('.arrowhead-path').forEach(path => {
            path.setAttribute('style', `fill: ${edgeColor};`);
        });

        svgClone.setAttribute("xmlns", svgNS);
        svgClone.style.backgroundColor = options.bgColor || '#FFFFFF';
        // Define width, height e viewBox baseados nos bounds calculados
        svgClone.setAttribute('width', bounds.width.toString());
        svgClone.setAttribute('height', bounds.height.toString());
        // O viewBox deve começar nas coordenadas mínimas e ter a largura/altura total
        svgClone.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
        svgClone.style.width = null;
        svgClone.style.height = null;

        const svgDoctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
        const svgData = svgDoctype + new XMLSerializer().serializeToString(svgClone);
        return svgData;
    }

    async function generatePngDataUrl(options) {
        const svgOptions = {
            bgColor: options.bgColor || '#FFFFFF',
            exportTheme: options.exportTheme
        };
        const svgString = await generateCleanSvgString(svgOptions);
        if (!svgString) {
            console.error("Falha ao gerar string SVG para PNG.");
            return null;
        }

        const img = new Image();
        const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);

        const loadImagePromise = new Promise((resolve, reject) => {
            img.onload = () => {
                console.log(`Imagem SVG carregada (PNG)! Dimensões: ${img.naturalWidth} x ${img.naturalHeight}`);
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    reject(new Error("Imagem SVG carregada com dimensões zero."));
                } else {
                    resolve(img);
                }
            };
            img.onerror = (e) => {
                console.error("img.onerror (PNG):", e);
                reject(new Error("Falha ao carregar Blob SVG na tag Image."));
            };
            img.src = url;
        });

        try {
            const loadedImage = await loadImagePromise;

            // Calcular Dimensões Finais do Canvas
            const bounds = getMapBounds();
            const scale = options.pngScale || 1;
            const canvasWidth = Math.max(1, Math.round(bounds.width * scale));
            const canvasHeight = Math.max(1, Math.round(bounds.height * scale));

            // Criar Canvas
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Não foi possível obter o contexto 2D.");

            ctx.fillStyle = options.bgColor || '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Desenhar a imagem SVG inteira no canvas
            ctx.drawImage(loadedImage, 0, 0, canvasWidth, canvasHeight);

            // Gerar Data URL
            const pngUrl = canvas.toDataURL('image/png');
            return pngUrl;

        } catch (error) {
            console.error("Erro durante generatePngDataUrl:", error);
            return null;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function exportAsPNG(filename, options) {
        const pngUrl = await generatePngDataUrl(options);
        if (pngUrl) {
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${filename}.png`;
            a.click();
        } else {
            alert("Ocorreu um erro ao gerar a imagem PNG.");
        }
    }

    function generateTextMap(startNodeId = "root", indent = "") {
        let textOutput = "";
        const visitedNodes = new Set(); // Para evitar loops infinitos (temporário)

        function traverse(nodeId, currentIndent) {
            if (!nodeId || visitedNodes.has(nodeId)) {
                return; // Sai se o nó não existe ou já foi visitado
            }
            visitedNodes.add(nodeId);

            const node = state.nodes[nodeId];
            if (!node) return; // Sai se os dados do nó não existem

            // Adiciona a linha para o nó atual
            let nodeLabel = node.label || node.name || `[Nó ${node.type || 'sem título'}]`;
            textOutput += `${currentIndent}- ${nodeLabel}\n`;

            // Encontra os filhos diretos deste nó
            const childrenIds = [];
            for (const edgeId in state.edges) {
                if (state.edges[edgeId].source === nodeId) {
                    childrenIds.push(state.edges[edgeId].target);
                }
            }

            // Recursivamente chama para cada filho
            childrenIds.forEach(childId => {
                traverse(childId, currentIndent + "  "); // Adiciona indentação
            });
        }

        traverse(startNodeId, indent);

        if (textOutput.split('\n').length <= 2 && Object.keys(state.nodes).length <= 1) {
            return "Mapa vazio ou contém apenas o nó raiz.";
        }

        return textOutput;
    }

    async function exportAsPDF(filename, options) {
        const pngOptions = { ...options, pngScale: 2 };
        const pngUrl = await generatePngDataUrl(pngOptions);

        if (!pngUrl) {
            alert("Erro ao gerar a imagem base para o PDF.");
            return;
        }

        let logoDataUrl = null;
        if (options.addLogo) {
            if (options.logoType === 'default') {
                try {
                    const response = await fetch('imagens/InvmapLogo.png');
                    if (!response.ok) throw new Error('Falha ao buscar logo padrão');
                    const blob = await response.blob();
                    logoDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    console.log("Logo padrão carregada.");
                } catch (error) {
                    console.error("Erro ao carregar logo padrão:", error);
                }
            } else if (options.logoType === 'upload' && options.logoFile) {
                try {
                    logoDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(options.logoFile);
                    });
                    console.log("Logo personalizada carregada.");
                } catch (error) {
                    console.error("Erro ao carregar logo personalizada:", error);
                }
            }
        }

        try {
            const bounds = getMapBounds(); // Obtém bounds em unidades SVG/pt
            const pdfWidthPt = Math.max(100, Math.round(bounds.width));
            const pdfHeightPt = Math.max(100, Math.round(bounds.height));
            const orientation = pdfWidthPt > pdfHeightPt ? 'l' : 'p';
            console.log(`Dimensões do PDF (pt): ${pdfWidthPt} x ${pdfHeightPt}`);

            const { jsPDF } = window.jspdf;
            const pdfDoc = new jsPDF({
                unit: 'pt',
                format: [pdfWidthPt, pdfHeightPt],
                orientation: orientation
            });
            pdfDoc.addImage(
                pngUrl,
                'PNG',
                0,          // Posição X no PDF
                0,          // Posição Y no PDF
                pdfWidthPt,
                pdfHeightPt
            );
            console.log("Imagem adicionada ao PDF.");

            const pageMargin = 20; // Margem em pt
            let currentX = pageMargin; // Posição X inicial

            if (logoDataUrl) {
                try {
                    const imgProps = pdfDoc.getImageProperties(logoDataUrl);
                    const logoHeight = 30; // Altura fixa da logo em pt
                    const logoWidth = (imgProps.width * logoHeight) / imgProps.height; // Calcula largura proporcional

                    pdfDoc.addImage(logoDataUrl, imgProps.fileType, currentX, pageMargin, logoWidth, logoHeight);
                    currentX += logoWidth + 10; // Avança a posição X
                    console.log("Logo adicionada ao PDF.");
                } catch (imgError) {
                    console.error("Erro ao adicionar logo ao PDF:", imgError);
                }
            }

            if (options.addTitle) {
                pdfDoc.setFontSize(12);
                pdfDoc.setTextColor(51, 51, 51); // Cor do titulo
                pdfDoc.text(options.customTitle || "Mapa Mental InvMap", currentX, pageMargin + 20); // Posiciona ao lado da logo
                console.log("Título adicionado ao PDF.");
            }

            const textMap = generateTextMap();

            if (textMap) {
                pdfDoc.addPage();
                pdfDoc.setFont('helvetica', 'sans-serif');
                pdfDoc.setFontSize(10);
                pdfDoc.setTextColor(51, 51, 51);
                const pageHeight = pdfDoc.internal.pageSize.getHeight();
                const pageMargin = 40;
                let currentY = pageMargin;

                const lines = pdfDoc.splitTextToSize(textMap, pdfDoc.internal.pageSize.getWidth() - (pageMargin * 2));

                lines.forEach((line, index) => {
                    if (currentY + 12 > pageHeight - pageMargin) {
                        pdfDoc.addPage();
                        currentY = pageMargin;
                    }
                    pdfDoc.text(line, pageMargin, currentY);
                    currentY += 12;
                });
            }
            pdfDoc.save(`${filename}.pdf`);

        } catch (error) {
            console.error("Erro ao gerar o PDF a partir da imagem:", error);
            alert("Ocorreu um erro ao gerar o arquivo PDF. Verifique o console.");
        }
    }

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

    // --- Lógica para Eventos de Toque ---
    if (isTouchDevice) {
        svg.addEventListener('touchstart', handleTouchStart, { passive: false });
        svg.addEventListener('touchmove', handleTouchMove, { passive: false });
        svg.addEventListener('touchend', handleTouchEnd);
        svg.addEventListener('touchcancel', handleTouchEnd);
    } else {
        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        svg.addEventListener('wheel', handleMouseWheel);
    }

    // --- Lógica do Modal de Exportação ---

    exportMapBtn.addEventListener('click', () => {
        exportFilenameInput.value = 'meu_mapa_' + new Date().toISOString().slice(0, 10);
        exportModal.style.display = 'flex';
        handleFormatChange();
    });

    cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });

    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.style.display = 'none';
        }
    });

    function handleFormatChange() {
        const selectedFormat = exportFormatSelect.value;
        pdfOptionsDiv.style.display = selectedFormat === 'pdf' ? 'block' : 'none';
        pngOptionsDiv.style.display = selectedFormat === 'png' ? 'block' : 'none';
        svgOptionsDiv.style.display = selectedFormat === 'svg' ? 'block' : 'none';
    }
    exportFormatSelect.addEventListener('change', handleFormatChange);

    addLogoCheckbox.addEventListener('change', (e) => {
        logoOptionsDiv.style.display = e.target.checked ? 'block' : 'none';
    });

    logoTypeSelect.addEventListener('change', (e) => {
        logoUploadLabel.style.display = e.target.value === 'upload' ? 'inline-block' : 'none';
    });

    addTitleCheckbox.addEventListener('change', (e) => {
        titleOptionsDiv.style.display = e.target.checked ? 'block' : 'none';
    });

    confirmExportBtn.addEventListener('click', () => {
        const filename = exportFilenameInput.value || 'mapa_exportado';
        const format = exportFormatSelect.value;
        const options = {
            addLogo: addLogoCheckbox.checked,
            logoType: logoTypeSelect.value,
            logoFile: logoUploadInput.files[0],
            addTitle: addTitleCheckbox.checked,
            customTitle: document.getElementById('export-custom-title').value,
            bgColor: document.getElementById('export-bg-color').value,
            pngScale: parseInt(document.getElementById('export-png-scale').value, 10),
            exportTheme: document.getElementById('export-theme').value
        };

        if (format === 'svg') {
            generateCleanSvgString({bgColor: 'transparent'}).then(svgData => {
                if (svgData) {
                    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            });
        } else if (format === 'pdf') {
            exportAsPDF(filename, options);
        } else if (format === 'png') {
            exportAsPNG(filename, options);
        }

        exportModal.style.display = 'none';
    });

    // --- Aviso Antes de Sair da Página ---
    window.addEventListener('beforeunload', (event) => {
        if (state.isModified && !debugMode) {
            event.preventDefault();
            event.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
            return 'Você tem alterações não salvas. Deseja realmente sair?';
        }
    });

    // --- Renderização Inicial ---
    render();
    if (state.selectedNodeId) {
        document.getElementById(state.selectedNodeId)?.classList.add('selected');
        showNodeControls(state.nodes[state.selectedNodeId]);
    }
});