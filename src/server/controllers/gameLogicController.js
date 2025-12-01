const db = require('../db/database');
const graphController = require('./graphGenerationController');

// Armazena estado dos jogos em memória (id_partida -> estadoJogo)
const jogosAtivos = new Map();

// Lista de nomes aleatórios para os nós
const NOMES = [
    'Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
    'Igor', 'Julia', 'Kaique', 'Larissa', 'Marcelo', 'Natalia', 'Otavio', 'Paula',
    'Rafael', 'Sofia', 'Tiago', 'Valentina', 'Wagner', 'Yasmin', 'Zeca', 'Alice',
    'Bernardo', 'Camila', 'Daniel', 'Elisa', 'Fabio', 'Giovana', 'Heitor', 'Isabela'
];

/**
 * DFS para propagar fofoca a partir do fofoqueiro
 */
function propagarFofoca(grafo, fofoqueiro, mentiroso) {
    const visitados = new Set();
    const propagacao = [];
    const adjList = new Map();

    // Construir lista de adjacência
    grafo.nodes.forEach(node => adjList.set(node.id, []));
    grafo.edges.forEach(edge => {
        adjList.get(edge.source).push(edge.target);
        adjList.get(edge.target).push(edge.source);
    });

    function dfs(nodeId, nivel) {
        if (visitados.has(nodeId)) return;
        visitados.add(nodeId);

        const node = grafo.nodes.find(n => n.id === nodeId);
        const isMentiroso = nodeId === mentiroso;

        propagacao.push({
            id: nodeId,
            nome: node.nome,
            nivel,
            mentiroso: isMentiroso,
            popularidade: node.popularidade
        });

        // Se for mentiroso, não propaga (bloqueia a fofoca)
        if (isMentiroso) return;

        const vizinhos = adjList.get(nodeId) || [];
        vizinhos.forEach(vizinho => {
            if (!visitados.has(vizinho)) {
                dfs(vizinho, nivel + 1);
            }
        });
    }

    dfs(fofoqueiro, 0);
    return propagacao;
}

/**
 * Inicializa um novo jogo para uma partida
 */
exports.inicializarJogo = async (idPartida, idUsuario, numNodes = 10) => {
    // Lista de nomes embaralhados
    const [amigos] = await db.query('SELECT nome_usuario FROM usuario WHERE id_usuario IN (SELECT fk_Usuario_id_usuario_ FROM Amizade WHERE fk_Usuario_id_usuario = ?)', [idUsuario]);
    const nomesAmigos = amigos.map(a => a.nome_usuario);
    const nomesDisponiveis = [...NOMES].sort(() => Math.random() - 0.5);
    
    let nomes = nomesAmigos.concat(nomesDisponiveis);


    // Gerar grafo usando função centralizada
    const m0 = Math.min(3, Math.floor(numNodes / 3));
    const m = Math.max(1, Math.min(2, m0));
    const grafo = graphController.gerarGrafoBarabasiAlbert(numNodes, m0, m, nomes);

    // Escolher fofoqueiro aleatório
    const fofoqueiro = Math.floor(Math.random() * grafo.nodes.length);

    // Escolher mentiroso aleatório (diferente do fofoqueiro)
    let mentiroso;
    do {
        mentiroso = Math.floor(Math.random() * grafo.nodes.length);
    } while (mentiroso === fofoqueiro);

    // Propagar fofoca usando DFS
    const propagacao = propagarFofoca(grafo, fofoqueiro, mentiroso);

    // Gerar depoimentos: cada pessoa diz de quem recebeu a fofoca
    // Fofoqueiro deve mentir sobre a origem
    const depoimentos = [];
    propagacao.forEach((node, index) => {
        if (node.nivel === 0) {
            // Fofoqueiro mente dizendo que recebeu de alguém aleatório
            const outrosNodes = grafo.nodes.filter(n => n.id !== node.id);
            const mentira = outrosNodes[Math.floor(Math.random() * outrosNodes.length)];
            depoimentos.push({
                de: mentira.nome,
                para: node.nome,
                ehMentira: true
            });
        } else {
            // Encontrar quem passou a fofoca (nível anterior)
            const origem = propagacao.find(p => p.nivel === node.nivel - 1 && p.id !== node.id);
            if (origem) {
                depoimentos.push({
                    de: origem.nome,
                    para: node.nome,
                    ehMentira: false
                });
            }
        }
    });

    // Armazenar estado do jogo
    const estadoJogo = {
        idPartida,
        grafo,
        fofoqueiro,
        mentiroso,
        propagacao,
        depoimentos,
        vidasRestantes: 3,
        scoreAtual: 0,
        usouDica: false,
        depoimentosVerificados: new Set(),
        usouVerificacao: false, // marca se o jogador já usou a verificação nesta partida
        depoimentoVerificadoIndex: null // qual índice foi verificado (null se nenhum)
    };

    jogosAtivos.set(idPartida, estadoJogo);

    // Persistir estado inicial no banco
    await salvarEstadoJogo(idPartida);

    return{
        nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
        depoimentos: depoimentos.map(d => `${d.de} contou algo para ${d.para}`),
        vidasRestantes: 3
        ,usouDica: false,
        usouVerificacao: false,
        depoimentoVerificadoIndex: null
    };
};

/**
 * Obter estado atual do jogo
 */
exports.obterEstadoJogo = async (idPartida) => {
    const estado = jogosAtivos.get(idPartida);
    if (!estado) {
        throw new Error('Jogo não encontrado');
    }

    return {
        nomes: estado.grafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
        depoimentos: estado.depoimentos.map(d => `${d.de} contou algo para ${d.para}`),
        vidasRestantes: estado.vidasRestantes,
        scoreAtual: estado.scoreAtual,
        usouDica: estado.usouDica,
        usouVerificacao: !!estado.usouVerificacao,
        depoimentoVerificadoIndex: estado.depoimentoVerificadoIndex,
        depoimentoVerificadoEhMentira: (typeof estado.depoimentoVerificadoIndex === 'number' && estado.depoimentos[estado.depoimentoVerificadoIndex]) ? !!estado.depoimentos[estado.depoimentoVerificadoIndex].ehMentira : null,
        grafo: estado.usouDica ? {
            nodes: estado.grafo.nodes,
            edges: estado.grafo.edges
        } : null
    };
};

/**
 * Verificar chute do jogador
 */
exports.verificarChute = async(req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        const { chuteId } = req.body;
        if (chuteId === undefined || chuteId === null) {
            return res.status(400).json({ message: 'ID do chute é obrigatório.' });
        }

        // Buscar partida do usuário
        const [rowsUser] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rowsUser || rowsUser.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const userId = rowsUser[0].id_usuario;

        const [rowsPartida] = await db.query(
            'SELECT id_partida, numRodadas_partida, score_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const estado = jogosAtivos.get(idPartida);

        if (!estado) {
            return res.status(404).json({ message: 'Estado do jogo não encontrado.' });
        }

        const acertou = parseInt(chuteId) === estado.fofoqueiro;

        if (acertou) {
            // Vitória - calcular pontuação baseada em dica
            const pontos = estado.usouDica ? 1 : 2;
            estado.scoreAtual += pontos;

            // Atualizar contadores no banco: incrementar rodada e atualizar score
            try {
                await db.query('UPDATE partida SET numRodadas_partida = numRodadas_partida + 1, score_partida = ? WHERE id_partida = ?', [estado.scoreAtual, idPartida]);
            } catch (errDb) {
                console.warn('Erro ao atualizar partida após acerto:', errDb.message);
            }

            // Preparar próxima rodada: aumentar número de nós em 1, regenerar grafo e depoimentos
            try {
                const novosNodes = Math.max((estado.grafo && estado.grafo.nodes ? estado.grafo.nodes.length : 0) + 1, 2);

                // Gerar novo grafo
                const m0 = Math.min(3, Math.floor(novosNodes / 3));
                const m = Math.max(1, Math.min(2, m0));
                const nomesDisponiveis = [...NOMES].sort(() => Math.random() - 0.5);
                const novoGrafo = graphController.gerarGrafoBarabasiAlbert(novosNodes, m0, m, nomesDisponiveis);

                // Escolher fofoqueiro e mentiroso
                const novoFofoqueiro = Math.floor(Math.random() * novoGrafo.nodes.length);
                let novoMentiroso;
                do {
                    novoMentiroso = Math.floor(Math.random() * novoGrafo.nodes.length);
                } while (novoMentiroso === novoFofoqueiro);

                const novaPropagacao = propagarFofoca(novoGrafo, novoFofoqueiro, novoMentiroso);

                // Gerar depoimentos
                const novosDepoimentos = [];
                novaPropagacao.forEach((node) => {
                    if (node.nivel === 0) {
                        const outrosNodes = novoGrafo.nodes.filter(n => n.id !== node.id);
                        const mentira = outrosNodes[Math.floor(Math.random() * outrosNodes.length)];
                        novosDepoimentos.push({ de: mentira.nome, para: node.nome, ehMentira: true });
                    } else {
                        const origem = novaPropagacao.find(p => p.nivel === node.nivel - 1 && p.id !== node.id);
                        if (origem) novosDepoimentos.push({ de: origem.nome, para: node.nome, ehMentira: false });
                    }
                });

                // Atualizar estado em memória
                estado.grafo = novoGrafo;
                estado.fofoqueiro = novoFofoqueiro;
                estado.mentiroso = novoMentiroso;
                estado.propagacao = novaPropagacao;
                estado.depoimentos = novosDepoimentos;

                // Resetar flags que devem ser por-rodada
                estado.usouDica = false;
                estado.usouVerificacao = false;
                estado.depoimentosVerificados = new Set();
                estado.depoimentoVerificadoIndex = null;

                // Persistir estado completo no banco (inclui reset de verificação)
                await salvarEstadoJogo(idPartida);

                // Retornar resposta com estado da próxima rodada (não revelamos grafo se não usou dica)
                return res.status(200).json({
                    acertou: true,
                    nextRound: true,
                    fofoqueiro: estado.fofoqueiro,
                    nomeFofoqueiro: estado.grafo.nodes[estado.fofoqueiro].nome,
                    pontos,
                    scoreTotal: estado.scoreAtual,
                    numNodes: novoGrafo.nodes.length,
                    nomes: novoGrafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
                    depoimentos: estado.depoimentos.map(d => `${d.de} contou algo para ${d.para}`),
                    vidasRestantes: estado.vidasRestantes,
                    usouDica: estado.usouDica,
                    usouVerificacao: estado.usouVerificacao
                });
            } catch (errRound) {
                console.error('Erro ao iniciar nova rodada:', errRound);
                // Se falhar ao criar nova rodada, devolver vitória simples e encerrar partida como fallback
                const gameSectionController = require('./gameSectionController');
                await gameSectionController.encerrarPartida(idPartida, 'V', estado.scoreAtual);
                return res.status(200).json({
                    acertou: true,
                    fofoqueiro: estado.fofoqueiro,
                    nomeFofoqueiro: estado.grafo.nodes[estado.fofoqueiro].nome,
                    pontos,
                    scoreTotal: estado.scoreAtual,
                    message: `Parabéns! Você descobriu o fofoqueiro e ganhou ${pontos} ponto(s)!` 
                });
            }
        } else {
            // Errou - perde vida
            estado.vidasRestantes--;

            if (estado.vidasRestantes <= 0) {
                // Derrota - encerrar partida
                const gameSectionController = require('./gameSectionController');
                await gameSectionController.encerrarPartida(idPartida, 'D', 0);

                return res.status(200).json({
                    acertou: false,
                    gameOver: true,
                    fofoqueiro: estado.fofoqueiro,
                    nomeFofoqueiro: estado.grafo.nodes[estado.fofoqueiro].nome,
                    message: 'Game Over! Você perdeu todas as vidas.'
                });
            }

            return res.status(200).json({
                acertou: false,
                gameOver: false,
                vidasRestantes: estado.vidasRestantes,
                message: `Errado! Você ainda tem ${estado.vidasRestantes} vida(s).`
            });
        }
    } catch (err) {
        console.error('Erro ao verificar chute:', err);
        return res.status(500).json({ message: 'Erro ao verificar chute.' });
    }
};

/**
 * Solicitar dica - revela o grafo completo com penalidade
 */
exports.solicitarDica = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        // Buscar partida do usuário
        const [rowsUser] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rowsUser || rowsUser.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const userId = rowsUser[0].id_usuario;

        const [rowsPartida] = await db.query(
            'SELECT id_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const estado = jogosAtivos.get(idPartida);

        if (!estado) {
            return res.status(404).json({ message: 'Estado do jogo não encontrado.' });
        }

        if (estado.usouDica) {
            return res.status(400).json({ message: 'Você já usou a dica nesta partida.' });
        }

        // Marca que usou dica
        estado.usouDica = true;

        return res.status(200).json({
            message: 'Dica revelada! Pontuação reduzida para 1 ponto.',
            grafo: {
                nodes: estado.grafo.nodes,
                edges: estado.grafo.edges
            }
        });
    } catch (err) {
        console.error('Erro ao solicitar dica:', err);
        return res.status(500).json({ message: 'Erro ao solicitar dica.' });
    }
};

/**
 * Verificar se um depoimento é verdadeiro ou mentira
 */
exports.verificarDepoimento = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        const { depoimentoIndex } = req.body;
        if (depoimentoIndex === undefined || depoimentoIndex === null) {
            return res.status(400).json({ message: 'Índice do depoimento é obrigatório.' });
        }

        // Buscar partida do usuário
        const [rowsUser] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rowsUser || rowsUser.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const userId = rowsUser[0].id_usuario;

        const [rowsPartida] = await db.query(
            'SELECT id_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const estado = jogosAtivos.get(idPartida);

        if (!estado) {
            return res.status(404).json({ message: 'Estado do jogo não encontrado.' });
        }

        // Permitir apenas UMA verificação por partida
        if (estado.usouVerificacao) {
            return res.status(400).json({ message: 'Você já usou a verificação nesta partida.' });
        }

        const depoimento = estado.depoimentos[depoimentoIndex];
        if (!depoimento) {
            return res.status(404).json({ message: 'Depoimento não encontrado.' });
        }

        // Marcar que a verificação foi usada nesta partida e registrar índice
        estado.usouVerificacao = true;
        estado.depoimentosVerificados.add(depoimentoIndex);
        estado.depoimentoVerificadoIndex = depoimentoIndex;

        // Persistir estado completo no banco (inclui verificação)
        await salvarEstadoJogo(idPartida);

        return res.status(200).json({
            depoimento: `${depoimento.de} contou algo para ${depoimento.para}`,
            ehMentira: depoimento.ehMentira,
            message: depoimento.ehMentira ? 'Este depoimento é MENTIRA!' : 'Este depoimento é VERDADE!',
            usadoVerificacao: true,
            depoimentoVerificadoIndex: depoimentoIndex
        });
    } catch (err) {
        console.error('Erro ao verificar depoimento:', err);
        return res.status(500).json({ message: 'Erro ao verificar depoimento.' });
    }
};

/**
 * Salvar estado completo do jogo no banco de dados
 */
async function salvarEstadoJogo(idPartida) {
    const estado = jogosAtivos.get(idPartida);
    if (!estado) return;

    try {
        // Converter Sets para Arrays para serialização JSON
        const estadoSerializavel = {
            grafo: estado.grafo,
            fofoqueiro: estado.fofoqueiro,
            mentiroso: estado.mentiroso,
            propagacao: estado.propagacao,
            depoimentos: estado.depoimentos,
            vidasRestantes: estado.vidasRestantes,
            scoreAtual: estado.scoreAtual,
            usouDica: estado.usouDica,
            depoimentosVerificados: Array.from(estado.depoimentosVerificados || []),
            usouVerificacao: estado.usouVerificacao,
            depoimentoVerificadoIndex: estado.depoimentoVerificadoIndex
        };

        await db.query(
            'UPDATE partida SET estado_jogo_json = ?, score_partida = ?, verificacao_usada_partida = ?, depoimento_verificado_index_partida = ? WHERE id_partida = ?',
            [JSON.stringify(estadoSerializavel), estado.scoreAtual, estado.usouVerificacao ? 1 : 0, estado.depoimentoVerificadoIndex, idPartida]
        );
    } catch (err) {
        console.error('Erro ao salvar estado do jogo:', err);
    }
}

/**
 * Carregar estado completo do jogo do banco de dados
 */
async function carregarEstadoJogo(idPartida) {
    try {
        const [rows] = await db.query(
            'SELECT estado_jogo_json FROM partida WHERE id_partida = ? LIMIT 1',
            [idPartida]
        );

        if (!rows || rows.length === 0 || !rows[0].estado_jogo_json){
            return null;
        }

        const estadoDb = JSON.parse(rows[0].estado_jogo_json);
        
        // Reconstruir Sets a partir de Arrays
        const estado = {
            idPartida,
            grafo: estadoDb.grafo,
            fofoqueiro: estadoDb.fofoqueiro,
            mentiroso: estadoDb.mentiroso,
            propagacao: estadoDb.propagacao,
            depoimentos: estadoDb.depoimentos,
            vidasRestantes: estadoDb.vidasRestantes,
            scoreAtual: estadoDb.scoreAtual,
            usouDica: estadoDb.usouDica,
            depoimentosVerificados: new Set(estadoDb.depoimentosVerificados || []),
            usouVerificacao: estadoDb.usouVerificacao,
            depoimentoVerificadoIndex: estadoDb.depoimentoVerificadoIndex
        };

        jogosAtivos.set(idPartida, estado);
        return estado;
    } catch (err) {
        console.error('Erro ao carregar estado do jogo:', err);
        return null;
    }
}

/**
 * Limpar estado do jogo da memória
 */
exports.limparEstadoJogo = (idPartida) => {
    jogosAtivos.delete(idPartida);
};

/**
 * Carregar estado do jogo do banco (exportado para uso externo)
 */
exports.carregarEstadoJogo = carregarEstadoJogo;

/**
 * Aplica flags persistidas (do banco) no estado em memória de uma partida reconstituída.
 * Usado quando a entrada no DB existe mas o jogo em memória foi perdido (ex.: restart do servidor).
 * @param {number} idPartida
 * @param {object} opts - { usouVerificacao?: boolean, depoimentoVerificadoIndex?: number|null }
 * @returns {boolean} true se estado em memória foi encontrado e atualizado, false caso contrário
 */
exports.aplicarPersistencia = (idPartida, opts = {}) => {
    const estado = jogosAtivos.get(idPartida);
    if (!estado) return false;

    if (typeof opts.usouVerificacao !== 'undefined') {
        estado.usouVerificacao = !!opts.usouVerificacao;
    }

    if (typeof opts.depoimentoVerificadoIndex !== 'undefined') {
        estado.depoimentoVerificadoIndex = opts.depoimentoVerificadoIndex;
        if (opts.depoimentoVerificadoIndex !== null && opts.depoimentoVerificadoIndex !== undefined) {
            estado.depoimentosVerificados.add(opts.depoimentoVerificadoIndex);
        }
    }

    return true;
};
