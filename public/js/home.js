// Dados estáticos para demonstração - Futuramente virá da API
const leaderboardData = [
    { rank: 1, name: "FofoqueiroPro", score: 25, avatar: "👑" },
    { rank: 2, name: "MestreDoRumor", score: 24, avatar: "🎯" },
    { rank: 3, name: "ReiFofoca", score: 23, avatar: "⭐" },
    { rank: 4, name: "EspalhadorLegendário", score: 22, avatar: "🔥" },
    { rank: 5, name: "SenhorSegredos", score: 21, avatar: "🎭" }
];

const friendsData = [
    { id: 4, name: "Ana Costa", score: 13, avatar: "🎨", lastSeen: "2h atrás" },
    { id: 5, name: "Carlos Souza", score: 14, avatar: "🎯", lastSeen: "5h atrás" },
    { id: 1, name: "João Silva", score: 10, avatar: "🎮", lastSeen: "Agora" },
    { id: 2, name: "Maria Santos", score: 11, avatar: "🌸", lastSeen: "Agora" },
    { id: 3, name: "Pedro Oliveira", score: 12, avatar: "⚡", lastSeen: "Agora" },
];

/**
 * Renderiza o ranking de jogadores
 */
function renderLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    if (!leaderboardEl) return;

    leaderboardEl.innerHTML = leaderboardData.map(player => {
        let medalClass = '';
        let medal = '';
        
        if (player.rank === 1) {
            medal = '🥇';
            medalClass = 'rank-1';
        } else if (player.rank === 2) {
            medal = '🥈';
            medalClass = 'rank-2';
        } else if (player.rank === 3) {
            medal = '🥉';
            medalClass = 'rank-3';
        } else {
            medal = `${player.rank}º`;
        }

        return `
            <div class="list-group-item leaderboard-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <span class="rank-medal ${medalClass} me-2">${medal}</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${player.avatar} ${player.name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${player.score.toLocaleString()} pontos
                        </small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="viewProfile(${player.rank})" title="Ver Perfil">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Renderiza a lista de amigos
 */
function renderFriendsList() {
    const friendsListEl = document.getElementById('friendsList');
    if (!friendsListEl) return;

    friendsListEl.innerHTML = friendsData.map(friend => {
        return `
            <div class="list-group-item friend-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${friend.avatar} ${friend.name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${friend.score} pts
                        </small>
                    </div>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewProfile(${friend.id})" title="Ver Perfil">
                        <i class="bi bi-person"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Busca usuários por nome
 * TODO: Integrar com API para busca no backend
 */
function searchUsers() {
    const searchInput = document.getElementById('searchUser');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;

    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length < 2) {
        searchResults.innerHTML = '<small class="text-muted d-block text-center py-2">Digite pelo menos 2 caracteres</small>';
        return;
    }

    // TODO: Substituir por chamada à API
    
    searchResults.innerHTML = '<small class="text-muted d-block text-center py-2"><i class="bi bi-hourglass-split"></i> Busca será implementada com a API</small>';
}

/**
 * Adiciona um usuário como amigo
 * TODO: Integrar com API para adicionar amigo
 */
async function addFriend(userId, userName) {
    // TODO: Implementar chamada à API
    // const response = await fetch('/api/friends', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userId })
    // });
    // const result = await response.json();
    
    showNotification(`Funcionalidade será implementada com a API`, 'info');
}

/**
 * Remove um usuário dos amigos
 * TODO: Integrar com API para remover amigo
 */
async function removeFriend(userId, userName) {
    // TODO: Implementar chamada à API
    // const response = await fetch(`/api/friends/${userId}`, {
    //     method: 'DELETE',
    //     headers: { 'Content-Type': 'application/json' }
    // });
    // const result = await response.json();
    
    showNotification(`Funcionalidade será implementada com a API`, 'info');
}

/**
 * Visualiza o perfil de um jogador
 */
function viewProfile(id) {
    const player = leaderboardData.find(p => p.id === id);
    if (player) {
        showNotification(`Perfil de ${player.name} será implementado em breve!`, 'info');
    }
}

/**
 * Exibe notificações toast
 */
function showNotification(message, type = 'info') {
    // Cria um elemento de notificação
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Remove após 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
    }, 4000);
}

/**
 * Adiciona efeito de digitação no campo de busca
 */
function setupSearchDebounce() {
    const searchInput = document.getElementById('searchUser');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(searchUsers, 300);
    });
}

/**
 * Inicializa a página
 */
function initializePage() {
    renderLeaderboard();
    renderFriendsList();
    setupSearchDebounce();
    simulateRealtimeUpdates();
    
    console.log('✅ Página inicial carregada com sucesso!');
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
