// game2.js - Frontend game logic for "Descubra o Fofoqueiro" v2

// ============================================================================
// ESTADO DO JOGO - Gerenciado por um objeto centralizado
// ============================================================================
const GameState = {
    partidaAtual: null,
    depoimentosVerificados: new Set(),
    verificacaoUsada: false,
    depoimentosResultado: new Map(), // index -> boolean (ehMentira)
    
    reset() {
        this.depoimentosVerificados.clear();
        this.verificacaoUsada = false;
        this.depoimentosResultado.clear();
    },
    
    setPartida(data) {
        this.partidaAtual = data;
    },
    
    getPartida() {
        return this.partidaAtual;
    },
    
    marcarDepoimentoVerificado(index) {
        this.depoimentosVerificados.add(index);
    },
    
    isDepoimentoVerificado(index) {
        return this.depoimentosVerificados.has(index);
    },

    setVerificacaoUsada(flag) {
        if (typeof flag === 'undefined') flag = true;
        this.verificacaoUsada = !!flag;
    },

    isVerificacaoUsada() {
        return !!this.verificacaoUsada;
    },

    marcarResultadoDepoimento(index, ehMentira) {
        this.depoimentosResultado.set(index, !!ehMentira);
    },

    getResultadoDepoimento(index) {
        return this.depoimentosResultado.has(index) ? this.depoimentosResultado.get(index) : null;
    }
};

// ============================================================================
// ESTADO DO GRAFO - Gerencia nós, arestas e marcações
// ============================================================================
const GraphState = {
    verticesMarcados: new Set(),
    arestasUsuario: new Set(),
    currentNodes: [],
    currentLinks: [],
    svgElements: {
        nodeElements: null,
        linkElements: null,
        userLinkElements: null
    },
    
    reset() {
        this.verticesMarcados.clear();
        this.arestasUsuario.clear();
        this.currentNodes = [];
        this.currentLinks = [];
    },
    
    setNodes(nodes) {
        this.currentNodes = nodes;
    },
    
    setLinks(links) {
        this.currentLinks = links;
    },
    
    toggleVerticeMarcar(id) {
        if (this.verticesMarcados.has(id)) {
            this.verticesMarcados.delete(id);
            this.removerArestasDoVertice(id);
            return false;
        } else {
            this.verticesMarcados.add(id);
            return true;
        }
    },
    
    removerArestasDoVertice(id) {
        Array.from(this.arestasUsuario).forEach(aresta => {
            const [source, target] = aresta.split('-').map(Number);
            if (source === id || target === id) {
                this.arestasUsuario.delete(aresta);
            }
        });
    },
    
    adicionarAresta(source, target) {
        const arestaKey = `${source}-${target}`;
        const arestaInversa = `${target}-${source}`;
        
        if (this.arestasUsuario.has(arestaKey)) {
            this.arestasUsuario.delete(arestaKey);
            return false;
        } else if (this.arestasUsuario.has(arestaInversa)) {
            this.arestasUsuario.delete(arestaInversa);
            return false;
        } else {
            this.arestasUsuario.add(arestaKey);
            return true;
        }
    },
    
    getArestasArray() {
        return Array.from(this.arestasUsuario).map(aresta => {
            const [source, target] = aresta.split('-').map(Number);
            return { source, target };
        });
    }
};

// ============================================================================
// INICIALIZAÇÃO E CARREGAMENTO
// ============================================================================
async function initGame() {
    try {
        const data = await fetchGameSession();
        
        GameState.reset();
        GameState.setPartida(data);
        // Recebe se já foi usada a verificação nesta partida e qual índice foi verificado (se houver)
        if (typeof data.usouVerificacao !== 'undefined') {
            GameState.setVerificacaoUsada(!!data.usouVerificacao);
        }
        if (typeof data.depoimentoVerificadoIndex !== 'undefined' && data.depoimentoVerificadoIndex !== null) {
            const idx = data.depoimentoVerificadoIndex;
            GameState.marcarDepoimentoVerificado(idx);
            // Armazenar resultado se vindo do servidor
            if (typeof data.depoimentoVerificadoEhMentira !== 'undefined' && data.depoimentoVerificadoEhMentira !== null) {
                GameState.marcarResultadoDepoimento(idx, !!data.depoimentoVerificadoEhMentira);
            }
            GameState.setVerificacaoUsada(true);
        }
        
        updateUI(data);
        configurarEventListeners();
        
        if (!data.usouDica) {
            document.getElementById('btnDica').disabled = false;
        }
    } catch (err) {
        console.error('Erro ao inicializar jogo:', err);
        showNotification('Erro ao conectar com o servidor.', 'danger');
    }
}

async function fetchGameSession() {
    const response = await fetch('/API/gameSection/join', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error('Erro ao criar/obter sessão');
    }

    return await response.json();
}

function updateUI(data) {
    updateHeader(data);
    renderDepoimentos(data.depoimentos || []);
    renderGraph(data);
}

function updateHeader(data) {
    document.getElementById('partidaId').textContent = data.id_partida || 'N/A';
    document.getElementById('scoreAtual').textContent = data.scoreAtual || '0';
    document.getElementById('vidasRestantes').textContent = data.vidasRestantes || '3';
}

// ============================================================================
// RENDERIZAÇÃO DE DEPOIMENTOS
// ============================================================================
function renderDepoimentos(depoimentos) {
    const container = document.getElementById('depoimentosList');
    
    if (!depoimentos || depoimentos.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum depoimento disponível.</p>';
        return;
    }

    container.innerHTML = '';
    depoimentos.forEach((dep, index) => {
        const card = createDepoimentoCard(dep, index, GameState.isDepoimentoVerificado(index));
        container.appendChild(card);

        // Anexar listener ao botão de verificação dentro do card, se existir e se a verificação ainda não foi usada
        const btn = card.querySelector(`#btnVerificarDepoimento-${index}`);
        if (btn && !GameState.isVerificacaoUsada()) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // evitar que abra popup
                verificarDepoimento(index);
            });
        }
    });
}

function createDepoimentoCard(depoimento, index, isVerificado) {
    const card = document.createElement('div');
    card.className = 'card mb-2';
    // Mostrar resultado, se houver
    const resultado = GameState.getResultadoDepoimento(index); // true = mentira, false = verdade, null = não verificado
    let badgeHtml = '';
    let textClass = '';
    if (resultado === true) {
        badgeHtml = '<span class="badge bg-danger ms-2">MENTIRA</span>';
        textClass = 'text-danger';
    } else if (resultado === false) {
        badgeHtml = '<span class="badge bg-success ms-2">VERDADE</span>';
        textClass = 'text-success';
    }

    // Se não verificado e a verificação ainda não foi usada, adicionar botão de verificação inline
    const shouldShowVerify = !isVerificado && !GameState.isVerificacaoUsada();
    const verificarButtonHtml = shouldShowVerify ? `
        <button id="btnVerificarDepoimento-${index}" class="btn btn-sm btn-outline-secondary float-end">
            <i class="bi bi-search"></i> Verificar
        </button>
    ` : '';

    card.innerHTML = `
        <div class="card-body py-2 d-flex align-items-start justify-content-between">
            <div class="flex-grow-1">
                <p class="mb-0 ${textClass}">
                    <i class="bi bi-chat-quote"></i> ${depoimento}
                    ${badgeHtml}
                </p>
            </div>
            <div class="ms-2">${verificarButtonHtml}</div>
        </div>
    `;
    
    return card;
}

// ============================================================================
// RENDERIZAÇÃO DO GRAFO
// ============================================================================
function renderGraph(data) {
    const svg = d3.select('#grafoSVG');
    svg.selectAll('*').remove();

    const dimensions = calculateGraphDimensions(svg);
    svg.attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    console.log('data.nomes recebido:', data.nomes);
    const nodes = prepareNodes(data.nomes || [], dimensions);
    const links = prepareLinks(data);
    
    GraphState.setNodes(nodes);
    GraphState.setLinks(links);

    setupSVGMarkers(svg);
    const g = svg.append('g');
    
    renderLinks(g, links);
    renderUserLinksContainer(g);
    renderNodes(g, nodes);
    
    updateGraphPositions();
}

function calculateGraphDimensions(svg) {
    const width = Math.max(svg.node().clientWidth || 600, 600);
    const height = 500;
    const padding = 60;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - padding;
    
    return { width, height, padding, centerX, centerY, radius };
}

function prepareNodes(nomes, dimensions) {
    return nomes.map(pessoa => ({
        id: pessoa.id,
        nome: pessoa.nome,
        foto: pessoa.foto,
        x: dimensions.centerX + Math.cos((2 * Math.PI * pessoa.id) / nomes.length) * dimensions.radius,
        y: dimensions.centerY + Math.sin((2 * Math.PI * pessoa.id) / nomes.length) * dimensions.radius
    }));
}

function prepareLinks(data) {
    if (data.grafo && data.grafo.edges) {
        return data.grafo.edges.map(edge => ({
            source: edge.source,
            target: edge.target
        }));
    }
    return [];
}

function setupSVGMarkers(svg) {
    const defs = svg.append('defs');
    
    // Seta apenas para arestas do usuário (verde) - grafo original é não-direcionado
    createArrowMarker(defs, 'arrowhead-user', '#4CAF50');
}

function createArrowMarker(defs, id, color) {
    defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', color);
}

function renderLinks(g, links) {
    if (links.length > 0) {
        GraphState.svgElements.linkElements = g.selectAll('line.link-real')
            .data(links)
            .join('line')
            .attr('class', 'link-real')
            .attr('stroke', '#888')
            .attr('stroke-width', 2);
            // Sem marker-end: grafo é não-direcionado
    }
}

function renderUserLinksContainer(g) {
    GraphState.svgElements.userLinkElements = g.append('g').attr('class', 'user-links');
}

function renderNodes(g, nodes) {
    const nodeRadius = 25;
    
    GraphState.svgElements.nodeElements = g.selectAll('g.node')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .on('click', handleNodeClick)
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    // Criar defs para padrões de imagem, se necessário
    let defs = d3.select('#grafoSVG').select('defs');
    if (defs.empty()) {
        defs = d3.select('#grafoSVG').append('defs');
    }

    // Renderizar cada nó com foto de perfil
    GraphState.svgElements.nodeElements.each(function(d) {
        const node = d3.select(this);
        
        // Criar padrão de imagem circular
        const patternId = `profile-${d.id}`;
        
        // Remover padrão existente se houver
        defs.select(`#${patternId}`).remove();
        
        const pattern = defs.append('pattern')
            .attr('id', patternId)
            .attr('width', 1)
            .attr('height', 1)
            .attr('patternContentUnits', 'objectBoundingBox');
        
        pattern.append('image')
            .attr('href', d.foto || '/img/usuario.png')
            .attr('width', 1)
            .attr('height', 1)
            .attr('preserveAspectRatio', 'xMidYMid slice');
        
        // Círculo com imagem de fundo
        node.append('circle')
            .attr('r', nodeRadius)
            .style('fill', `url(#${patternId})`)
            .style('stroke', '#a1a1a1ff')
            .style('stroke-width', 3);
        
        // Nome abaixo do nó (para todos os nós)
        node.append('text')
            .text(d.nome)
            .attr('x', 0)
            .attr('y', nodeRadius + 18)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', '#000')
            .attr('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white')
    });

    // Garantir que marcas visuais estejam corretas após renderizar nós
    updateNodeMarkers();
}

function handleNodeClick(event, node) {
    if (event.shiftKey) {
        handleShiftClick(node.id);
    } else {
        showPopup(node, event);
    }
}

// ============================================================================
// ATUALIZAÇÃO DE POSIÇÕES E INTERAÇÃO COM GRAFO
// ============================================================================
function updateGraphPositions() {
    updateRealLinks();
    updateUserLinks();
    updateNodePositions();
}

function updateRealLinks() {
    const nodeRadius = 20;
    const linkElements = GraphState.svgElements.linkElements;
    
    if (!linkElements) return;
    
    linkElements
        .attr('x1', d => calculateLinkStart(d, 'x', nodeRadius))
        .attr('y1', d => calculateLinkStart(d, 'y', nodeRadius))
        .attr('x2', d => calculateLinkEnd(d, 'x', nodeRadius))
        .attr('y2', d => calculateLinkEnd(d, 'y', nodeRadius));
}

function calculateLinkStart(link, axis, nodeRadius) {
    const source = GraphState.currentNodes.find(n => n.id === link.source);
    const target = GraphState.currentNodes.find(n => n.id === link.target);
    if (!source || !target) return 0;
    
    const { ux, uy } = getUnitVector(source, target);
    return axis === 'x' 
        ? source.x + ux * nodeRadius 
        : source.y + uy * nodeRadius;
}

function calculateLinkEnd(link, axis, nodeRadius) {
    const source = GraphState.currentNodes.find(n => n.id === link.source);
    const target = GraphState.currentNodes.find(n => n.id === link.target);
    if (!source || !target) return 0;
    
    const { ux, uy } = getUnitVector(source, target);
    const offset = nodeRadius + 6;
    return axis === 'x' 
        ? target.x - ux * offset 
        : target.y - uy * offset;
}

function getUnitVector(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { ux: dx / len, uy: dy / len };
}

function updateUserLinks() {
    const userLinkElements = GraphState.svgElements.userLinkElements;
    if (!userLinkElements) return;

    const nodeRadius = 20;
    const arestasArray = GraphState.getArestasArray();

    userLinkElements.selectAll('line.user-link')
        .data(arestasArray, d => `${d.source}-${d.target}`)
        .join('line')
        .attr('class', 'user-link')
        .attr('stroke', '#4CAF50')
        .attr('stroke-width', 3)
        .attr('marker-end', 'url(#arrowhead-user)')
        .attr('x1', d => calculateLinkStart(d, 'x', nodeRadius))
        .attr('y1', d => calculateLinkStart(d, 'y', nodeRadius))
        .attr('x2', d => calculateLinkEnd(d, 'x', nodeRadius))
        .attr('y2', d => calculateLinkEnd(d, 'y', nodeRadius));
}

function updateNodePositions() {
    const nodeElements = GraphState.svgElements.nodeElements;
    if (nodeElements) {
        nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
    }
}

// ============================================================================
// INTERAÇÃO: SHIFT+CLICK PARA CRIAR ARESTAS
// ============================================================================
function handleShiftClick(nodeId) {
    const marcado = GraphState.toggleVerticeMarcar(nodeId);
    
    if (!marcado) {
        // Vértice foi desmarcado
        GraphState.verticesMarcados.clear();
    } else if (GraphState.verticesMarcados.size === 2) {
        // Dois vértices marcados: criar aresta
        const [primeiro, segundo] = Array.from(GraphState.verticesMarcados);
        GraphState.adicionarAresta(primeiro, segundo);
        GraphState.verticesMarcados.clear();
    }
    
    updateNodeMarkers();
    updateUserLinks();
}

function updateNodeMarkers() {
    const nodeElements = GraphState.svgElements.nodeElements;
    if (!nodeElements) return;
    // Adiciona/removes classe ao grupo para permitir estilização via CSS
    nodeElements.classed('marked', d => GraphState.verticesMarcados.has(d.id));

    // Torna a indicação visual mais perceptível: muda borda e raio do círculo
    nodeElements.selectAll('circle')
        .style('stroke', d => GraphState.verticesMarcados.has(d.id) ? '#ff0000' : '#a1a1a1ff')
        .style('stroke-width', d => GraphState.verticesMarcados.has(d.id) ? '5px' : '3px');

    // Não alterar cor do texto - mantém sempre preto
}

// ============================================================================
// POPUP DE INFORMAÇÕES DO NÓ
// ============================================================================
function showPopup(node, event) {
    const popup = document.getElementById('popup');
    
    positionPopup(popup, event);
    fillPopupContent(popup, node);
    attachPopupEventListeners(node);
}

function positionPopup(popup, event) {
    popup.style.left = (event.pageX + 20) + 'px';
    popup.style.top = (event.pageY - 10) + 'px';
    popup.classList.remove('hidden');
}

function fillPopupContent(popup, node) {
    const partidaAtual = GameState.getPartida();
    const depoimentoTexto = findDepoimentoForNode(node.nome, partidaAtual.depoimentos);
    const depoimentoIndex = partidaAtual.depoimentos.findIndex(dep => dep.startsWith(node.nome + ':'));
    const jaVerificado = GameState.isDepoimentoVerificado(depoimentoIndex);

    popup.innerHTML = `
        <h3>
            <span>${node.nome}</span>
            <button class="close-btn" id="popupClose">×</button>
        </h3>
        <p><b>Depoimento:</b><br>${depoimentoTexto}</p>
        <div class="d-grid gap-2">
            <button id="btnChutar" class="btn btn-primary">
                <i class="bi bi-crosshair"></i> Chutar como Fofoqueiro
            </button>
            ${createVerificationButton(depoimentoIndex, jaVerificado)}
        </div>
    `;
}

function findDepoimentoForNode(nome, depoimentos) {
    return depoimentos.find(dep => dep.startsWith(nome + ':')) || 'Sem depoimento';
}

function createVerificationButton(index, isVerified) {
    // Se já foi usada a verificação nesta partida e este depoimento não é o verificado, não mostrar botão
    if (GameState.isVerificacaoUsada() && !isVerified) {
        return '';
    }

    if (index >= 0 && !isVerified) {
        return `
            <button id="btnVerificar" class="btn btn-outline-info btn-sm">
                <i class="bi bi-search"></i> Verificar Veracidade
            </button>
        `;
    } else if (isVerified) {
        // Se este depoimento foi verificado, mostrar texto indicando (o resultado será exibido na lista principal)
        return `<small class="text-muted">Depoimento já verificado</small>`;
    }
    return '';
}

function attachPopupEventListeners(node) {
    document.getElementById('popupClose').onclick = closePopup;
    document.getElementById('btnChutar').onclick = () => chutar(node.id);
    
    const btnVerificar = document.getElementById('btnVerificar');
    if (btnVerificar) {
        const partidaAtual = GameState.getPartida();
        const depoimentoIndex = partidaAtual.depoimentos.findIndex(dep => dep.includes(node.nome));
        btnVerificar.onclick = () => verificarDepoimento(depoimentoIndex);
    }
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}

// ============================================================================
// AÇÕES DO JOGO: CHUTAR, VERIFICAR, DICA
// ============================================================================
async function chutar(nodeId) {
    closePopup();

    try {
        const result = await fetchAPI('/API/gameLogic/chute', { chuteId: parseInt(nodeId) });

        if (result.acertou) {
            // Se o servidor iniciou uma nova rodada, atualizar o estado da UI em vez de redirecionar
            if (result.nextRound) {
                showNotification(result.message || 'Acertou! Iniciando próxima rodada...', 'success');

                // Atualizar estado da partida local com os dados retornados
                const partida = GameState.getPartida() || {};
                partida.nomes = result.nomes || partida.nomes;
                partida.depoimentos = result.depoimentos || partida.depoimentos;
                partida.vidasRestantes = typeof result.vidasRestantes !== 'undefined' ? result.vidasRestantes : partida.vidasRestantes;
                partida.scoreAtual = typeof result.scoreTotal !== 'undefined' ? result.scoreTotal : partida.scoreAtual;
                partida.grafo = result.usouDica ? { nodes: result.nomes, edges: result.grafo && result.grafo.edges ? result.grafo.edges : [] } : null;

                GameState.setPartida(partida);

                // Reset frontend verification state for the new round
                GameState.reset();
                GameState.setPartida(partida);
                
                // Limpar marcações de vértices e arestas do usuário
                GraphState.reset();

                // Re-render UI
                updateHeader(partida);
                renderDepoimentos(partida.depoimentos || []);
                renderGraph(partida);

                // Re-enable dica button
                const btnDica = document.getElementById('btnDica');
                if (btnDica) btnDica.disabled = false;

            } else {
                showNotification(result.message, 'success');
                setTimeout(() => window.location.href = '/', 2000);
            }
        } else if (result.gameOver) {
            showNotification(result.message, 'danger');
            setTimeout(() => window.location.href = '/', 2000);
        } else {
            showNotification(result.message, 'warning');
            document.getElementById('vidasRestantes').textContent = result.vidasRestantes;
        }
    } catch (err) {
        console.error('Erro ao verificar chute:', err);
        showNotification('Erro ao processar chute.', 'danger');
    }
}

async function verificarDepoimento(index) {
    closePopup();

    try {
        const result = await fetchAPI('/API/gameLogic/verificarDepoimento', { depoimentoIndex: index });

        if (result.success) {
            // Marcar que a verificação foi usada nesta partida (apenas uma por partida)
            GameState.setVerificacaoUsada(true);
            GameState.marcarDepoimentoVerificado(index);
            GameState.marcarResultadoDepoimento(index, result.ehMentira);

            // Re-renderizar lista e popup/controles
            renderDepoimentos(GameState.getPartida().depoimentos);
            const tipo = result.ehMentira ? 'danger' : 'success';
            showNotification(result.message, tipo);
        } else {
            showNotification(result.message, 'warning');
        }
    } catch (err) {
        console.error('Erro ao verificar depoimento:', err);
        showNotification('Erro ao verificar depoimento.', 'danger');
    }
}

async function solicitarDica() {
    // Mostrar modal de confirmação
    const modal = new bootstrap.Modal(document.getElementById('dicaModal'));
    modal.show();
}

async function confirmarUsoDica() {
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('dicaModal'));
    modal.hide();

    try {
        const result = await fetchAPI('/API/gameLogic/dica', {});

        if (result.success) {
            showNotification(result.message, 'info');
            const partidaAtual = GameState.getPartida();
            partidaAtual.grafo = result.grafo;
            partidaAtual.usouDica = true;
            renderGraph(partidaAtual);
            document.getElementById('btnDica').disabled = true;
        } else {
            showNotification(result.message, 'warning');
        }
    } catch (err) {
        console.error('Erro ao solicitar dica:', err);
        showNotification('Erro ao solicitar dica.', 'danger');
    }
}

async function abandonarPartida() {
    if (!confirm('Tem certeza que deseja abandonar esta partida? Todo o progresso será perdido.')) {
        return;
    }

    try {
        const response = await fetch('/API/gameSection/leave', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.ok) {
            showNotification('Partida abandonada com sucesso!', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            showNotification('Erro ao abandonar partida.', 'danger');
        }
    } catch (err) {
        console.error('Erro ao abandonar partida:', err);
        showNotification('Erro de conexão.', 'danger');
    }
}

// ============================================================================
// UTILITÁRIO: CHAMADAS DE API
// ============================================================================
async function fetchAPI(endpoint, body) {
    const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    result.success = response.ok;
    return result;
}

// ============================================================================
// DRAG & DROP DE NÓS
// ============================================================================
function dragStarted(event, node) {
    // Se Shift estiver pressionado não iniciar drag (isso é usado para criar arestas)
    if (event.sourceEvent && event.sourceEvent.shiftKey) return;
    d3.select(this).raise();
    node.fx = node.x;
    node.fy = node.y;
}

function dragged(event, node) {
    // Evitar mover nó enquanto Shift estiver pressionado
    if (event.sourceEvent && event.sourceEvent.shiftKey) return;
    node.fx = event.x;
    node.fy = event.y;
    node.x = event.x;
    node.y = event.y;
    updateGraphPositions();
}

function dragEnded(event, node) {
    // Evitar limpar fixações se o drag foi impedido pelo Shift
    if (event.sourceEvent && event.sourceEvent.shiftKey) return;
    node.fx = null;
    node.fy = null;
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
    }, 4000);
}

// ============================================================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================================================
function configurarEventListeners() {
    document.getElementById('btnDica').addEventListener('click', solicitarDica);
    document.getElementById('btnAbandonar').addEventListener('click', abandonarPartida);
    
    // Listener para confirmar uso da dica no modal
    const btnConfirmarDica = document.getElementById('confirmarDica');
    if (btnConfirmarDica) {
        btnConfirmarDica.addEventListener('click', confirmarUsoDica);
    }
}

// ============================================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================================================
document.addEventListener('DOMContentLoaded', initGame);