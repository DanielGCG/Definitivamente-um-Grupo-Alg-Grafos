/**
 * Gera um grafo usando o modelo Barabási-Albert (Preferential Attachment)
 * @param {number} numNodes - Número total de nós
 * @param {number} m0 - Número de nós iniciais completamente conectados (default: 3)
 * @param {number} m - Número de arestas por novo nó (default: 2)
 * @param {array} nomes - Lista opcional de nomes para os nós
 * @returns {object} - Grafo com nós e arestas
 */
exports.gerarGrafoBarabasiAlbert = function(numNodes, m0 = 3, m = 2, nomes = null) {
    if (numNodes < m0) {
        throw new Error(`Número de nós deve ser >= ${m0}`);
    }
    if (m > m0) {
        throw new Error(`m deve ser <= m0`);
    }

    const nodes = [];
    const edges = [];
    const degree = new Array(numNodes).fill(0); // Grau de cada nó (popularidade)

    // Usar nomes fornecidos ou gerar padrão
    const nomesBase = nomes || Array.from({ length: numNodes }, (_, i) => `Pessoa ${i + 1}`);

    // Fase 1: Criar m0 nós iniciais completamente conectados
    for (let i = 0; i < m0; i++) {
        nodes.push({
            id: i,
            popularidade: 1, // Popularidade inicial
            nome: nomesBase[i]
        });
    }

    // Conectar todos os nós iniciais entre si (grafo completo)
    for (let i = 0; i < m0; i++) {
        for (let j = i + 1; j < m0; j++) {
            edges.push({ source: i, target: j });
            degree[i]++;
            degree[j]++;
        }
    }

    // Fase 2: Adicionar novos nós usando Preferential Attachment
    for (let i = m0; i < numNodes; i++) {
        nodes.push({
            id: i,
            popularidade: 1,
            nome: nomesBase[i]
        });

        // Calcular probabilidades baseadas no grau (popularidade)
        const totalDegree = degree.reduce((sum, d) => sum + d, 0) || 1;
        const targets = new Set();

        // Selecionar m nós para conectar usando preferential attachment
        while (targets.size < m && targets.size < i) {
            let rand = Math.random() * totalDegree;
            let cumulative = 0;

            for (let j = 0; j < i; j++) {
                cumulative += degree[j];
                if (rand <= cumulative && !targets.has(j)) {
                    targets.add(j);
                    break;
                }
            }
        }

        // Criar arestas
        targets.forEach(target => {
            edges.push({ source: i, target });
            degree[i]++;
            degree[target]++;
        });
    }

    // Atualizar popularidade com base no grau final
    nodes.forEach(node => {
        node.popularidade = degree[node.id];
    });

    return {
        nodes,
        edges,
        stats: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            avgDegree: (edges.length * 2) / nodes.length,
            maxDegree: Math.max(...degree),
            minDegree: Math.min(...degree)
        }
    };
};