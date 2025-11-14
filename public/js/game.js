// Modularized game logic and GUI glue for "Descubra o Fofoqueiro"
// Exposes iniciarJogo(), chutar(id), marcarVertice(id), fecharPopup()
(function () {
  // Estado do jogo (encapsulado)
  let vidas = 3;
  let pontos = 0;
  let tamanhoInicial = 8;
  let nivelAtual = 8;
  let popupAmigoAtual = null;
  let svgElement = null;
  let verticesMarcados = new Set();
  let arestasMarcadas = new Set();
  let currentNodes = [];
  let currentLinks = [];
  let linkElements = null;
  let nodeElements = null;
  let fofoqueiro = null;
  let dicaTextoUsada = false;
  let dicaGrafoUsada = false;
  let dicaDistanciaUsada = false;
  let simulation = null;
  let modoAtual = 'criar'; // 'criar' ou 'marcar'
  let arestasUsuario = new Set(); // arestas criadas pelo usuário

  // Utilitários
  function atualizarPosicaoPopup() {
    if (popupAmigoAtual && svgElement) {
      const popup = document.getElementById('popup');
      if (!popup.classList.contains('hidden')) {
        const svgRect = svgElement.getBoundingClientRect();
        const x = svgRect.left + (popupAmigoAtual.x || 0);
        const y = svgRect.top + (popupAmigoAtual.y || 0);
        popup.style.left = (x + 20) + 'px';
        popup.style.top = (y - 10) + 'px';
      }
    }
  }

  function fecharPopup() {
    document.getElementById('popup').classList.add('hidden');
    popupAmigoAtual = null;
  }

  function atualizarMarcacoes() {
    if (nodeElements) {
      nodeElements.classed('marked', d => verticesMarcados.has(d.id));
    }
    if (linkElements && currentLinks) {
      linkElements.classed('marked', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const arestaKey = sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
        return arestasMarcadas.has(arestaKey);
      });
    }
  }

  function criarArestaUsuario(id) {
    if (verticesMarcados.has(id)) {
      // Se já está marcado, desmarcar e remover arestas criadas associadas
      verticesMarcados.delete(id);
      Array.from(arestasUsuario).forEach(aresta => {
        const [a, b] = aresta.split('-').map(Number);
        if (a === id || b === id) arestasUsuario.delete(aresta);
      });
    } else {
      // Se já existe 1 vértice marcado, criar aresta e limpar seleção
      if (verticesMarcados.size === 1) {
        const verticesMarcadosArray = Array.from(verticesMarcados);
        const primeiroMarcado = verticesMarcadosArray[0];
        
  // Criar aresta dirigida entre primeiroMarcado -> id (preservar direção)
  const arestaKey = `${primeiroMarcado}-${id}`;
        arestasUsuario.add(arestaKey);
        
        // Limpar seleção após criar a aresta
        verticesMarcados.clear();
      } else {
        // Se nenhum ou mais de 1 vértice marcado, apenas marcar este
        verticesMarcados.add(id);
      }
    }
    atualizarVisualizacaoArestasUsuario();
  }

  function atualizarVisualizacaoArestasUsuario() {
    // Atualizar vértices marcados
    if (nodeElements) {
      nodeElements.classed('marked', d => verticesMarcados.has(d.id));
    }
    
    // Usar marker SVG nativo para setas direcionadas
    const svg = d3.select('#grafo');

    // Garantir que exista
    if (svg.select('defs').empty()) svg.append('defs');
    const marker = svg.select('defs').selectAll('marker#arrowhead-user').data([0]).join('marker')
      .attr('id', 'arrowhead-user')
      .attr('viewBox', '0 0 8 8')
      .attr('refX', 8)
      .attr('refY', 4)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth');

    // triângulo (seta) reduzido
    marker.selectAll('path').data([0]).join('path')
      .attr('d', 'M 0 0 L 8 4 L 0 8 z')
      .attr('fill', '#4CAF50');

    // Remover linhas antigas e redesenhar com marker-end
    svg.selectAll('line.user-link').remove();

    const arestasArray = Array.from(arestasUsuario).map(aresta => {
      const [source, target] = aresta.split('-').map(Number);
      return { source, target };
    });

    const g = svg.select('g');

    g.selectAll('line.user-link')
      .data(arestasArray)
      .join('line')
      .attr('class', 'link user-link marked')
      .attr('stroke', '#4CAF50')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead-user)')
      .attr('x1', d => {
        const source = currentNodes[d.source];
        const target = currentNodes[d.target];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nodeRadius = 18;
        const offsetStart = nodeRadius;
        return source.x + ux * offsetStart;
      })
      .attr('y1', d => {
        const source = currentNodes[d.source];
        const target = currentNodes[d.target];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nodeRadius = 18;
        const offsetStart = nodeRadius;
        return source.y + uy * offsetStart;
      })
      .attr('x2', d => {
        const source = currentNodes[d.source];
        const target = currentNodes[d.target];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nodeRadius = 18;
        const offsetEnd = nodeRadius + 2;
        return target.x - ux * offsetEnd;
      })
      .attr('y2', d => {
        const source = currentNodes[d.source];
        const target = currentNodes[d.target];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nodeRadius = 18;
        const offsetEnd = nodeRadius + 2;
        return target.y - uy * offsetEnd;
      });
  }

  function marcarVertice(id) {
    if (verticesMarcados.has(id)) {
      verticesMarcados.delete(id);
      // remover arestas associadas
      Array.from(arestasMarcadas).forEach(aresta => {
        const [a, b] = aresta.split('-').map(Number);
        if (a === id || b === id) arestasMarcadas.delete(aresta);
      });
    } else {
      // Se já existe 1 vértice marcado, marcar aresta e limpar seleção
      if (verticesMarcados.size === 1 && currentLinks) {
        const verticesMarcadosArray = Array.from(verticesMarcados);
        const primeiroMarcado = verticesMarcadosArray[0];
        const existeAresta = currentLinks.some(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return (sourceId === primeiroMarcado && targetId === id) || (sourceId === id && targetId === primeiroMarcado);
        });
        if (existeAresta) {
          const arestaKey = primeiroMarcado < id ? `${primeiroMarcado}-${id}` : `${id}-${primeiroMarcado}`;
          arestasMarcadas.add(arestaKey);
        }
        // Limpar seleção após marcar a aresta
        verticesMarcados.clear();
      } else {
        // Se nenhum ou mais de 1 vértice marcado, apenas marcar este
        verticesMarcados.add(id);
      }
    }
    atualizarMarcacoes();
  }

  // Função para gerar lista de versões
  function montarHtmlVersoes(nodes) {
    return nodes.map(d => `
      <div class="pessoa-item" data-id="${d.id}">
        <b>${d.nome}</b> ouviu de <i>${d.ouviuDeFalso || 'não ouviu nada'}</i>
        <span style="float: right; color: #ff4081;">Chutar</span>
      </div>
    `).join('');
  }

  // Função principal que inicializa o jogo; pode ser chamada externamente
  function iniciarJogo(numNomes = nivelAtual) {
    // reset UI
    document.getElementById('infoBox').classList.add('hidden');
    document.getElementById('grafo').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('hidden');
    fecharPopup();
    verticesMarcados.clear();
    arestasMarcadas.clear();
    arestasUsuario.clear();
    modoAtual = 'criar';
    dicaTextoUsada = true;
    dicaGrafoUsada = false;
    dicaDistanciaUsada = false;
    document.getElementById('btnDica1').disabled = false;
    document.getElementById('btnDica2').disabled = true;

    const svg = d3.select('#grafo');
    svg.selectAll('*').remove();
    svgElement = document.getElementById('grafo');

    const nomes = [
      'Ana','Beto','Carla','Diego','Eva','Fábio','Gi','Hugo','Iara','Jonas',
      'Karla','Leo','Marina','Nina','Otto','Paula','Quinn','Raul','Sofia','Tiago',
      'Úrsula','Vitor','Wagner','Xuxa','Yara','Zeca'
    ];
    const nomesUsados = nomes.slice(0, Math.min(numNomes, 26));
    const numAmigos = nomesUsados.length;

    // --- gerar grafo (comunidades com pontes) ---
    function gerarGrafoComunidades() {
      let links = [];
      const numComunidades = numAmigos <= 4 ? 1 : (numAmigos <= 8 ? 2 : 3);
      const comunidades = [];
      for (let c = 0; c < numComunidades; c++) {
        const inicio = Math.floor(c * numAmigos / numComunidades);
        const fim = Math.floor((c + 1) * numAmigos / numComunidades);
        comunidades.push(Array.from({length: fim - inicio}, (_, i) => inicio + i));
      }
      for (const comunidade of comunidades) {
        for (let i = 0; i < comunidade.length; i++) {
          for (let j = i + 1; j < comunidade.length; j++) {
            if (Math.random() < 0.8) links.push({source: comunidade[i], target: comunidade[j]});
          }
        }
      }
      if (numComunidades > 1) {
        for (let c1 = 0; c1 < numComunidades; c1++) {
          for (let c2 = c1 + 1; c2 < numComunidades; c2++) {
            const numPontes = Math.floor(Math.random() * 4) + 4; // 4 a 7 pontes
            for (let p = 0; p < numPontes; p++) {
              const v1 = comunidades[c1][Math.floor(Math.random() * comunidades[c1].length)];
              const v2 = comunidades[c2][Math.floor(Math.random() * comunidades[c2].length)];
              if (!links.some(l => (l.source === v1 && l.target === v2) || (l.source === v2 && l.target === v1))) {
                links.push({source: v1, target: v2});
              }
            }
          }
        }
      }
      return links;
    }

    let links = gerarGrafoComunidades();

    // desconectar ~20% dos vértices
    const numDesconexos = Math.floor(numAmigos * 0.2);
    const verticesConectadosSet = new Set();
    for (const link of links) { verticesConectadosSet.add(link.source); verticesConectadosSet.add(link.target); }
    if (verticesConectadosSet.size > numAmigos - numDesconexos && numDesconexos > 0) {
      const verticesParaDesconectar = [];
      for (let i = 0; i < numAmigos; i++) if (verticesConectadosSet.has(i)) verticesParaDesconectar.push(i);
      verticesParaDesconectar.sort(() => Math.random() - 0.5);
      const aDesconectar = verticesParaDesconectar.slice(0, numDesconexos);
      links = links.filter(l => !aDesconectar.includes(l.source) && !aDesconectar.includes(l.target));
    }

    const numMentirosos = Math.max(1, Math.ceil(numAmigos * 0.2));
    const indices = Array.from({length: numAmigos}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
    const mentirososSet = new Set(indices.slice(0, numMentirosos));

    const nodes = nomesUsados.map((n, i) => ({
      id: i,
      nome: n,
      mentiroso: mentirososSet.has(i) ? 0.10 + Math.random() * 0.30 : Math.random() * 0.10,
      ouviuDe: null,
      ouviuDeFalso: null,
      confiabilidadeAcumulada: null
    }));

    currentNodes = nodes;
    currentLinks = links;

    // Função para calcular alcance de um vértice usando BFS
    function calcularAlcance(verticeInicial, links, numTotal) {
      const visitado = new Set([verticeInicial]);
      const fila = [verticeInicial];
      
      while (fila.length > 0) {
        const atual = fila.shift();
        const vizinhos = links.filter(l => l.source === atual || l.target === atual)
                              .map(l => l.source === atual ? l.target : l.source);
        
        for (const v of vizinhos) {
          if (!visitado.has(v)) {
            visitado.add(v);
            fila.push(v);
          }
        }
      }
      
      return visitado.size / numTotal;
    }

    // escolher fofoqueiro entre vértices conectados que alcançam pelo menos 80%
    let fofoqueiro = null;
    let tentativasGrafo = 0;
    const maxTentativas = 10;
    
    while (fofoqueiro === null && tentativasGrafo < maxTentativas) {
      const verticesConectados = new Set();
      for (const link of links) { verticesConectados.add(link.source); verticesConectados.add(link.target); }
      
      if (verticesConectados.size === 0 && numAmigos >= 2) { 
        links.push({source:0,target:1}); 
        verticesConectados.add(0); 
        verticesConectados.add(1); 
      }
      
      const verticesArray = Array.from(verticesConectados);
      let encontrouFofoqueiro = false;
      
      // Testar todos os vértices conectados
      for (const candidato of verticesArray) {
        const alcance = calcularAlcance(candidato, links, numAmigos);
        if (alcance >= 0.8) {
          fofoqueiro = candidato;
          encontrouFofoqueiro = true;
          break;
        }
      }
      
      // Se não encontrou nenhum vértice com alcance >= 80%, regenerar grafo
      if (!encontrouFofoqueiro) {
        tentativasGrafo++;
        links = gerarGrafoComunidades();
        
        // Reprocessar desconexões
        const verticesConectadosSet = new Set();
        for (const link of links) { verticesConectadosSet.add(link.source); verticesConectadosSet.add(link.target); }
        if (verticesConectadosSet.size > numAmigos - numDesconexos && numDesconexos > 0) {
          const verticesParaDesconectar = [];
          for (let i = 0; i < numAmigos; i++) if (verticesConectadosSet.has(i)) verticesParaDesconectar.push(i);
          verticesParaDesconectar.sort(() => Math.random() - 0.5);
          const aDesconectar = verticesParaDesconectar.slice(0, numDesconexos);
          links = links.filter(l => !aDesconectar.includes(l.source) && !aDesconectar.includes(l.target));
        }
        
        currentLinks = links;
      }
    }
    
    // Fallback: se após todas as tentativas não encontrou, escolher aleatoriamente
    if (fofoqueiro === null) {
      const verticesConectados = new Set();
      for (const link of links) { verticesConectados.add(link.source); verticesConectados.add(link.target); }
      const verticesArray = Array.from(verticesConectados);
      fofoqueiro = verticesArray[Math.floor(Math.random() * verticesArray.length)];
    }

    // espalhar fofoca (DFS)
    const pilha = [fofoqueiro];
    const visitado = new Set([fofoqueiro]);
    nodes[fofoqueiro].ouviuDe = 'ninguém';
    nodes[fofoqueiro].ouviuDeId = null;
    while (pilha.length > 0) {
      const atual = pilha.pop();
      const vizinhos = links.filter(l => l.source === atual || l.target === atual).map(l => l.source === atual ? l.target : l.source);
      vizinhos.sort(() => Math.random() - 0.5);
      for (const v of vizinhos) {
        if (!visitado.has(v)) {
          visitado.add(v);
          pilha.push(v);
          nodes[v].ouviuDe = nodes[atual].nome;
          nodes[v].ouviuDeId = atual;
        }
      }
    }

    // Evitar ciclos de tamanho 2 (A ouviu de B e B ouviu de A): quebrar aleatoriamente um dos dois
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.ouviuDeId == null) continue;
      const bId = a.ouviuDeId;
      if (bId == null || bId < 0 || bId >= nodes.length) continue;
      const b = nodes[bId];
      if (b.ouviuDeId === a.id) {
        // ciclo detectado entre a.id <-> bId: quebrar escolhendo aleatoriamente qual limpar
        if (Math.random() < 0.5) {
          a.ouviuDe = 'ninguém';
          a.ouviuDeId = null;
        } else {
          b.ouviuDe = 'ninguém';
          b.ouviuDeId = null;
        }
      }
    }

    // gerar versões falsas: apenas fofoqueiro mente — agora ele pode apontar para qualquer pessoa (não precisa ser vizinho)
    for (const amigo of nodes) {
      if (amigo.id === fofoqueiro) {
        const candidatos = nodes.map(n => n.id).filter(id => id !== fofoqueiro);
        if (candidatos.length > 0) {
          const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
          amigo.ouviuDeFalso = nodes[escolhido].nome;
        } else {
          amigo.ouviuDeFalso = 'ninguém';
        }
      } else {
        amigo.ouviuDeFalso = amigo.ouviuDe;
      }
    }

    // D3 renderização
    const svgRect = svgElement.getBoundingClientRect();
    const width = svgRect.width || 900;
    const height = svgRect.height || 600;
    const margin = 30;

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    linkElements = svg.append('g').selectAll('line').data(links).join('line').attr('class','link');

    nodeElements = svg.append('g').selectAll('g').data(nodes).join('g').attr('class','node').on('click', (event, d) => {
      if (modoAtual === 'criar') {
        // Modo criar: Shift+click para criar arestas entre vértices
        if (event.shiftKey) {
          criarArestaUsuario(d.id);
        } else {
          // Mostrar popup
          const svgRect = svgElement.getBoundingClientRect();
          const x = svgRect.left + d.x;
          const y = svgRect.top + d.y;
          mostrarPopup(d, x, y);
        }
      } else if (event.shiftKey) {
        // Modo marcar: Shift+click para marcar/desmarcar
        marcarVertice(d.id);
      } else {
        // Mostrar popup
        const svgRect = svgElement.getBoundingClientRect();
        const x = svgRect.left + d.x;
        const y = svgRect.top + d.y;
        mostrarPopup(d, x, y);
      }
    });

    nodeElements.append('circle').attr('r',18).attr('fill','#6fa8dc');
    nodeElements.append('text').text(d => d.nome[0]).attr('x', -5).attr('y', 5);

    simulation.on('tick', () => {
      nodes.forEach(d => { d.x = Math.max(margin, Math.min(width - margin, d.x)); d.y = Math.max(margin, Math.min(height - margin, d.y)); });
      linkElements.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
      atualizarPosicaoPopup();
      // Atualizar posição das arestas do usuário
      if (modoAtual === 'criar') {
        atualizarVisualizacaoArestasUsuario();
      }
    });

    // Mostrar textos automaticamente
    document.getElementById('gameContainer').classList.remove('hidden');
    const grafoElement = document.getElementById('grafo');
    grafoElement.classList.remove('hidden');
    const box = document.getElementById('infoBox');
    box.innerHTML = `<h3>Versões dos amigos</h3>${montarHtmlVersoes(nodes)}<hr><p><b>Um deles está mentindo... Clique para chutar!</b></p><p><i>Modo: <strong>Criar Arestas</strong> - Shift+clique nos vértices para conectá-los</i></p>`;
    box.classList.remove('hidden');
    // delegação para chutar ao clicar em item
    box.querySelectorAll('.pessoa-item').forEach(el => {
      el.addEventListener('click', () => window.chutar(Number(el.dataset.id)));
    });

    // Mostrar apenas vértices inicialmente (esconder arestas reais)
    linkElements.style('opacity', 0);

    // popup
    function mostrarPopup(amigo, x, y) {
      popupAmigoAtual = amigo;
      const popup = document.getElementById('popup');
      popup.style.left = (x + 20) + 'px';
      popup.style.top = (y - 10) + 'px';
      popup.classList.remove('hidden');
      let confiabilidadeInfo = '';
      if (amigo.confiabilidadeAcumulada !== null) {
        confiabilidadeInfo = `<p><b>Confiabilidade acumulada:</b> ${(amigo.confiabilidadeAcumulada * 100).toFixed(1)}%</p>`;
      }
      popup.innerHTML = `
        <h3>
          <span>${amigo.nome}</span>
          <button class="close-btn" id="popupClose">×</button>
        </h3>
        <p><b>Diz que ouviu de:</b> ${amigo.ouviuDeFalso || 'não ouviu nada'}</p>
        <p><b>Grau de mentiroso:</b> ${(amigo.mentiroso * 100).toFixed(1)}%</p>
        ${confiabilidadeInfo}
        <button id="btnChutar">Chutar como fofoqueiro</button>
        <button id="btnMarcar" style="background: #4CAF50; margin-top: 5px;">${verticesMarcados.has(amigo.id) ? 'Desmarcar' : 'Marcar'}</button>
      `;
      document.getElementById('popupClose').onclick = fecharPopup;
      document.getElementById('btnChutar').onclick = () => { window.chutar(amigo.id); };
      document.getElementById('btnMarcar').onclick = () => { marcarVertice(amigo.id); fecharPopup(); };
    }

    // lógica do jogo (chute)
    window.chutar = (id) => {
      fecharPopup();
      if (id === fofoqueiro) {
        // sem dica = 2 pontos, grafo = 1 ponto, confiabilidade = 0 pontos
        let pontosGanhos = 2; // Padrão: só textos
        if (dicaGrafoUsada && !dicaDistanciaUsada) {
          pontosGanhos = 1; // Textos + Grafo
        } else if (dicaDistanciaUsada) {
          pontosGanhos = 0; // Todas as dicas
        }
        pontos += pontosGanhos;
        document.getElementById('pontos').textContent = pontos;
        alert(`Você descobriu! ${nodes[id].nome} era o fofoqueiro! (+${pontosGanhos} pontos)`);
        nivelAtual++;
        iniciarJogo(nivelAtual);
      } else {
        vidas--;
        document.getElementById('vidas').textContent = vidas;
        if (vidas <= 0) {
          alert(`Fim de jogo! O fofoqueiro era ${nodes[fofoqueiro].nome}.\nPontuação final: ${pontos} pontos`);
          vidas = 3; pontos = 0; nivelAtual = tamanhoInicial;
          document.getElementById('vidas').textContent = vidas;
          document.getElementById('pontos').textContent = pontos;
          iniciarJogo(nivelAtual);
        } else {
          alert('Errou! Tente novamente.');
        }
      }
    };

    // Dica 1: mostrar grafo real e mudar para modo marcação
    document.getElementById('btnDica1').onclick = () => {
      if (!dicaGrafoUsada) {
        dicaGrafoUsada = true;
        modoAtual = 'marcar'; // Mudar para modo marcação
        
        // Limpar arestas do usuário e vértices marcados
        verticesMarcados.clear();
        arestasUsuario.clear();
        svg.selectAll('line.user-link').remove();
        nodeElements.classed('marked', false);
        
        // Mostrar arestas reais do grafo
        linkElements.style('opacity', 1);
        
        // Atualizar texto de instrução
        const box = document.getElementById('infoBox');
        box.innerHTML = `<h3>Versões dos amigos</h3>${montarHtmlVersoes(nodes)}<hr><p><b>Um deles está mentindo... Clique para chutar!</b></p><p><i>Modo: <strong>Marcação</strong> - Shift+clique para marcar vértices</i></p>`;
        box.querySelectorAll('.pessoa-item').forEach(el => {
          el.addEventListener('click', () => window.chutar(Number(el.dataset.id)));
        });
        
        document.getElementById('gameContainer').classList.remove('hidden');
        const grafoElement = document.getElementById('grafo');
        grafoElement.classList.remove('hidden');
        document.getElementById('btnDica1').disabled = true;
        document.getElementById('btnDica2').disabled = false;
        simulation.alpha(1).restart();
        document.getElementById('gameContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Dica 2: confiabilidade (DFS colorido)
    document.getElementById('btnDica2').onclick = () => {
      if (!dicaDistanciaUsada && dicaGrafoUsada) {
        dicaDistanciaUsada = true;
        document.getElementById('btnDica2').disabled = true;
        aplicarDijkstra();
      }
    };

    // aplicarDijkstra (simplificado: DFS com confiabilidade acumulada)
    function aplicarDijkstra() {
      const confiabilidade = Array(currentNodes.length).fill(0);
      confiabilidade[fofoqueiro] = 1.0;
      const visitado = new Set();
      const pilha = [{id: fofoqueiro, conf: 1.0}];
      const ordemVisita = [];
      while (pilha.length > 0) {
        const {id: u, conf: confU} = pilha.pop();
        if (visitado.has(u)) continue;
        visitado.add(u);
        ordemVisita.push(u);
        const vizinhosComConf = [];
        for (const link of currentLinks) {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          let v = null;
          if (sourceId === u) v = targetId; else if (targetId === u) v = sourceId; else continue;
          if (visitado.has(v)) continue;
          const pesoAresta = (currentNodes[u].mentiroso + currentNodes[v].mentiroso) / 2;
          const novaConf = confU * (1 - pesoAresta);
          if (novaConf > confiabilidade[v]) { confiabilidade[v] = novaConf; vizinhosComConf.push({id: v, conf: novaConf}); }
        }
        vizinhosComConf.sort((a,b) => a.conf - b.conf);
        for (const vizinho of vizinhosComConf) pilha.push(vizinho);
      }
      for (let i = 0; i < currentNodes.length; i++) currentNodes[i].confiabilidadeAcumulada = confiabilidade[i] > 0 ? confiabilidade[i] : null;
      let minConf = 1.0, maxConf = 0.0;
      for (let i = 0; i < confiabilidade.length; i++) {
        if (confiabilidade[i] > 0) { minConf = Math.min(minConf, confiabilidade[i]); maxConf = Math.max(maxConf, confiabilidade[i]); }
      }
      function calcularCor(d) {
        const conf = confiabilidade[d.id] || 0;
        if (conf === 0) return '#666';
        
        // Verde (0, 255, 0) para 100% de confiabilidade
        // Vermelho (255, 0, 0) para 50% ou menos de confiabilidade
        let red, green;
        
        if (conf <= 0.5) {
          // 0% a 50%: vermelho puro
          red = 255;
          green = 0;
        } else {
          // 50% a 100%: gradiente de vermelho para verde
          const proporcao = (conf - 0.5) / 0.5; // 0 (em 50%) a 1 (em 100%)
          red = Math.floor(255 * (1 - proporcao));
          green = Math.floor(255 * proporcao);
        }
        
        return `rgb(${red}, ${green}, 0)`;
      }
      const delayPorVertice = 300;
      ordemVisita.forEach((verticeId, index) => {
        setTimeout(() => {
          const d = currentNodes[verticeId];
          const cor = calcularCor(d);
          nodeElements.filter(node => node.id === verticeId).select('circle').transition().duration(500).style('fill', cor).attr('stroke', d.id === fofoqueiro ? '#00aa00' : '#444').attr('stroke-width', d.id === fofoqueiro ? 4 : 2).attr('r', 22).transition().duration(300).attr('r', 18);
        }, index * delayPorVertice);
      });
      setTimeout(() => {
        for (let i = 0; i < currentNodes.length; i++) {
          if (confiabilidade[i] === 0) {
            const d = currentNodes[i];
            nodeElements.filter(node => node.id === i).select('circle').transition().duration(500).style('fill', '#666');
          }
        }
      }, ordemVisita.length * delayPorVertice + 200);
    }

    // fim iniciarJogo
  }

  // Expor algumas funções globalmente
  window.iniciarJogo = iniciarJogo;
  window.marcarVertice = function(id) { marcarVertice(id); };
  window.fecharPopup = function() { fecharPopup(); };
  // chutar já é definido dentro iniciarJogo.
  if (!window.chutar) window.chutar = function(id) { console.warn('chutar não inicializado ainda'); };

  // Iniciar automaticamente após DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Mostrar vidas/pontos iniciais
    const vidasEl = document.getElementById('vidas'); if (vidasEl) vidasEl.textContent = '3';
    const pontosEl = document.getElementById('pontos'); if (pontosEl) pontosEl.textContent = '0';
    iniciarJogo();
  });
})();