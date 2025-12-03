# Descrição do Projeto do Trabalho Final

Disciplina: Algoritmos e Grafos | Professor: Paulo Mann

Alunos:

- Ana Caroline Souza Lira - [@acarolls](https://github.com/acarolls)
- Daniel Goulart Camacho - [@DanielGCG](https://github.com/DanielGCG)
- Fellipe Tambasco Bezerra - [@fellipetb](https://github.com/fellipetb)
- Maria Clara Sales - [@mariLuwai](https://github.com/mariLuwai)
- Tales Calixto de Lima - [@tl1ma](https://github.com/tl1ma)

# Definitivamente-um-Grupo-Alg-Grafos
Projeto de Algoritmos e Grafos


# Jogo da Fofoca – Documentação do Projeto

O nosso projeto consiste em um **“jogo da fofoca”** em que é escolhido um fofoqueiro e, com base nisso, traça-se o caminho da fofoca por um **grafo de amizades**, com a chance de mentirosos pelo caminho e, ao final, todos relatam ao player (isto é, ao jogador) o que ouviram. Ademais, usamos a **busca em largura (BFS)** e a **busca em profundidade (DFS)** para gerar o jogo e desejamos voltar para a origem. (ALTERAR)

---

## 🖥️ Front-end

Nosso front-end, para uma funcional interface viabilizadora de interação do usuário com o sistema, utiliza **HTML** (sigla, em inglês, para “Linguagem de Marcação de Hipertexto”, em português) e **CSS** para ser a linguagem de estilo usada na estilização e organização das páginas da aplicação web.

Nesse contexto, a existência de telas tanto de **login de usuários** quanto de **registro de usuários** na nossa aplicação web ilustram a preocupação com uma representação mais fidedigna na aplicação desenvolvida pelo grupo em relação ao mundo real em si.

Ademais, a seção **“Como jogar?”** possui como principal objetivo explicitar a jogabilidade no jogo em si, sobretudo pensando em jogadores novatos/leigos. Enquanto isso, a seção **“Como funciona?”** objetiva revelar maiores detalhes sobre o funcionamento do jogo propriamente dito.

Ambas as seções foram criadas com o intuito de não só tornar o processo de aprendizagem do jogo mais facilitado, mas também demonstrar a preocupação didático-pedagógica dos desenvolvedores em relação aos eventuais novos jogadores.

Além disso, **“Buscar Jogadores”**, **“Meus Amigos”** e **“Ranking Global”** refletem possibilidades de jogadores interagirem entre si, conforme proposta mais inicial do jogo de englobar grupos de amigos.

Por fim, em **“Jogar Agora”**, o jogador experimenta a possibilidade de estar em um jogo desafiador e, ao mesmo tempo, extremamente divertido, dentro do mundo dos algoritmos e grafos.

---

## ⚙️ Back-end

Nosso back-end, responsável pela implementação da lógica do sistema, é desenvolvido em JavaScript, utilizando também o Node.js.

A lógica do jogo baseia-se em dois algoritmos principais: um para a geração do grafo utilizado nas partidas e outro para a disseminação da fofoca.

Para a geração do grafo, utilizamos o modelo de Barabási–Albert, que segue o princípio da conexão preferencial. Assim, quando um novo nó é inserido na rede, ele tende a se ligar principalmente aos nós que já possuem muitas conexões, resultando em uma estrutura típica de redes livres de escala.

Já para a disseminação da fofoca, empregamos o algoritmo de busca em largura. A partir do nó inicial (o primeiro “fofoqueiro”) o algoritmo percorre os vizinhos em camadas, simulando a propagação da informação pela rede de forma gradual e ordenada, respeitando a sequência natural de alcance dos nós. Para dificultar o jogo, ainda temos os "mentirosos" que não informam a pessoa que informam que outra pessoa os contou a fofoca ao invés da verdadeira. (Em teoria dos grafos, é o mesmo que um vértice mentisse quem é seu pai).

---

## 🎲 Banco de Dados

Nosso banco de dados (BD), para armazenamento das informações utilizadas pelo sistema de forma persistente, utiliza o **MySQL** como sistema de gerenciamento de banco de dados (SGBD), montado a partir da abordagem da modelagem Top-Down, passando pelas fases conceitual, lógica e, por fim, física.

Nessa perspectiva, usamos as tabelas:

- **Usuario**
- **Partida**
- **Amizade**

A tabela **Usuário** armazena as informações de cada jogador _(Nome, senha, token de autenticação, pontuação geral, foto e id)_, a tabela **Amizade** permite o armazenamento de dos pedidos  _(relação unidirecional entre usuários)_ e amizades _(relação bidirecional na tabela)_  e, por fim, a tabela **Partida**, que armazena colunas que são atualizadas em tempo real para permitir o funcionamento da lógica do jogo através dos controladores.

---

