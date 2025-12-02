exports.gerarGrafoBarabasiAlbert = function (
    numNos,
    numNosIniciais,
    numArestasPorNovoNo,
    listaDeNomesParaOsNos
){
    if(numNosIniciais < 1 || numNosIniciais >= numNos){
        throw new Error("numNosIniciais deve ser >= 1 e menor que numNos.");
    }
    if(numArestasPorNovoNo < 1 || numArestasPorNovoNo >= numNosIniciais){
        throw new Error("numArestasPorNovoNo deve ser >= 1 e menor que numNosIniciais.");
    }

    const nodes = [];
    const edges = [];


    for(let i = 0; i < numNos; i++){
        let nome;

        if(listaDeNomesParaOsNos && i < listaDeNomesParaOsNos.length){
            nome = listaDeNomesParaOsNos[i];
        } 
        else{
            nome = "No_" + i;
        }

        nodes.push({ id: i, nome });
    }


    for(let i = 0; i < numNosIniciais; i++){
        for (let j = i + 1; j < numNosIniciais; j++) {
            edges.push({
                source: i,
                target: j,
                weight: Math.random()
            });
        }
    }


    function calcularGraus(){
        const grau = Array(numNos).fill(0);
        for(const e of edges){
            grau[e.source]++;
            grau[e.target]++;
        }
        return grau;
    }

    // Barabasi-Albert
    for(let novoNo = numNosIniciais; novoNo < numNos; novoNo++){
        const grau = calcularGraus();
        const somaGraus = grau.reduce((a, b) => a + b, 0);

        const escolhidos = new Set();

        // selecionar numArestasPorNovoNo nós existentes via preferential attachment
        while(escolhidos.size < numArestasPorNovoNo){
            const r = Math.random() * somaGraus;
            let acumulado = 0;

            for(let i = 0; i < novoNo; i++){
                acumulado += grau[i];
                if(acumulado >= r){
                    escolhidos.add(i);
                    break;
                }
            }
        }

        // criar arestas
        for(const alvo of escolhidos){
            edges.push({
                source: novoNo,
                target: alvo,
                weight: Math.random()
            });
        }
    }


    const grausFinais = calcularGraus();
    const totalEdges = edges.length;
    const minDegree = Math.min(...grausFinais);
    const maxDegree = Math.max(...grausFinais);
    const avgDegree = grausFinais.reduce((a, b) => a + b, 0) / grausFinais.length;

    const stats = {
        totalNodes: numNos,
        totalEdges: totalEdges,
        minDegree,
        avgDegree,
        maxDegree
    };


    return {
        nodes,
        edges,
        stats
    };
};
