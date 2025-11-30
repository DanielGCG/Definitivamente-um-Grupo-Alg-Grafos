// game2.js - Frontend game logic for "Descubra o Fofoqueiro" v2

// ============================================================================
// DADOS ESTÁTICOS PARA DESENVOLVIMENTO (Remover quando fetchs estiverem prontos)
// ============================================================================
// IMPORTANTE: Este mock simula a RESPOSTA DO BACKEND.
// No jogo real, TODOS estes dados são controlados pelo servidor:
// - score, vidas, fofoqueiro, mentiroso, depoimentos são gerados no BACKEND
// - O frontend NUNCA sabe quem é o fofoqueiro/mentiroso (evita exploits)
// - Toda ação (chutar, verificar, dica) é enviada ao backend para validação
// - O backend retorna apenas o resultado (acertou/errou, mentira/verdade)
const MOCK_GAME_DATA = {
    id_partida: 1,
    scoreAtual: 0,
    vidasRestantes: 3,
    usouDica: false,
    usouVerificacao: false,
    depoimentoVerificadoIndex: null,
    depoimentoVerificadoEhMentira: null,
    fofoqueiro: 0, // Ana é a fofoqueira (quem espalhou a fofoca)
    mentiroso: 3,  // Diana é a mentirosa (quem deu depoimento falso) - DEVE SER DIFERENTE DO FOFOQUEIRO
    nomes: [
        { id: 0, nome: "Ana" },
        { id: 1, nome: "Bruno" },
        { id: 2, nome: "Carlos" },
        { id: 3, nome: "Diana" },
        { id: 4, nome: "Eduardo" }
    ],
    depoimentos: [
        "Ana disse: Eduardo me contou a fofoca.", // MENTIRA - Ana é a fofoqueira
        "Bruno disse: Ana me contou a fofoca.",
        "Carlos disse: Bruno me contou a fofoca.",
        "Diana disse: Bruno me contou a fofoca.", // MENTIRA - Diana é a mentirosa
        "Eduardo disse: Carlos me contou a fofoca."
    ],
    depoimentosMentira: [true, false, false, true, false], // índice 0 (Ana) e 3 (Diana) são mentira
    grafo: null, // null = grafo oculto, será preenchido ao usar dica
    grafoCompleto: {
        edges: [
            { source: 0, target: 1 }, // Ana -> Bruno
            { source: 1, target: 2 }, // Bruno -> Carlos
            { source: 2, target: 4 }, // Carlos -> Eduardo
            { source: 0, target: 3 }, // Ana -> Diana
            { source: 4, target: 1 }  // Eduardo -> Bruno
        ]
    }
};

// ============================================================================
// ESTADO DO JOGO - Gerenciado por um objeto centralizado
// ============================================================================
// IMPORTANTE: Este estado é apenas um CACHE LOCAL dos dados recebidos do backend.
// O estado real do jogo (fofoqueiro, mentiroso, vidas, score) está NO SERVIDOR.
// Isso previne que jogadores modifiquem o JavaScript para trapacear.
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
    // ============================================================
    // [API] - DESCOMENTAR ESTE BLOCO QUANDO A API ESTIVER PRONTA
    // ============================================================
    /*
    const response = await fetch('/API/gameSection/join', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error('Erro ao criar/obter sessão');
    }

    return await response.json();
    */
    
    // ============================================================
    // [MOCK] - APAGAR ESTA LINHA QUANDO A API ESTIVER PRONTA
    // ============================================================
    return Promise.resolve(JSON.parse(JSON.stringify(MOCK_GAME_DATA)));
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
    
    // Seta para arestas reais (azul)
    createArrowMarker(defs, 'arrowhead-real', '#888');
    
    // Seta para arestas do usuário (verde)
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
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead-real)');
    }
}

function renderUserLinksContainer(g) {
    GraphState.svgElements.userLinkElements = g.append('g').attr('class', 'user-links');
}

function renderNodes(g, nodes) {
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

    GraphState.svgElements.nodeElements.append('circle')
        .attr('r', 20)
        .attr('fill', '#6fa8dc')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    GraphState.svgElements.nodeElements.append('text')
        .text(d => d.nome[0])
        .attr('x', 0)
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', '#fff')
        .attr('pointer-events', 'none');

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

    // Torna a indicação visual mais perceptível: muda preenchimento, borda, raio e cor do texto
    nodeElements.selectAll('circle')
        .attr('fill', d => GraphState.verticesMarcados.has(d.id) ? '#ffeb3b' : '#6fa8dc')
        .attr('stroke', d => GraphState.verticesMarcados.has(d.id) ? '#b58000' : '#fff')
        .attr('stroke-width', d => GraphState.verticesMarcados.has(d.id) ? 3 : 2)
        .attr('r', d => GraphState.verticesMarcados.has(d.id) ? 24 : 20);

    nodeElements.selectAll('text')
        .attr('fill', d => GraphState.verticesMarcados.has(d.id) ? '#111' : '#fff');
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
    const depoimentoIndex = partidaAtual.depoimentos.findIndex(dep => dep.includes(node.nome));
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
    return depoimentos.find(dep => dep.includes(nome)) || 'Sem depoimento';
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
// IMPORTANTE: Todas as ações são validadas NO BACKEND para evitar exploits:
// 1. Frontend envia a ação (ex: chutar ID 3)
// 2. Backend valida se o chute está correto (compara com fofoqueiro armazenado no servidor)
// 3. Backend atualiza vidas/score no banco de dados
// 4. Backend retorna apenas o resultado (acertou: true/false, novas vidas, novo score)
// 5. Frontend atualiza a UI com os dados recebidos
//
// O frontend NUNCA sabe antecipadamente quem é o fofoqueiro/mentiroso!
async function chutar(nodeId) {
    closePopup();

    try {
        // ============================================================
        // [API] - DESCOMENTAR ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        /*
        const result = await fetchAPI('/API/gameLogic/chute', { chuteId: parseInt(nodeId) });
        */
        
        // ============================================================
        // [MOCK] - APAGAR TODO ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        const partida = GameState.getPartida();
        const acertou = nodeId === partida.fofoqueiro;
        
        let result;
        if (acertou) {
            const pontos = partida.usouDica ? 1 : 2;
            result = {
                success: true,
                acertou: true,
                message: `🎉 Parabéns! Você acertou o fofoqueiro! +${pontos} pontos`,
                nextRound: false,
                scoreTotal: partida.scoreAtual + pontos
            };
            partida.scoreAtual += pontos;
        } else {
            partida.vidasRestantes--;
            if (partida.vidasRestantes <= 0) {
                result = {
                    success: true,
                    acertou: false,
                    gameOver: true,
                    message: '💀 Você perdeu todas as vidas.',
                    vidasRestantes: 0
                };
            } else {
                const nomeCerto = partida.nomes.find(n => n.id === partida.fofoqueiro)?.nome;
                result = {
                    success: true,
                    acertou: false,
                    gameOver: false,
                    message: `Errou! Você perdeu uma vida. (Dica: não era ${partida.nomes.find(n => n.id === nodeId)?.nome})`,
                    vidasRestantes: partida.vidasRestantes
                };
            }
        }
        // ============================================================
        // [MOCK] - FIM DO BLOCO MOCK
        // ============================================================

        if (result.acertou) {
            if (result.nextRound) {
                showNotification(result.message || 'Acertou! Iniciando próxima rodada...', 'success');
                // Atualizar estado conforme necessário
            } else {
                showNotification(result.message, 'success');
                updateHeader(partida);
                setTimeout(() => {
                    if (confirm('Você venceu! Deseja jogar novamente?')) {
                        location.reload();
                    }
                }, 2000);
            }
        } else if (result.gameOver) {
            showNotification(result.message, 'danger');
            updateHeader(partida);
            setTimeout(() => {
                if (confirm('Game Over! Deseja tentar novamente?')) {
                    location.reload();
                }
            }, 2000);
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
        // ============================================================
        // [API] - DESCOMENTAR ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        /*
        const result = await fetchAPI('/API/gameLogic/verificarDepoimento', { depoimentoIndex: index });
        */
        
        // ============================================================
        // [MOCK] - APAGAR TODO ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        // NOTA: Este código mock simula o que o BACKEND faria:
        // - Verifica se o depoimento é mentira (dados armazenados no servidor)
        // - Marca que a verificação foi usada (salva no banco de dados)
        // - Retorna apenas se é MENTIRA ou VERDADE
        // O frontend recebe apenas o resultado, não tem acesso à lista completa.
        const partida = GameState.getPartida();
        
        if (GameState.isVerificacaoUsada()) {
            showNotification('Você já usou a verificação nesta partida!', 'warning');
            return;
        }
        
        const ehMentira = partida.depoimentosMentira[index];
        const result = {
            success: true,
            ehMentira: ehMentira,
            message: ehMentira 
                ? '🔴 Este depoimento é MENTIRA!' 
                : '✅ Este depoimento é VERDADE!'
        };
        // ============================================================
        // [MOCK] - FIM DO BLOCO MOCK
        // ============================================================

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
    if (!confirm('Usar dica reduzirá sua pontuação de 2 para 1 ponto. Continuar?')) {
        return;
    }

    try {
        // ============================================================
        // [API] - DESCOMENTAR ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        /*
        const result = await fetchAPI('/API/gameLogic/dica', {});
        */
        
        // ============================================================
        // [MOCK] - APAGAR TODO ESTE BLOCO QUANDO A API ESTIVER PRONTA
        // ============================================================
        // NOTA: Este código mock simula o que o BACKEND faria:
        // - Verifica se a dica já foi usada (consulta no banco de dados)
        // - Marca que foi usada e reduz pontuação futura (salva no servidor)
        // - Retorna o grafo completo de fofocas
        // No backend real, o grafo já está gerado e armazenado.
        // - Verifica se a dica já foi usada (consulta no banco de dados)
        // - Marca que foi usada e reduz pontuação futura (salva no servidor)
        // - Retorna o grafo completo de fofocas
        // No backend real, o grafo já está gerado e armazenado.
        const partidaAtual = GameState.getPartida();
        
        if (partidaAtual.usouDica) {
            showNotification('Você já usou a dica nesta partida!', 'warning');
            return;
        }
        
        const result = {
            success: true,
            message: '💡 Dica ativada! Agora você pode ver o grafo de fofocas.',
            grafo: partidaAtual.grafoCompleto
        };
        // ============================================================
        // [MOCK] - FIM DO BLOCO MOCK
        // ============================================================

        if (result.success) {
            showNotification(result.message, 'info');
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
}

// ============================================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================================================
document.addEventListener('DOMContentLoaded', initGame);
