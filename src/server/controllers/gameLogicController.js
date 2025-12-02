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
 * BFS para propagar fofoca a partir do fofoqueiro
 * BFS garante que a fofoca se propague por níveis (distância do fofoqueiro)
 */
function propagarFofoca(grafo, fofoqueiro, mentiroso) {
    const visitados = new Set();
    const propagacao = [];
    const parentMap = new Map(); // Rastreia de quem cada nó recebeu a fofoca
    const adjList = new Map();

    // Construir lista de adjacência
    grafo.nodes.forEach(node => adjList.set(node.id, []));
    grafo.edges.forEach(edge => {
        adjList.get(edge.source).push(edge.target);
        adjList.get(edge.target).push(edge.source);
    });

    // Fila para BFS: cada elemento é { nodeId, nivel, parentId }
    const fila = [{ nodeId: fofoqueiro, nivel: 0, parentId: null }];
    visitados.add(fofoqueiro);

    while (fila.length > 0) {
        const { nodeId, nivel, parentId } = fila.shift();
        
        const node = grafo.nodes.find(n => n.id === nodeId);
        const isMentiroso = nodeId === mentiroso;

        // Registrar de quem este nó recebeu a fofoca
        if (parentId !== null) {
            parentMap.set(nodeId, parentId);
        }

        propagacao.push({
            id: nodeId,
            nome: node.nome,
            nivel,
            parentId,
            mentiroso: isMentiroso,
            popularidade: node.popularidade
        });

        // Se for mentiroso, não propaga (bloqueia a fofoca)
        if (isMentiroso) continue;

        // Adicionar vizinhos não visitados à fila
        const vizinhos = adjList.get(nodeId) || [];
        vizinhos.forEach(vizinho => {
            if (!visitados.has(vizinho)) {
                visitados.add(vizinho);
                fila.push({ nodeId: vizinho, nivel: nivel + 1, parentId: nodeId });
            }
        });
    }

    return { propagacao, parentMap };
}

/**
 * Inicializa um novo jogo para uma partida
 */
exports.inicializarJogo = async (idPartida, idUsuario, numNodes = 6) => {
    // 1. Buscar amigos do usuário (com fotos) - apenas amizades recíprocas
    const [amigos] = await db.query(
        `SELECT u.id_usuario, u.nome_usuario, u.foto_usuario
         FROM Amizade a1
         JOIN Amizade a2 
             ON a1.fk_Usuario_id_usuario = a2.fk_Usuario_id_usuario_
            AND a1.fk_Usuario_id_usuario_ = a2.fk_Usuario_id_usuario
         JOIN usuario u ON u.id_usuario = a1.fk_Usuario_id_usuario_
         WHERE a1.fk_Usuario_id_usuario = ?
         ORDER BY RAND()
         LIMIT ?`,
        [idUsuario, numNodes]
    );
    
    const personagens = amigos.map(a => ({
        id: a.id_usuario,
        nome: a.nome_usuario,
        foto: a.foto_usuario
    }));

    // 2. Se precisar de mais nós, buscar usuários aleatórios (excluindo amigos já selecionados e o próprio usuário)
    if (personagens.length < numNodes) {
        const idsExcluir = [idUsuario, ...personagens.map(p => p.id)];
        const placeholders = idsExcluir.map(() => '?').join(',');
        const falta = numNodes - personagens.length;
        
        const [usuariosAleatorios] = await db.query(
            `SELECT nome_usuario, foto_usuario
             FROM usuario
             WHERE id_usuario NOT IN (${placeholders})
             ORDER BY RAND()
             LIMIT ?`,
            [...idsExcluir, falta]
        );
        
        usuariosAleatorios.forEach(u => {
            personagens.push({
                nome: u.nome_usuario,
                foto: u.foto_usuario
            });
        });
    }

    // 3. Se ainda precisar, usar nomes genéricos
    const nomesGenericos = [...NOMES].sort(() => Math.random() - 0.5);
    let nomeGenIndex = 0;
    while (personagens.length < numNodes) {
        const nomeGenerico = nomesGenericos[nomeGenIndex] || `Pessoa_${personagens.length}`;
        nomeGenIndex++;
        personagens.push({
            nome: nomeGenerico,
            foto: '/img/usuario.png' // Foto placeholder para nomes genéricos
        });
    }

    // Gerar grafo usando função centralizada
    const m0 = Math.max(2, Math.min(3, Math.floor(numNodes / 2)));
    const m = Math.max(1, Math.min(2, m0 - 1));
    const grafo = graphController.gerarGrafoBarabasiAlbert(numNodes, m0, m, personagens);

    // Escolher fofoqueiro aleatório
    const fofoqueiro = Math.floor(Math.random() * grafo.nodes.length);

    // Escolher mentiroso aleatório (diferente do fofoqueiro)
    let mentiroso;
    do {
        mentiroso = Math.floor(Math.random() * grafo.nodes.length);
    } while (mentiroso === fofoqueiro);

    // Propagar fofoca usando DFS
    const { propagacao, parentMap } = propagarFofoca(grafo, fofoqueiro, mentiroso);

    // Gerar depoimentos: cada pessoa diz de quem recebeu a fofoca
    const depoimentos = [];
    propagacao.forEach((node) => {
        if (node.nivel === 0) {
            // Fofoqueiro mente dizendo que recebeu de alguém aleatório
            const outrosNodes = grafo.nodes.filter(n => n.id !== node.id);
            const mentira = outrosNodes[Math.floor(Math.random() * outrosNodes.length)];
            depoimentos.push({
                quemOuviu: node.nome,
                deQuem: mentira.nome,
                ehMentira: true
            });
        } else {
            // Usar o parentMap para saber exatamente de quem este nó recebeu a fofoca
            const parentId = parentMap.get(node.id);
            if (parentId !== undefined) {
                const parentNode = grafo.nodes.find(n => n.id === parentId);
                depoimentos.push({
                    quemOuviu: node.nome,
                    deQuem: parentNode.nome,
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
        nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome, foto: n.foto })),
        depoimentos: depoimentos.map(d => `${d.quemOuviu}: ouvi de ${d.deQuem}`),
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
        nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome, foto: n.foto })),
        depoimentos: depoimentos.map(d => `${d.quemOuviu}: ouvi de ${d.deQuem}`),
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

                const { propagacao: novaPropagacao, parentMap: novoParentMap } = propagarFofoca(novoGrafo, novoFofoqueiro, novoMentiroso);

                // Gerar depoimentos
                const novosDepoimentos = [];
                novaPropagacao.forEach((node) => {
                    if (node.nivel === 0) {
                        const outrosNodes = novoGrafo.nodes.filter(n => n.id !== node.id);
                        const mentira = outrosNodes[Math.floor(Math.random() * outrosNodes.length)];
                        novosDepoimentos.push({ quemOuviu: node.nome, deQuem: mentira.nome, ehMentira: true });
                    } else {
                        // Usar o parentMap para saber exatamente de quem este nó recebeu a fofoca
                        const parentId = novoParentMap.get(node.id);
                        if (parentId !== undefined) {
                            const parentNode = novoGrafo.nodes.find(n => n.id === parentId);
                            novosDepoimentos.push({ quemOuviu: node.nome, deQuem: parentNode.nome, ehMentira: false });
                        }
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
                    depoimentos: novosDepoimentos.map(d => `${d.quemOuviu}: ouvi de ${d.deQuem}`),
                    vidasRestantes: vidasRestantes,
                    usouDica: false,
                    usouVerificacao: false
                });
            } catch (errRound) {
                console.error('Erro ao iniciar nova rodada:', errRound);
                // Se falhar ao criar nova rodada, encerrar partida
                const gameSectionController = require('./gameSectionController');
                await gameSectionController.encerrarPartida(idPartida, novoScore);
                return res.status(500).json({
                    message: 'Erro ao criar próxima rodada. Partida encerrada.',
                    scoreTotal: novoScore
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
                await gameSectionController.encerrarPartida(idPartida, scoreAtual);

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
            depoimento: `${depoimento.quemOuviu}: ouvi de ${depoimento.deQuem}`,
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