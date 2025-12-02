const db = require('../db/database');
const graphController = require('./graphGenerationController');

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
exports.inicializarJogo = async (idPartida, idUsuario, numNodes = 6) => {
    // Lista de nomes embaralhados
    const [amigos] = await db.query('SELECT nome_usuario FROM usuario WHERE id_usuario IN (SELECT fk_Usuario_id_usuario_ FROM Amizade WHERE fk_Usuario_id_usuario = ?)', [idUsuario]);
    const nomesAmigos = amigos.map(a => a.nome_usuario);
    const nomesDisponiveis = [...NOMES].sort(() => Math.random() - 0.5);
    
    let nomes = nomesAmigos.concat(nomesDisponiveis);

    // Gerar grafo usando função centralizada
    const m0 = Math.max(2, Math.min(3, Math.floor(numNodes / 2)));
    const m = Math.max(1, Math.min(2, m0 - 1));
    const grafo = graphController.gerarGrafoBarabasiAlbert(numNodes, m0, m, nomes, numNodes);

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

    // Embaralhar depoimentos para randomizar a ordem
    for (let i = depoimentos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [depoimentos[i], depoimentos[j]] = [depoimentos[j], depoimentos[i]];
    }

    // Salvar no banco de dados
    await db.query(
        `UPDATE partida SET 
            grafo_json_partida = ?,
            depoimentos_json_partida = ?,
            fofoqueiro_id_partida = ?,
            mentiroso_id_partida = ?,
            vidas_restantes_partida = 3,
            score_partida = 0,
            usou_dica_partida = 0,
            verificacao_usada_partida = 0,
            depoimento_verificado_index_partida = NULL
        WHERE id_partida = ?`,
        [JSON.stringify(grafo), JSON.stringify(depoimentos), fofoqueiro, mentiroso, idPartida]
    );

    return{
        nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
        depoimentos: depoimentos.map(d => `${d.de} contou algo para ${d.para}`),
        vidasRestantes: 3,
        usouDica: false,
        usouVerificacao: false,
        depoimentoVerificadoIndex: null
    };
};

/**
 * Obter estado atual do jogo
 */
exports.obterEstadoJogo = async (idPartida) => {
    const [rows] = await db.query(
        `SELECT grafo_json_partida, depoimentos_json_partida, fofoqueiro_id_partida, mentiroso_id_partida, 
                vidas_restantes_partida, score_partida, usou_dica_partida, 
                verificacao_usada_partida, depoimento_verificado_index_partida
         FROM partida WHERE id_partida = ? LIMIT 1`,
        [idPartida]
    );

    if (!rows || rows.length === 0) {
        throw new Error('Jogo não encontrado');
    }

    const partida = rows[0];
    const grafo = JSON.parse(partida.grafo_json_partida);
    const depoimentos = JSON.parse(partida.depoimentos_json_partida);

    return {
        nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
        depoimentos: depoimentos.map(d => `${d.de} contou algo para ${d.para}`),
        vidasRestantes: partida.vidas_restantes_partida,
        scoreAtual: partida.score_partida,
        usouDica: !!partida.usou_dica_partida,
        usouVerificacao: !!partida.verificacao_usada_partida,
        depoimentoVerificadoIndex: partida.depoimento_verificado_index_partida,
        depoimentoVerificadoEhMentira: (typeof partida.depoimento_verificado_index_partida === 'number' && depoimentos[partida.depoimento_verificado_index_partida]) 
            ? !!depoimentos[partida.depoimento_verificado_index_partida].ehMentira 
            : null,
        grafo: partida.usou_dica_partida ? grafo : null
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
            `SELECT id_partida, grafo_json_partida, depoimentos_json_partida, fofoqueiro_id_partida, 
                    vidas_restantes_partida, score_partida, usou_dica_partida
             FROM partida 
             WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1`,
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const grafo = JSON.parse(rowsPartida[0].grafo_json_partida);
        const depoimentos = JSON.parse(rowsPartida[0].depoimentos_json_partida);
        const fofoqueiro = rowsPartida[0].fofoqueiro_id_partida;
        const vidasRestantes = rowsPartida[0].vidas_restantes_partida;
        const scoreAtual = rowsPartida[0].score_partida;
        const usouDica = !!rowsPartida[0].usou_dica_partida;

        const acertou = parseInt(chuteId) === fofoqueiro;

        if (acertou) {
            // Vitória - calcular pontuação baseada em dica
            const pontos = usouDica ? 1 : 2;
            const novoScore = scoreAtual + pontos;

            // Atualizar contadores no banco: incrementar rodada e atualizar score
            await db.query(
                'UPDATE partida SET numRodadas_partida = numRodadas_partida + 1, score_partida = ? WHERE id_partida = ?', 
                [novoScore, idPartida]
            );

            // Preparar próxima rodada: aumentar número de nós em 1, regenerar grafo e depoimentos
            try {
                const novosNodes = Math.max((grafo.nodes ? grafo.nodes.length : 0) + 1, 2);

                // Gerar novo grafo
                const m0 = Math.max(2, Math.min(3, Math.floor(novosNodes / 2)));
                const m = Math.max(1, Math.min(2, m0 - 1));
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

                // Embaralhar depoimentos para randomizar a ordem
                for (let i = novosDepoimentos.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [novosDepoimentos[i], novosDepoimentos[j]] = [novosDepoimentos[j], novosDepoimentos[i]];
                }

                // Atualizar no banco - resetar flags por-rodada
                await db.query(
                    `UPDATE partida SET 
                        grafo_json_partida = ?,
                        depoimentos_json_partida = ?,
                        fofoqueiro_id_partida = ?,
                        mentiroso_id_partida = ?,
                        usou_dica_partida = 0,
                        verificacao_usada_partida = 0,
                        depoimento_verificado_index_partida = NULL
                    WHERE id_partida = ?`,
                    [JSON.stringify(novoGrafo), JSON.stringify(novosDepoimentos), novoFofoqueiro, novoMentiroso, idPartida]
                );

                // Retornar resposta com estado da próxima rodada
                return res.status(200).json({
                    acertou: true,
                    nextRound: true,
                    fofoqueiro: novoFofoqueiro,
                    nomeFofoqueiro: novoGrafo.nodes[novoFofoqueiro].nome,
                    pontos,
                    scoreTotal: novoScore,
                    numNodes: novoGrafo.nodes.length,
                    nomes: novoGrafo.nodes.map(n => ({ id: n.id, nome: n.nome })),
                    depoimentos: novosDepoimentos.map(d => `${d.de} contou algo para ${d.para}`),
                    vidasRestantes: vidasRestantes,
                    usouDica: false,
                    usouVerificacao: false
                });
            } catch (errRound) {
                console.error('Erro ao iniciar nova rodada:', errRound);
                // Se falhar ao criar nova rodada, devolver vitória simples e encerrar partida como fallback
                const gameSectionController = require('./gameSectionController');
                await gameSectionController.encerrarPartida(idPartida, 'V', novoScore);
                return res.status(200).json({
                    acertou: true,
                    fofoqueiro: fofoqueiro,
                    nomeFofoqueiro: grafo.nodes[fofoqueiro].nome,
                    pontos,
                    scoreTotal: novoScore,
                    message: `Parabéns! Você descobriu o fofoqueiro e ganhou ${pontos} ponto(s)!` 
                });
            }
        } else {
            // Errou - perde vida
            const novasVidas = vidasRestantes - 1;

            if (novasVidas <= 0) {
                // Derrota - encerrar partida
                await db.query(
                    'UPDATE partida SET vidas_restantes_partida = 0 WHERE id_partida = ?',
                    [idPartida]
                );
                
                const gameSectionController = require('./gameSectionController');
                await gameSectionController.encerrarPartida(idPartida, 'D', 0);

                return res.status(200).json({
                    acertou: false,
                    gameOver: true,
                    fofoqueiro: fofoqueiro,
                    nomeFofoqueiro: grafo.nodes[fofoqueiro].nome,
                    message: 'Game Over! Você perdeu todas as vidas.'
                });
            }

            // Atualizar vidas no banco
            await db.query(
                'UPDATE partida SET vidas_restantes_partida = ? WHERE id_partida = ?',
                [novasVidas, idPartida]
            );

            return res.status(200).json({
                acertou: false,
                gameOver: false,
                vidasRestantes: novasVidas,
                message: `Errado! Você ainda tem ${novasVidas} vida(s).`
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
            `SELECT id_partida, grafo_json_partida, usou_dica_partida 
             FROM partida 
             WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1`,
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const usouDica = !!rowsPartida[0].usou_dica_partida;
        const grafo = JSON.parse(rowsPartida[0].grafo_json_partida);

        if (usouDica) {
            return res.status(400).json({ message: 'Você já usou a dica nesta partida.' });
        }

        // Marca que usou dica no banco
        await db.query('UPDATE partida SET usou_dica_partida = 1 WHERE id_partida = ?', [idPartida]);

        return res.status(200).json({
            message: 'Dica revelada! Pontuação reduzida para 1 ponto.',
            grafo: {
                nodes: grafo.nodes,
                edges: grafo.edges
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
            `SELECT id_partida, depoimentos_json_partida, verificacao_usada_partida 
             FROM partida 
             WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1`,
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const usouVerificacao = !!rowsPartida[0].verificacao_usada_partida;
        const depoimentos = JSON.parse(rowsPartida[0].depoimentos_json_partida);

        // Permitir apenas UMA verificação por partida
        if (usouVerificacao) {
            return res.status(400).json({ message: 'Você já usou a verificação nesta partida.' });
        }

        const depoimento = depoimentos[depoimentoIndex];
        if (!depoimento) {
            return res.status(404).json({ message: 'Depoimento não encontrado.' });
        }

        // Marcar que a verificação foi usada nesta partida e registrar índice
        await db.query(
            'UPDATE partida SET verificacao_usada_partida = 1, depoimento_verificado_index_partida = ? WHERE id_partida = ?',
            [depoimentoIndex, idPartida]
        );

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
