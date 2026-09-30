/**
 * ====================================================================
 * BET WARRIORS — SIMULADOR DE APOSTAS COM DINHEIRO FICTÍCIO
 * ====================================================================
 * Arquitetura em JavaScript Puro (Vanilla ES6+)
 * Todas as funções, variáveis e lógica devidamente modularizadas em português.
 * Dinheiro 100% Fictício — Sem transações reais ou dependências externas.
 */

'use strict';

/* ====================================================================
   1. CONFIGURAÇÕES CENTRAIS E PROBABILIDADES
   ==================================================================== */

const CONFIG = {
  saldoInicial: 5000,
  tempoPorDiaSegundos: 120, // 2 minutos por dia

  // Metas financeiras base de cada dia (Índice 1 ao 10)
  metasBase: [
    0,         // Dia 0 (não utilizado)
    10000,     // Dia 1
    20000,     // Dia 2
    35000,     // Dia 3
    60000,     // Dia 4
    100000,    // Dia 5
    180000,    // Dia 6
    300000,    // Dia 7
    500000,    // Dia 8
    750000,    // Dia 9
    1000000    // Dia 10
  ],

  // Dia em que cada jogo é desbloqueado
  desbloqueioJogos: {
    moeda: 1,
    dados: 2,
    roleta: 4,
    highlow: 6,
    minas: 6,
    blackjack: 8,
    crash: 9
  },

  // Centralização de probabilidades e multiplicadores
  jogos: {
    moeda: {
      chanceVitoria: 0.50,
      multiplicador: 1.90
    },
    dados: {
      baixo: { chance: 0.50, multiplicador: 1.90, numeros: [1, 2, 3] },
      alto: { chance: 0.50, multiplicador: 1.90, numeros: [4, 5, 6] },
      exato: { chance: 1 / 6, multiplicador: 5.50 }
    },
    roleta: {
      // Segmentos da roleta da sorte (soma exata de 100%)
      segmentos: [
        { label: 'Perde Tudo', mult: 0.0, prob: 0.20, cor: '#ff3366', textoCor: '#ffffff' },
        { label: 'x0.5', mult: 0.5, prob: 0.20, cor: '#ff9900', textoCor: '#ffffff' },
        { label: 'x1.0', mult: 1.0, prob: 0.25, cor: '#4facfe', textoCor: '#ffffff' },
        { label: 'x1.5', mult: 1.5, prob: 0.15, cor: '#00f2fe', textoCor: '#0b0e14' },
        { label: 'x2.0', mult: 2.0, prob: 0.10, cor: '#00ff88', textoCor: '#0b0e14' },
        { label: 'x3.0', mult: 3.0, prob: 0.05, cor: '#b057ff', textoCor: '#ffffff' },
        { label: 'x5.0', mult: 5.0, prob: 0.03, cor: '#ff00ea', textoCor: '#ffffff' },
        { label: 'x10.0', mult: 10.0, prob: 0.02, cor: '#ffd700', textoCor: '#0b0e14' }
      ]
    },
    highlow: {
      padrao: { multiplicador: 1.80 },
      superHigh: { multiplicador: 3.60, minCarta: 10 }, // 10, J, Q, K (4 em 13)
      superLow: { multiplicador: 3.60, maxCarta: 4 }     // A, 2, 3, 4 (4 em 13)
    },
    blackjack: {
      pagamentoNormal: 2.0,
      pagamentoBlackjack: 2.5,
      pagamentoEmpate: 1.0
    }
  }
};

/* ====================================================================
   2. ESTADO GLOBAL DO JOGO
   ==================================================================== */

const estado = {
  dia: 1,
  saldo: CONFIG.saldoInicial,
  metaAtual: CONFIG.metasBase[1],
  tempoRestante: CONFIG.tempoPorDiaSegundos,
  intervaloTempo: null,
  jogoAtivo: 'moeda',
  emProcessamento: false, // Trava cliques durante animações/rodadas ativas
  partidaAtiva: false,
  somAtivo: true,

  // Estatísticas globais da partida
  estatisticas: {
    totalApostado: 0,
    totalGanho: 0,
    totalPerdido: 0,
    maiorAposta: 0,
    maiorVitoria: 0,
    maiorMultiplicador: 0,
    sequenciaVitorias: 0,
    maxSequenciaVitorias: 0,
    totalApostas: 0
  },

  // Histórico de apostas recentes (máximo de 20)
  historico: [],

  // Estados dos minijogos
  subjogos: {
    moeda: { escolha: 'cara' },
    dados: { tipo: 'baixo', numeroExato: 1 },
    roleta: { anguloAtual: 0, girando: false },
    highlow: { modo: 'std', predicao: 'high', cartaAtual: null },
    minas: {
      ativo: false,
      quantidadeMinas: 3,
      apostaAtual: 0,
      tabuleiro: [], // array com 25 booleanos (true = mina)
      revelados: [], // índices já abertos
      multiplicadorAtual: 1.0
    },
    blackjack: {
      ativo: false,
      apostaAtual: 0,
      baralho: [],
      maoJogador: [],
      maoDealer: [],
      dealerOculto: true
    },
    crash: {
      ativo: false,
      apostaAtual: 0,
      pontoCrash: 1.0,
      multiplicadorAtual: 1.0,
      sacou: false,
      animacaoId: null,
      tempoInicio: 0
    }
  }
};

/* ====================================================================
   3. SÍNTESE DE ÁUDIO WEB (EFEITOS SONOROS 100% OFFLINE / AUTO-SUFICIENTES)
   ==================================================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tocarSom(tipo) {
    if (!estado.somAtivo) return;
    this.init();
    if (!this.ctx) return;

    try {
      const agora = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      switch (tipo) {
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, agora);
          osc.frequency.exponentialRampToValueAtTime(800, agora + 0.05);
          gain.gain.setValueAtTime(0.15, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.05);
          osc.start(agora);
          osc.stop(agora + 0.05);
          break;

        case 'aposta':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(350, agora);
          osc.frequency.exponentialRampToValueAtTime(520, agora + 0.08);
          gain.gain.setValueAtTime(0.2, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.08);
          osc.start(agora);
          osc.stop(agora + 0.08);
          break;

        case 'vitoria':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, agora); // C5
          osc.frequency.setValueAtTime(659.25, agora + 0.1); // E5
          osc.frequency.setValueAtTime(783.99, agora + 0.2); // G5
          osc.frequency.setValueAtTime(1046.50, agora + 0.3); // C6
          gain.gain.setValueAtTime(0.25, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.55);
          osc.start(agora);
          osc.stop(agora + 0.55);
          break;

        case 'derrota':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(260, agora);
          osc.frequency.exponentialRampToValueAtTime(110, agora + 0.35);
          gain.gain.setValueAtTime(0.25, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.35);
          osc.start(agora);
          osc.stop(agora + 0.35);
          break;

        case 'moeda':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, agora);
          osc.frequency.exponentialRampToValueAtTime(1800, agora + 0.07);
          gain.gain.setValueAtTime(0.12, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.07);
          osc.start(agora);
          osc.stop(agora + 0.07);
          break;

        case 'dado':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(280, agora);
          osc.frequency.exponentialRampToValueAtTime(180, agora + 0.06);
          gain.gain.setValueAtTime(0.2, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.06);
          osc.start(agora);
          osc.stop(agora + 0.06);
          break;

        case 'tick':
          osc.type = 'square';
          osc.frequency.setValueAtTime(900, agora);
          gain.gain.setValueAtTime(0.05, agora);
          gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.03);
          osc.start(agora);
          osc.stop(agora + 0.03);
          break;

        case 'diamante':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, agora);
          osc.frequency.exponentialRampToValueAtTime(1760, agora + 0.15);
          gain.gain.setValueAtTime(0.25, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.15);
          osc.start(agora);
          osc.stop(agora + 0.15);
          break;

        case 'explosao':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, agora);
          osc.frequency.exponentialRampToValueAtTime(40, agora + 0.45);
          gain.gain.setValueAtTime(0.35, agora);
          gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.45);
          osc.start(agora);
          osc.stop(agora + 0.45);
          break;

        case 'fanfarra':
          const notas = [523, 659, 783, 1046, 1318];
          notas.forEach((freq, idx) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g);
            g.connect(this.ctx.destination);
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, agora + idx * 0.12);
            g.gain.setValueAtTime(0.25, agora + idx * 0.12);
            g.gain.exponentialRampToValueAtTime(0.01, agora + idx * 0.12 + 0.35);
            o.start(agora + idx * 0.12);
            o.stop(agora + idx * 0.12 + 0.35);
          });
          break;
      }
    } catch (e) {
      console.warn('Áudio não inicializado:', e);
    }
  }
}

const audio = new AudioEngine();

/* ====================================================================
   4. FUNÇÕES DE VALIDAÇÃO E CÁLCULO DE METAS
   ==================================================================== */

/**
 * Valida se as probabilidades de cada jogo somam 100% (1.0).
 */
function validarProbabilidades() {
  let valida = true;

  // 1. Cara ou Coroa
  if (CONFIG.jogos.moeda.chanceVitoria !== 0.50) {
    console.error('Validação: Chance de Cara ou Coroa deve ser 50%');
    valida = false;
  }

  // 2. Roda da Sorte
  const somaRoleta = CONFIG.jogos.roleta.segmentos.reduce((acc, seg) => acc + seg.prob, 0);
  if (Math.abs(somaRoleta - 1.0) > 0.0001) {
    console.error(`Validação: Soma das probabilidades da Roleta deve ser 100%. Atual: ${(somaRoleta * 100).toFixed(2)}%`);
    valida = false;
  }

  // 3. Dados
  if (CONFIG.jogos.dados.baixo.chance !== 0.50 || CONFIG.jogos.dados.alto.chance !== 0.50) {
    console.error('Validação: Chances dos dados baixo/alto devem ser 50%');
    valida = false;
  }

  if (valida) {
    console.log('✅ BET WARRIORS: Todas as probabilidades dos 7 jogos foram validadas com sucesso (100%).');
  }
  return valida;
}

/**
 * Calcula a meta do próximo dia baseando-se no percentual de lucro excedente
 * sobre a meta do dia anterior, conforme a fórmula da especificação:
 * novaMeta = metaBaseDoProximoDia * (1 + percentualExcedente)
 */
function calcularNovaMeta(diaAtual, saldoFinal, metaDiaAtual) {
  const proximoDia = diaAtual + 1;
  if (proximoDia > 10) return CONFIG.metasBase[10];

  const metaBaseProximoDia = CONFIG.metasBase[proximoDia];

  if (saldoFinal > metaDiaAtual) {
    const lucroExcedente = saldoFinal - metaDiaAtual;
    const percentualExcedente = lucroExcedente / metaDiaAtual;
    const novaMeta = Math.round(metaBaseProximoDia * (1 + percentualExcedente));
    return novaMeta;
  }

  return metaBaseProximoDia;
}

/* ====================================================================
   5. FORMATAÇÃO E INTERFACE (UI)
   ==================================================================== */

/**
 * Formata valores monetários em formato brasileiro (R$ 10.000,00)
 */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Atualiza todos os elementos visuais do HUD, progresso, saldo e estatísticas.
 */
function atualizarInterface() {
  // 1. HUD Central
  const hudDia = document.getElementById('hud-dia');
  const hudSaldo = document.getElementById('hud-saldo');
  const hudMeta = document.getElementById('hud-meta');
  const hudFalta = document.getElementById('hud-falta-ou-excesso');
  const betAvail = document.getElementById('bet-available-balance');

  if (hudDia) hudDia.textContent = `DIA ${estado.dia}`;
  if (hudSaldo) hudSaldo.textContent = formatarMoeda(estado.saldo);
  if (hudMeta) hudMeta.textContent = formatarMoeda(estado.metaAtual);
  if (betAvail) betAvail.textContent = formatarMoeda(estado.saldo);

  // Diferença até a meta
  if (hudFalta) {
    if (estado.saldo >= estado.metaAtual) {
      const excedente = estado.saldo - estado.metaAtual;
      hudFalta.innerHTML = `<span class="neon-green">Excedente: +${formatarMoeda(excedente)}</span>`;
    } else {
      const falta = estado.metaAtual - estado.saldo;
      hudFalta.textContent = `Faltam: ${formatarMoeda(falta)}`;
    }
  }

  // 2. Barra de Progresso
  const progPercentage = document.getElementById('prog-percentage');
  const progressFill = document.getElementById('progress-fill');
  if (progPercentage && progressFill) {
    const pct = Math.min(100, Math.max(0, (estado.saldo / estado.metaAtual) * 100));
    progPercentage.textContent = `${pct.toFixed(1)}%`;
    progressFill.style.width = `${pct}%`;
  }

  // 3. Botão Avançar Dia
  const btnAdvance = document.getElementById('btn-advance-day');
  if (btnAdvance) {
    if (estado.saldo >= estado.metaAtual) {
      btnAdvance.classList.remove('disabled');
      btnAdvance.removeAttribute('disabled');
    } else {
      btnAdvance.classList.add('disabled');
      btnAdvance.setAttribute('disabled', 'true');
    }
  }

  // 4. Estatísticas
  atualizarEstatisticasUI();

  // 5. Desbloqueio dos Jogos
  desbloquearJogos();
}

/**
 * Atualiza o painel de estatísticas na sidebar
 */
function atualizarEstatisticasUI() {
  const mapStats = {
    'stat-total-apostado': formatarMoeda(estado.estatisticas.totalApostado),
    'stat-total-ganho': formatarMoeda(estado.estatisticas.totalGanho),
    'stat-total-perdido': formatarMoeda(estado.estatisticas.totalPerdido),
    'stat-maior-aposta': formatarMoeda(estado.estatisticas.maiorAposta),
    'stat-maior-vitoria': formatarMoeda(estado.estatisticas.maiorVitoria),
    'stat-maior-mult': `x${estado.estatisticas.maiorMultiplicador.toFixed(2)}`,
    'stat-win-streak': estado.estatisticas.sequenciaVitorias,
    'stat-max-streak': estado.estatisticas.maxSequenciaVitorias
  };

  for (const [id, val] of Object.entries(mapStats)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

/**
 * Atualiza o indicador visual temporário de ganho/perda de saldo
 */
function animarMudancaSaldo(valor, ehGanho) {
  const el = document.getElementById('balance-change');
  if (!el) return;

  el.textContent = `${ehGanho ? '+' : '-'}${formatarMoeda(Math.abs(valor))}`;
  el.className = `balance-change-indicator ${ehGanho ? 'plus' : 'minus'}`;

  setTimeout(() => {
    el.className = 'balance-change-indicator';
  }, 1200);
}

/**
 * Exibe notificação toast do resultado da aposta
 */
function exibirFeedbackRodada(mensagem, ehGanho, icone = '🎉') {
  const toast = document.getElementById('round-feedback-toast');
  const toastText = document.getElementById('feedback-text');
  const toastIcon = document.getElementById('feedback-icon');
  if (!toast) return;

  toast.className = `round-feedback-toast ${ehGanho ? 'win' : 'loss'}`;
  toastText.textContent = mensagem;
  toastIcon.textContent = icone;

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

/**
 * Registra aposta no histórico (limite de 20 entradas)
 */
function registrarHistorico(nomeJogo, valorApostado, ehVitoria, retorno, multiplicador) {
  const lucroOuPerda = ehVitoria ? (retorno - valorApostado) : -valorApostado;

  const item = {
    jogo: nomeJogo,
    aposta: valorApostado,
    vitoria: ehVitoria,
    lucro: lucroOuPerda,
    mult: multiplicador,
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  estado.historico.unshift(item);
  if (estado.historico.length > 20) {
    estado.historico.pop();
  }

  // Atualiza painel do histórico
  const listEl = document.getElementById('history-list');
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `${estado.historico.length}/20`;

  if (listEl) {
    listEl.innerHTML = '';
    estado.historico.forEach(h => {
      const card = document.createElement('div');
      card.className = `history-card-item ${h.vitoria ? 'win' : 'loss'}`;
      card.innerHTML = `
        <div class="history-top-line">
          <span class="history-game-name">${h.vitoria ? '🟢' : '🔴'} ${h.jogo}</span>
          <span class="history-profit ${h.vitoria ? 'neon-green' : 'neon-red'}">
            ${h.vitoria ? '+' : ''}${formatarMoeda(h.lucro)}
          </span>
        </div>
        <div class="history-bottom-line">
          <span>Aposta: ${formatarMoeda(h.aposta)} (x${h.mult.toFixed(2)})</span>
          <span>${h.hora}</span>
        </div>
      `;
      listEl.appendChild(card);
    });
  }
}

/**
 * Controla e atualiza o estado de bloqueio das abas dos jogos
 */
function desbloquearJogos() {
  const dia = estado.dia;

  for (const [chaveJogo, diaLiberado] of Object.entries(CONFIG.desbloqueioJogos)) {
    const tabBtn = document.getElementById(`tab-${chaveJogo}`);
    const badgeEl = document.getElementById(`badge-${chaveJogo}`);
    const liberado = dia >= diaLiberado;

    if (tabBtn) {
      if (liberado) {
        tabBtn.classList.remove('locked');
        if (badgeEl) {
          badgeEl.textContent = 'LIVRE';
          badgeEl.className = 'tab-badge free';
        }
      } else {
        tabBtn.classList.add('locked');
        if (badgeEl) {
          badgeEl.textContent = `🔒 DIA ${diaLiberado}`;
          badgeEl.className = 'tab-badge';
        }
      }
    }
  }

  // Verifica se a tela atual está bloqueada
  verificarOverlayJogoBloqueado();
}

/**
 * Mostra ou oculta o overlay caso o usuário tente selecionar um jogo travado
 */
function verificarOverlayJogoBloqueado() {
  const diaLiberado = CONFIG.desbloqueioJogos[estado.jogoAtivo] || 1;
  const overlay = document.getElementById('game-locked-overlay');
  const title = document.getElementById('locked-title');
  const desc = document.getElementById('locked-desc');

  if (estado.dia < diaLiberado) {
    if (overlay) overlay.classList.remove('hidden');
    if (title) title.textContent = 'JOGO BLOQUEADO';
    if (desc) desc.textContent = `Este modo será desbloqueado no Dia ${diaLiberado}.`;
  } else {
    if (overlay) overlay.classList.add('hidden');
  }
}

/* ====================================================================
   6. CRONÔMETRO E FLUXO DE DIAS (LIFECYCLE)
   ==================================================================== */

/**
 * Inicia o cronômetro regressivo do dia atual
 */
function iniciarCronometro() {
  if (estado.intervaloTempo) {
    clearInterval(estado.intervaloTempo);
  }

  const hudTempo = document.getElementById('hud-tempo');
  const timerBarFill = document.getElementById('timer-bar-fill');
  const timerBox = document.getElementById('timer-box');

  estado.intervaloTempo = setInterval(() => {
    if (!estado.partidaAtiva) return;

    estado.tempoRestante--;

    const minutos = Math.floor(estado.tempoRestante / 60);
    const segundos = estado.tempoRestante % 60;
    const formatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

    if (hudTempo) hudTempo.textContent = formatado;

    if (timerBarFill) {
      const pct = (estado.tempoRestante / CONFIG.tempoPorDiaSegundos) * 100;
      timerBarFill.style.width = `${pct}%`;
    }

    if (timerBox) {
      if (estado.tempoRestante <= 20) {
        timerBox.classList.add('warning');
        if (estado.tempoRestante <= 5 && estado.tempoRestante > 0) {
          audio.tocarSom('tick');
        }
      } else {
        timerBox.classList.remove('warning');
      }
    }

    // Fim do tempo do dia
    if (estado.tempoRestante <= 0) {
      clearInterval(estado.intervaloTempo);
      finalizarDiaPorTempo();
    }
  }, 1000);
}

/**
 * Finaliza o dia quando o tempo acaba ou o jogador avança voluntariamente
 */
function finalizarDiaPorTempo() {
  if (estado.saldo >= estado.metaAtual) {
    avancarDia();
  } else {
    derrotaPorMetaNaoAlcancada('O tempo limite de 2 minutos se esgotou e você não atingiu a meta.');
  }
}

/**
 * Avança com sucesso para o próximo dia ou declara vitória final no Dia 10
 */
function avancarDia() {
  if (estado.dia === 10) {
    // VITÓRIA TOTAL NO DIA 10
    vitoriaFinal();
    return;
  }

  const saldoFinalDia = estado.saldo;
  const metaCumprida = estado.metaAtual;
  const diaConcluido = estado.dia;

  // Cálculo da nova meta dinâmica
  const novaMeta = calcularNovaMeta(diaConcluido, saldoFinalDia, metaCumprida);
  const proximoDia = diaConcluido + 1;
  const metaBaseProximo = CONFIG.metasBase[proximoDia];

  // Identifica se há novo jogo desbloqueado
  let novoDesbloqueio = null;
  for (const [jogo, diaUnlock] of Object.entries(CONFIG.desbloqueioJogos)) {
    if (diaUnlock === proximoDia) {
      novoDesbloqueio = jogo.toUpperCase();
    }
  }

  // Preenche dados do modal de vitória de fase
  const modalDayWin = document.getElementById('modal-day-win');
  const title = document.getElementById('day-win-title');
  const sSaldo = document.getElementById('day-win-saldo');
  const sMetaAntiga = document.getElementById('day-win-meta-antiga');
  const sExcesso = document.getElementById('day-win-excesso');
  const sProxMeta = document.getElementById('day-win-proxima-meta');
  const sCalcHint = document.getElementById('day-win-meta-calc-hint');
  const alertUnlock = document.getElementById('day-win-unlock-alert');
  const textUnlock = document.getElementById('day-win-unlock-text');

  if (title) title.textContent = `DIA ${diaConcluido} CONCLUÍDO COM SUCESSO!`;
  if (sSaldo) sSaldo.textContent = formatarMoeda(saldoFinalDia);
  if (sMetaAntiga) sMetaAntiga.textContent = formatarMoeda(metaCumprida);

  const excedente = saldoFinalDia - metaCumprida;
  const pctExcedente = (excedente / metaCumprida) * 100;
  if (sExcesso) {
    sExcesso.textContent = `+${formatarMoeda(excedente)} (+${pctExcedente.toFixed(1)}%)`;
  }

  if (sProxMeta) sProxMeta.textContent = formatarMoeda(novaMeta);
  if (sCalcHint) {
    sCalcHint.textContent = `Meta Base do Dia ${proximoDia} (${formatarMoeda(metaBaseProximo)}) + ${pctExcedente.toFixed(1)}% dinâmico`;
  }

  if (alertUnlock && textUnlock) {
    if (novoDesbloqueio) {
      alertUnlock.classList.remove('hidden');
      textUnlock.textContent = `Novo jogo liberado para o Dia ${proximoDia}: ${novoDesbloqueio}!`;
    } else {
      alertUnlock.classList.add('hidden');
    }
  }

  // Atualiza estado para o próximo dia
  estado.dia = proximoDia;
  estado.metaAtual = novaMeta;
  estado.tempoRestante = CONFIG.tempoPorDiaSegundos;

  audio.tocarSom('fanfarra');
  if (modalDayWin) modalDayWin.classList.remove('hidden');
}

/**
 * Inicia a próxima fase após fechar o modal de vitória
 */
function iniciarProximoDia() {
  const modalDayWin = document.getElementById('modal-day-win');
  if (modalDayWin) modalDayWin.classList.add('hidden');

  atualizarInterface();
  iniciarCronometro();
}

/**
 * Derrota: abre o modal de derrota e reseta cronômetros
 */
function derrotaPorMetaNaoAlcancada(motivo = 'Você não conseguiu alcançar a meta do dia.') {
  if (estado.intervaloTempo) clearInterval(estado.intervaloTempo);
  estado.partidaAtiva = false;

  audio.tocarSom('derrota');

  const modal = document.getElementById('modal-game-over');
  const txtReason = document.getElementById('defeat-reason-text');
  const txtSaldo = document.getElementById('defeat-saldo');
  const txtMeta = document.getElementById('defeat-meta');
  const txtDia = document.getElementById('defeat-dia');

  if (txtReason) txtReason.textContent = motivo;
  if (txtSaldo) txtSaldo.textContent = formatarMoeda(estado.saldo);
  if (txtMeta) txtMeta.textContent = formatarMoeda(estado.metaAtual);
  if (txtDia) txtDia.textContent = `Dia ${estado.dia} / 10`;

  if (modal) modal.classList.remove('hidden');
}

/**
 * Vitória final no Dia 10
 */
function vitoriaFinal() {
  if (estado.intervaloTempo) clearInterval(estado.intervaloTempo);
  estado.partidaAtiva = false;

  audio.tocarSom('fanfarra');

  const modal = document.getElementById('modal-victory');
  const sFinal = document.getElementById('vstat-saldo-final');
  const sApostas = document.getElementById('vstat-total-apostas');
  const sMaiorVit = document.getElementById('vstat-maior-vitoria');
  const sMaiorMult = document.getElementById('vstat-maior-mult');

  if (sFinal) sFinal.textContent = formatarMoeda(estado.saldo);
  if (sApostas) sApostas.textContent = String(estado.estatisticas.totalApostas);
  if (sMaiorVit) sMaiorVit.textContent = formatarMoeda(estado.estatisticas.maiorVitoria);
  if (sMaiorMult) sMaiorMult.textContent = `x${estado.estatisticas.maiorMultiplicador.toFixed(2)}`;

  if (modal) modal.classList.remove('hidden');
}

/**
 * Reinicia completamente o jogo para o Dia 1
 */
function reiniciarJogo() {
  if (estado.intervaloTempo) clearInterval(estado.intervaloTempo);

  // Cancela minijogos em andamento se houver
  if (estado.subjogos.crash.animacaoId) {
    cancelAnimationFrame(estado.subjogos.crash.animacaoId);
  }

  estado.dia = 1;
  estado.saldo = CONFIG.saldoInicial;
  estado.metaAtual = CONFIG.metasBase[1];
  estado.tempoRestante = CONFIG.tempoPorDiaSegundos;
  estado.jogoAtivo = 'moeda';
  estado.emProcessamento = false;
  estado.partidaAtiva = true;
  estado.historico = [];

  estado.estatisticas = {
    totalApostado: 0,
    totalGanho: 0,
    totalPerdido: 0,
    maiorAposta: 0,
    maiorVitoria: 0,
    maiorMultiplicador: 0,
    sequenciaVitorias: 0,
    maxSequenciaVitorias: 0,
    totalApostas: 0
  };

  // Fecha modais
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));

  // Seleciona aba moeda
  selecionarAbaJogo('moeda');

  // Atualiza UI e inicia timer
  atualizarInterface();
  iniciarCronometro();

  // Reinicia estado visual dos jogos
  resetarVisualJogos();

  exibirFeedbackRodada('Partida reiniciada! Boa sorte no Dia 1.', true, '⚡');
}

/* ====================================================================
   7. SISTEMA UNIVERSAL DE APOSTAS
   ==================================================================== */

/**
 * Obtém o valor configurado no campo de aposta com validação rigorosa
 */
function obterValorAposta() {
  const input = document.getElementById('input-bet-amount');
  if (!input) return 0;

  let val = Math.floor(Number(input.value));
  if (isNaN(val) || val <= 0) {
    val = 1;
  }
  if (val > estado.saldo) {
    val = estado.saldo;
  }
  input.value = val;
  return val;
}

/**
 * Processa o débito da aposta e atualiza as estatísticas
 */
function debitarAposta(valor) {
  if (valor > estado.saldo || valor <= 0) return false;

  estado.saldo -= valor;
  estado.estatisticas.totalApostado += valor;
  estado.estatisticas.totalApostas++;
  if (valor > estado.estatisticas.maiorAposta) {
    estado.estatisticas.maiorAposta = valor;
  }

  audio.tocarSom('aposta');
  animarMudancaSaldo(valor, false);
  atualizarInterface();
  return true;
}

/**
 * Processa o pagamento de uma vitória
 */
function creditarVitoria(valorGanho, multiplicador, nomeJogo, valorApostado) {
  estado.saldo += valorGanho;
  estado.estatisticas.totalGanho += valorGanho;
  estado.estatisticas.sequenciaVitorias++;
  if (estado.estatisticas.sequenciaVitorias > estado.estatisticas.maxSequenciaVitorias) {
    estado.estatisticas.maxSequenciaVitorias = estado.estatisticas.sequenciaVitorias;
  }

  const lucro = valorGanho - valorApostado;
  if (lucro > estado.estatisticas.maiorVitoria) {
    estado.estatisticas.maiorVitoria = lucro;
  }
  if (multiplicador > estado.estatisticas.maiorMultiplicador) {
    estado.estatisticas.maiorMultiplicador = multiplicador;
  }

  audio.tocarSom('vitoria');
  animarMudancaSaldo(valorGanho, true);
  registrarHistorico(nomeJogo, valorApostado, true, valorGanho, multiplicador);
  exibirFeedbackRodada(`VOCÊ GANHOU +${formatarMoeda(valorGanho)} (x${multiplicador.toFixed(2)})!`, true, '🎉');
  atualizarInterface();
}

/**
 * Processa uma derrota na aposta
 */
function registrarDerrota(nomeJogo, valorApostado, multiplicador = 0) {
  estado.estatisticas.totalPerdido += valorApostado;
  estado.estatisticas.sequenciaVitorias = 0;

  audio.tocarSom('derrota');
  registrarHistorico(nomeJogo, valorApostado, false, 0, multiplicador);
  exibirFeedbackRodada(`VOCÊ PERDEU -${formatarMoeda(valorApostado)}`, false, '💀');
  atualizarInterface();

  // Verifica se o saldo zerou
  if (estado.saldo <= 0) {
    derrotaPorMetaNaoAlcancada('Seu saldo fictício foi completamente zerado!');
  }
}

/* ====================================================================
   8. MINIJOGOS (1 A 7)
   ==================================================================== */

/* ---------------- JOGO 1: CARA OU COROA ---------------- */
function jogarCaraOuCoroa() {
  if (estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  estado.emProcessamento = true;
  debitarAposta(aposta);

  const coinEl = document.getElementById('coin-element');
  const labelEl = document.getElementById('coin-result-label');
  const btnPlay = document.getElementById('btn-play-moeda');
  if (btnPlay) btnPlay.disabled = true;

  if (labelEl) labelEl.textContent = 'GIRANDO MOEDA NO AR...';
  audio.tocarSom('moeda');

  // Sorteio: 50% Cara, 50% Coroa
  const resultadoSorteado = Math.random() < 0.5 ? 'cara' : 'coroa';
  const escolhaJogador = estado.subjogos.moeda.escolha;

  if (coinEl) {
    coinEl.classList.remove('flipping');
    void coinEl.offsetWidth; // Trigger reflow
    coinEl.classList.add('flipping');
  }

  setTimeout(() => {
    if (coinEl) {
      coinEl.classList.remove('flipping');
      coinEl.style.transform = resultadoSorteado === 'cara' ? 'rotateY(0deg)' : 'rotateY(180deg)';
    }

    const ehVitoria = resultadoSorteado === escolhaJogador;
    const mult = CONFIG.jogos.moeda.multiplicador;

    if (ehVitoria) {
      const ganho = Math.round(aposta * mult);
      if (labelEl) labelEl.innerHTML = `RESULTADO: <strong class="neon-green">${resultadoSorteado.toUpperCase()}</strong> — VOCÊ VENCEU!`;
      creditarVitoria(ganho, mult, 'Cara ou Coroa', aposta);
    } else {
      if (labelEl) labelEl.innerHTML = `RESULTADO: <strong class="neon-red">${resultadoSorteado.toUpperCase()}</strong> — DEU ${resultadoSorteado.toUpperCase()}!`;
      registrarDerrota('Cara ou Coroa', aposta, 0);
    }

    if (btnPlay) btnPlay.disabled = false;
    estado.emProcessamento = false;
  }, 1600);
}

/* ---------------- JOGO 2: DADOS ---------------- */
function jogarDados() {
  if (estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  estado.emProcessamento = true;
  debitarAposta(aposta);

  const diceEl = document.getElementById('dice-element');
  const labelEl = document.getElementById('dice-result-label');
  const btnPlay = document.getElementById('btn-play-dados');
  if (btnPlay) btnPlay.disabled = true;

  if (labelEl) labelEl.textContent = 'ROLANDO OS DADOS NA MESA...';
  audio.tocarSom('dado');

  // Sorteio de 1 a 6 com distribuição perfeitamente uniforme
  const resultado = Math.floor(Math.random() * 6) + 1;

  if (diceEl) {
    diceEl.classList.remove('rolling');
    void diceEl.offsetWidth;
    diceEl.classList.add('rolling');
  }

  setTimeout(() => {
    if (diceEl) {
      diceEl.classList.remove('rolling');
      const rotacaoFaces = {
        1: 'rotateY(0deg) rotateX(0deg)',
        2: 'rotateY(-90deg)',
        3: 'rotateY(-180deg)',
        4: 'rotateY(90deg)',
        5: 'rotateX(-90deg)',
        6: 'rotateX(90deg)'
      };
      diceEl.style.transform = rotacaoFaces[resultado];
    }

    const tipo = estado.subjogos.dados.tipo;
    let ehVitoria = false;
    let mult = 1.90;

    if (tipo === 'baixo' && resultado >= 1 && resultado <= 3) {
      ehVitoria = true;
      mult = CONFIG.jogos.dados.baixo.multiplicador;
    } else if (tipo === 'alto' && resultado >= 4 && resultado <= 6) {
      ehVitoria = true;
      mult = CONFIG.jogos.dados.alto.multiplicador;
    } else if (tipo === 'exato' && resultado === estado.subjogos.dados.numeroExato) {
      ehVitoria = true;
      mult = CONFIG.jogos.dados.exato.multiplicador;
    }

    if (ehVitoria) {
      const ganho = Math.round(aposta * mult);
      if (labelEl) labelEl.innerHTML = `CAIU: <strong class="neon-green">${resultado}</strong> — PARABÉNS!`;
      creditarVitoria(ganho, mult, 'Dados', aposta);
    } else {
      if (labelEl) labelEl.innerHTML = `CAIU: <strong class="neon-red">${resultado}</strong> — NÃO FOI DESSA VEZ!`;
      registrarDerrota('Dados', aposta, 0);
    }

    if (btnPlay) btnPlay.disabled = false;
    estado.emProcessamento = false;
  }, 1400);
}

/* ---------------- JOGO 3: RODA DA SORTE (CANVAS) ---------------- */
function desenharRoleta() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const segs = CONFIG.jogos.roleta.segmentos;
  const total = segs.length;
  const arc = (2 * Math.PI) / total;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 8;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  segs.forEach((seg, i) => {
    const angulo = i * arc;
    ctx.beginPath();
    ctx.fillStyle = seg.cor;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angulo, angulo + arc);
    ctx.lineTo(cx, cy);
    ctx.fill();
    ctx.strokeStyle = '#0e1320';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Texto
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angulo + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = seg.textoCor;
    ctx.font = 'bold 15px Orbitron, sans-serif';
    ctx.fillText(seg.label, r - 20, 5);
    ctx.restore();
  });
}

function jogarRoleta() {
  if (estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  estado.emProcessamento = true;
  debitarAposta(aposta);

  const canvas = document.getElementById('wheel-canvas');
  const labelEl = document.getElementById('wheel-result-label');
  const btnPlay = document.getElementById('btn-play-roleta');
  if (btnPlay) btnPlay.disabled = true;

  if (labelEl) labelEl.textContent = 'RODANDO A RODA DA SORTE...';

  // Sorteio ponderado pelas probabilidades configuradas
  const rand = Math.random();
  let acumulado = 0;
  let indiceSorteado = 0;
  const segs = CONFIG.jogos.roleta.segmentos;

  for (let i = 0; i < segs.length; i++) {
    acumulado += segs[i].prob;
    if (rand <= acumulado) {
      indiceSorteado = i;
      break;
    }
  }

  const numSegmentos = segs.length;
  const anguloPorSegmento = 360 / numSegmentos;
  // O ponteiro fica no topo (270 graus ou -90 graus)
  const anguloAlvo = (360 - (indiceSorteado * anguloPorSegmento + anguloPorSegmento / 2) + 270) % 360;
  const voltasCompletas = 5 * 360; // 5 voltas
  const anguloFinal = voltasCompletas + anguloAlvo;

  let tickInterval = setInterval(() => {
    audio.tocarSom('tick');
  }, 180);

  if (canvas) {
    canvas.style.transition = 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)';
    canvas.style.transform = `rotate(${anguloFinal}deg)`;
  }

  setTimeout(() => {
    clearInterval(tickInterval);
    const resultado = segs[indiceSorteado];
    const mult = resultado.mult;

    if (mult > 0) {
      const ganho = Math.round(aposta * mult);
      if (labelEl) labelEl.innerHTML = `PAROU EM: <strong class="neon-green">${resultado.label}</strong>!`;
      creditarVitoria(ganho, mult, 'Roda da Sorte', aposta);
    } else {
      if (labelEl) labelEl.innerHTML = `PAROU EM: <strong class="neon-red">${resultado.label}</strong>!`;
      registrarDerrota('Roda da Sorte', aposta, 0);
    }

    if (btnPlay) btnPlay.disabled = false;
    estado.emProcessamento = false;

    // Reseta rotação para próximas rodadas sem salto visual
    setTimeout(() => {
      if (canvas) {
        canvas.style.transition = 'none';
        canvas.style.transform = `rotate(${anguloAlvo}deg)`;
      }
    }, 500);
  }, 4500);
}

/* ---------------- JOGO 4: HIGH / LOW ---------------- */
const NAIPES = ['♠', '♥', '♦', '♣'];
const NOMES_CARTAS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function gerarCartaAleatoria() {
  const valor = Math.floor(Math.random() * 13) + 1; // 1 a 13
  const naipe = NAIPES[Math.floor(Math.random() * NAIPES.length)];
  return { valor, naipe, ehVermelho: naipe === '♥' || naipe === '♦' };
}

function renderizarCarta(elId, carta, oculta = false) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (oculta) {
    el.className = 'playing-card card-back';
    el.innerHTML = '<div class="card-back-pattern">?</div>';
    return;
  }

  const nome = NOMES_CARTAS[carta.valor] || carta.valor;
  el.className = `playing-card ${carta.ehVermelho ? 'red-suit' : ''}`;
  el.innerHTML = `
    <div class="card-corner top-left"><span class="c-val">${nome}</span><span class="c-suit">${carta.naipe}</span></div>
    <div class="card-center-art">${carta.naipe}</div>
    <div class="card-corner bottom-right"><span class="c-val">${nome}</span><span class="c-suit">${carta.naipe}</span></div>
  `;
}

function jogarHighLow() {
  if (estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  estado.emProcessamento = true;
  debitarAposta(aposta);

  const labelEl = document.getElementById('hl-result-label');
  const btnPlay = document.getElementById('btn-play-highlow');
  if (btnPlay) btnPlay.disabled = true;

  if (labelEl) labelEl.textContent = 'REVELANDO A PRÓXIMA CARTA...';
  audio.tocarSom('moeda');

  const cartaAtual = estado.subjogos.highlow.cartaAtual;
  let proximaCarta = gerarCartaAleatoria();
  while (proximaCarta.valor === cartaAtual.valor && proximaCarta.naipe === cartaAtual.naipe) {
    proximaCarta = gerarCartaAleatoria();
  }

  renderizarCarta('hl-card-next', proximaCarta, false);

  setTimeout(() => {
    const modo = estado.subjogos.highlow.modo;
    const predicao = estado.subjogos.highlow.predicao;
    let ehVitoria = false;
    let mult = 1.80;

    if (modo === 'std') {
      mult = CONFIG.jogos.highlow.padrao.multiplicador;
      if (predicao === 'high' && proximaCarta.valor > cartaAtual.valor) {
        ehVitoria = true;
      } else if (predicao === 'low' && proximaCarta.valor < cartaAtual.valor) {
        ehVitoria = true;
      }
    } else {
      // Modo Higher Risk
      if (predicao === 'super_high' && proximaCarta.valor >= CONFIG.jogos.highlow.superHigh.minCarta) {
        ehVitoria = true;
        mult = CONFIG.jogos.highlow.superHigh.multiplicador;
      } else if (predicao === 'super_low' && proximaCarta.valor <= CONFIG.jogos.highlow.superLow.maxCarta) {
        ehVitoria = true;
        mult = CONFIG.jogos.highlow.superLow.multiplicador;
      }
    }

    if (ehVitoria) {
      const ganho = Math.round(aposta * mult);
      if (labelEl) labelEl.innerHTML = `PARABÉNS! PREVISÃO CORRETA COM <strong class="neon-green">${NOMES_CARTAS[proximaCarta.valor] || proximaCarta.valor} ${proximaCarta.naipe}</strong>!`;
      creditarVitoria(ganho, mult, 'High/Low', aposta);
    } else {
      if (labelEl) labelEl.innerHTML = `ERROU! A CARTA FOI <strong class="neon-red">${NOMES_CARTAS[proximaCarta.valor] || proximaCarta.valor} ${proximaCarta.naipe}</strong>!`;
      registrarDerrota('High/Low', aposta, 0);
    }

    // A próxima carta passa a ser a atual para a próxima rodada
    setTimeout(() => {
      estado.subjogos.highlow.cartaAtual = proximaCarta;
      renderizarCarta('hl-card-current', proximaCarta, false);
      renderizarCarta('hl-card-next', null, true);
      if (btnPlay) btnPlay.disabled = false;
      estado.emProcessamento = false;
    }, 1200);
  }, 700);
}

/* ---------------- JOGO 5: MINAS (5x5) ---------------- */
function calcularMultiplicadorMinas(numMinas, acertos) {
  if (acertos === 0) return 1.0;
  let mult = 0.96; // Margem da casa
  const totalCasas = 25;
  for (let i = 0; i < acertos; i++) {
    mult *= (totalCasas - i) / (totalCasas - numMinas - i);
  }
  return Number(mult.toFixed(2));
}

function inicializarTabuleiroMinas() {
  const board = document.getElementById('mines-board');
  if (!board) return;
  board.innerHTML = '';

  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('div');
    tile.className = 'mine-tile';
    tile.dataset.index = i;
    tile.innerHTML = '💎';
    tile.addEventListener('click', () => clicarCasaMina(i));
    board.appendChild(tile);
  }
}

function iniciarJogoMinas() {
  if (estado.subjogos.minas.ativo || estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  const selectMinas = document.getElementById('select-mines-count');
  const numMinas = selectMinas ? parseInt(selectMinas.value) : 3;

  debitarAposta(aposta);

  // Gera tabuleiro
  const casas = new Array(25).fill(false);
  let minasColocadas = 0;
  while (minasColocadas < numMinas) {
    const idx = Math.floor(Math.random() * 25);
    if (!casas[idx]) {
      casas[idx] = true;
      minasColocadas++;
    }
  }

  estado.subjogos.minas = {
    ativo: true,
    quantidadeMinas: numMinas,
    apostaAtual: aposta,
    tabuleiro: casas,
    revelados: [],
    multiplicadorAtual: 1.0
  };

  // UI
  inicializarTabuleiroMinas();
  const btnStart = document.getElementById('btn-start-minas');
  const btnCashout = document.getElementById('btn-cashout-minas');
  const msg = document.getElementById('mines-overlay-msg');
  if (btnStart) btnStart.classList.add('hidden');
  if (btnCashout) btnCashout.classList.remove('hidden');
  if (msg) msg.textContent = 'Clique nas casas para revelar diamantes ou saque a qualquer momento!';

  atualizarUIMinas();
}

function clicarCasaMina(index) {
  const minas = estado.subjogos.minas;
  if (!minas.ativo || minas.revelados.includes(index)) return;

  minas.revelados.push(index);
  const board = document.getElementById('mines-board');
  const tile = board.children[index];

  if (minas.tabuleiro[index]) {
    // CLICOU EM UMA MINA (BOMBA)
    tile.classList.add('revealed-bomb');
    tile.innerHTML = '💣';
    audio.tocarSom('explosao');

    // Revela todas as bombas
    minas.tabuleiro.forEach((ehMina, idx) => {
      const t = board.children[idx];
      t.classList.add('disabled');
      if (ehMina) {
        t.classList.add('revealed-bomb');
        t.innerHTML = '💣';
      } else if (!minas.revelados.includes(idx)) {
        t.innerHTML = '💎';
        t.style.opacity = '0.4';
      }
    });

    finalizarMinasDerrota();
  } else {
    // REVELOU UM DIAMANTE
    tile.classList.add('revealed-gem');
    tile.innerHTML = '💎';
    audio.tocarSom('diamante');

    const acertos = minas.revelados.length;
    minas.multiplicadorAtual = calcularMultiplicadorMinas(minas.quantidadeMinas, acertos);

    atualizarUIMinas();

    // Se revelou todos os diamantes disponíveis
    const totalSeguras = 25 - minas.quantidadeMinas;
    if (acertos >= totalSeguras) {
      sacarMinas();
    }
  }
}

function sacarMinas() {
  const minas = estado.subjogos.minas;
  if (!minas.ativo || minas.revelados.length === 0) return;

  const ganho = Math.round(minas.apostaAtual * minas.multiplicadorAtual);
  creditarVitoria(ganho, minas.multiplicadorAtual, 'Minas (5x5)', minas.apostaAtual);

  finalizarMinasUI();
}

function finalizarMinasDerrota() {
  const minas = estado.subjogos.minas;
  registrarDerrota('Minas (5x5)', minas.apostaAtual, 0);
  finalizarMinasUI();
}

function finalizarMinasUI() {
  estado.subjogos.minas.ativo = false;
  const btnStart = document.getElementById('btn-start-minas');
  const btnCashout = document.getElementById('btn-cashout-minas');
  const msg = document.getElementById('mines-overlay-msg');

  if (btnStart) btnStart.classList.remove('hidden');
  if (btnCashout) btnCashout.classList.add('hidden');
  if (msg) msg.textContent = 'Configure a aposta e clique em INICIAR';
}

function atualizarUIMinas() {
  const minas = estado.subjogos.minas;
  const acertos = minas.revelados.length;
  const proxMult = calcularMultiplicadorMinas(minas.quantidadeMinas, acertos + 1);
  const valorSaque = Math.round(minas.apostaAtual * minas.multiplicadorAtual);

  const txtSafe = document.getElementById('mines-safe-clicks');
  const txtNext = document.getElementById('mines-next-mult');
  const txtCash = document.getElementById('mines-cashout-val');
  const txtMult = document.getElementById('minas-current-mult');
  const btnCashVal = document.getElementById('btn-cashout-minas-val');

  if (txtSafe) txtSafe.textContent = String(acertos);
  if (txtNext) txtNext.textContent = `x${proxMult.toFixed(2)}`;
  if (txtCash) txtCash.textContent = formatarMoeda(valorSaque);
  if (txtMult) txtMult.textContent = `x${minas.multiplicadorAtual.toFixed(2)}`;
  if (btnCashVal) btnCashVal.textContent = formatarMoeda(valorSaque);
}

/* ---------------- JOGO 6: BLACKJACK 21 ---------------- */
function criarBaralhoBlackjack() {
  const baralho = [];
  for (let valor = 1; valor <= 13; valor++) {
    for (const naipe of NAIPES) {
      baralho.push({ valor, naipe, ehVermelho: naipe === '♥' || naipe === '♦' });
    }
  }
  // Embaralha (Fisher-Yates)
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho;
}

function calcularPontosBlackjack(mao) {
  let pontos = 0;
  let ases = 0;

  for (const c of mao) {
    if (c.valor === 1) {
      ases++;
      pontos += 11;
    } else if (c.valor >= 10) {
      pontos += 10;
    } else {
      pontos += c.valor;
    }
  }

  while (pontos > 21 && ases > 0) {
    pontos -= 10;
    ases--;
  }

  return pontos;
}

function renderizarMaoBlackjack(containerId, mao, ocultarSegundo = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  mao.forEach((c, idx) => {
    const cardEl = document.createElement('div');
    if (ocultarSegundo && idx === 1) {
      cardEl.className = 'bj-card bj-card-back';
      cardEl.textContent = '♠';
    } else {
      const nome = NOMES_CARTAS[c.valor] || c.valor;
      cardEl.className = `bj-card ${c.ehVermelho ? 'red' : ''}`;
      cardEl.innerHTML = `
        <div>${nome}</div>
        <div style="font-size: 1.2rem; align-self: center;">${c.naipe}</div>
        <div style="align-self: flex-end; transform: rotate(180deg);">${nome}</div>
      `;
    }
    container.appendChild(cardEl);
  });
}

function iniciarBlackjack() {
  if (estado.subjogos.blackjack.ativo || estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  debitarAposta(aposta);

  const baralho = criarBaralhoBlackjack();
  const maoJogador = [baralho.pop(), baralho.pop()];
  const maoDealer = [baralho.pop(), baralho.pop()];

  estado.subjogos.blackjack = {
    ativo: true,
    apostaAtual: aposta,
    baralho,
    maoJogador,
    maoDealer,
    dealerOculto: true
  };

  // UI
  document.getElementById('btn-bj-deal').classList.add('hidden');
  document.getElementById('bj-in-game-actions').classList.remove('hidden');

  const btnDouble = document.getElementById('btn-bj-double');
  if (btnDouble) {
    btnDouble.disabled = estado.saldo < aposta;
  }

  audio.tocarSom('moeda');
  atualizarUIBlackjack();

  // Verifica Blackjack natural do jogador logo no início
  const pontosP = calcularPontosBlackjack(maoJogador);
  if (pontosP === 21) {
    finalizarBlackjack();
  }
}

function comprarCartaBlackjack() {
  const bj = estado.subjogos.blackjack;
  if (!bj.ativo) return;

  bj.maoJogador.push(bj.baralho.pop());
  audio.tocarSom('moeda');
  atualizarUIBlackjack();

  const pontos = calcularPontosBlackjack(bj.maoJogador);
  if (pontos >= 21) {
    finalizarBlackjack();
  }
}

function dobrarApostaBlackjack() {
  const bj = estado.subjogos.blackjack;
  if (!bj.ativo || estado.saldo < bj.apostaAtual) return;

  debitarAposta(bj.apostaAtual);
  bj.apostaAtual *= 2;
  bj.maoJogador.push(bj.baralho.pop());
  audio.tocarSom('moeda');
  atualizarUIBlackjack();

  finalizarBlackjack();
}

function pararBlackjack() {
  const bj = estado.subjogos.blackjack;
  if (!bj.ativo) return;
  finalizarBlackjack();
}

function finalizarBlackjack() {
  const bj = estado.subjogos.blackjack;
  bj.dealerOculto = false;

  // Dealer compra até 17
  let pontosDealer = calcularPontosBlackjack(bj.maoDealer);
  const pontosJogador = calcularPontosBlackjack(bj.maoJogador);

  if (pontosJogador <= 21) {
    while (pontosDealer < 17) {
      bj.maoDealer.push(bj.baralho.pop());
      pontosDealer = calcularPontosBlackjack(bj.maoDealer);
    }
  }

  atualizarUIBlackjack();

  const msgEl = document.getElementById('bj-status-msg');
  const aposta = bj.apostaAtual;

  if (pontosJogador > 21) {
    // Jogador estourou
    if (msgEl) msgEl.textContent = `VOCÊ ESTOUROU COM ${pontosJogador} PONTOS!`;
    registrarDerrota('Blackjack 21', aposta, 0);
  } else if (pontosJogador === 21 && bj.maoJogador.length === 2 && pontosDealer !== 21) {
    // Blackjack Natural
    const ganho = Math.round(aposta * CONFIG.jogos.blackjack.pagamentoBlackjack);
    if (msgEl) msgEl.textContent = 'BLACKJACK NATURAL (21)! PAGAMENTO x2.5';
    creditarVitoria(ganho, CONFIG.jogos.blackjack.pagamentoBlackjack, 'Blackjack 21', aposta);
  } else if (pontosDealer > 21) {
    // Dealer estourou
    const ganho = aposta * 2;
    if (msgEl) msgEl.textContent = `O DEALER ESTOUROU COM ${pontosDealer}! VOCÊ VENCEU!`;
    creditarVitoria(ganho, 2.0, 'Blackjack 21', aposta);
  } else if (pontosJogador > pontosDealer) {
    // Vitória normal
    const ganho = aposta * 2;
    if (msgEl) msgEl.textContent = `VOCÊ VENCEU A BANCA (${pontosJogador} vs ${pontosDealer})!`;
    creditarVitoria(ganho, 2.0, 'Blackjack 21', aposta);
  } else if (pontosJogador === pontosDealer) {
    // Empate (Push)
    estado.saldo += aposta;
    if (msgEl) msgEl.textContent = `EMPATE (${pontosJogador} vs ${pontosDealer})! APOSTA DEVOLVIDA.`;
    registrarHistorico('Blackjack 21', aposta, true, aposta, 1.0);
    exibirFeedbackRodada('Empate no Blackjack — Aposta devolvida.', true, '🤝');
    atualizarInterface();
  } else {
    // Derrota
    if (msgEl) msgEl.textContent = `O DEALER VENCEU (${pontosDealer} vs ${pontosJogador})!`;
    registrarDerrota('Blackjack 21', aposta, 0);
  }

  bj.ativo = false;
  document.getElementById('btn-bj-deal').classList.remove('hidden');
  document.getElementById('bj-in-game-actions').classList.add('hidden');
}

function atualizarUIBlackjack() {
  const bj = estado.subjogos.blackjack;
  renderizarMaoBlackjack('bj-player-cards', bj.maoJogador, false);
  renderizarMaoBlackjack('bj-dealer-cards', bj.maoDealer, bj.dealerOculto);

  const pScore = document.getElementById('bj-player-score');
  const dScore = document.getElementById('bj-dealer-score');

  if (pScore) pScore.textContent = String(calcularPontosBlackjack(bj.maoJogador));
  if (dScore) {
    if (bj.dealerOculto && bj.maoDealer.length > 0) {
      dScore.textContent = '?';
    } else {
      dScore.textContent = String(calcularPontosBlackjack(bj.maoDealer));
    }
  }
}

/* ---------------- JOGO 7: CRASH ROCKET (CANVAS) ---------------- */
function gerarPontoCrash() {
  // Curva de probabilidade crash padrão
  const u = Math.random();
  const crash = 0.96 / (1 - u);
  return Math.max(1.00, Number(crash.toFixed(2)));
}

function desenharCenaCrash(multiplicador, explodiu = false) {
  const canvas = document.getElementById('crash-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Fundo grade espacial
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Trajetória do foguete (Curva Bézier exponencial)
  const progresso = Math.min(1.0, (multiplicador - 1.0) / 4.0);
  const startX = 40;
  const startY = h - 40;
  const endX = startX + (w - 120) * progresso;
  const endY = startY - (h - 90) * progresso;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY);
  ctx.strokeStyle = explodiu ? '#ff3366' : '#00f2fe';
  ctx.lineWidth = 4;
  ctx.shadowColor = explodiu ? '#ff3366' : '#00f2fe';
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Foguete ou Explosão
  if (explodiu) {
    ctx.font = '36px Arial';
    ctx.fillText('💥', endX - 18, endY + 12);
  } else {
    ctx.font = '28px Arial';
    ctx.fillText('🚀', endX - 14, endY + 10);
  }
}

function iniciarCrash() {
  if (estado.subjogos.crash.ativo || estado.emProcessamento) return;
  const aposta = obterValorAposta();
  if (aposta <= 0 || aposta > estado.saldo) return;

  debitarAposta(aposta);

  const pontoCrash = gerarPontoCrash();

  estado.subjogos.crash = {
    ativo: true,
    apostaAtual: aposta,
    pontoCrash,
    multiplicadorAtual: 1.00,
    sacou: false,
    tempoInicio: performance.now()
  };

  // UI
  document.getElementById('btn-crash-start').classList.add('hidden');
  document.getElementById('btn-crash-cashout').classList.remove('hidden');
  const txtTag = document.getElementById('crash-state-tag');
  if (txtTag) txtTag.textContent = 'FOGUETE EM VOO!';

  loopAnimacaoCrash();
}

function loopAnimacaoCrash() {
  const crash = estado.subjogos.crash;
  if (!crash.ativo) return;

  const agora = performance.now();
  const decorrido = (agora - crash.tempoInicio) / 1000; // segundos
  // Curva de aceleração do multiplicador
  crash.multiplicadorAtual = Number((Math.pow(Math.E, 0.15 * decorrido)).toFixed(2));

  const hudMult = document.getElementById('crash-live-mult');
  const btnVal = document.getElementById('btn-crash-cashout-val');

  if (hudMult) hudMult.textContent = `${crash.multiplicadorAtual.toFixed(2)}x`;
  if (btnVal) btnVal.textContent = formatarMoeda(Math.round(crash.apostaAtual * crash.multiplicadorAtual));

  desenharCenaCrash(crash.multiplicadorAtual, false);

  if (crash.multiplicadorAtual >= crash.pontoCrash) {
    // CRASH EXPLODIU!
    finalizarCrashExplosao();
  } else {
    crash.animacaoId = requestAnimationFrame(loopAnimacaoCrash);
  }
}

function sacarCrash() {
  const crash = estado.subjogos.crash;
  if (!crash.ativo || crash.sacou) return;

  crash.sacou = true;
  const multGanho = crash.multiplicadorAtual;
  const ganho = Math.round(crash.apostaAtual * multGanho);

  creditarVitoria(ganho, multGanho, 'Crash Rocket', crash.apostaAtual);

  const btnCashout = document.getElementById('btn-crash-cashout');
  if (btnCashout) btnCashout.classList.add('hidden');
}

function finalizarCrashExplosao() {
  const crash = estado.subjogos.crash;
  crash.ativo = false;
  if (crash.animacaoId) cancelAnimationFrame(crash.animacaoId);

  audio.tocarSom('explosao');
  desenharCenaCrash(crash.pontoCrash, true);

  const hudMult = document.getElementById('crash-live-mult');
  const txtTag = document.getElementById('crash-state-tag');
  if (hudMult) {
    hudMult.textContent = `${crash.pontoCrash.toFixed(2)}x`;
    hudMult.classList.add('crashed');
  }
  if (txtTag) txtTag.textContent = 'CRASHED! O FOGUETE EXPLODIU.';

  if (!crash.sacou) {
    registrarDerrota('Crash Rocket', crash.apostaAtual, crash.pontoCrash);
  }

  setTimeout(() => {
    document.getElementById('btn-crash-start').classList.remove('hidden');
    document.getElementById('btn-crash-cashout').classList.add('hidden');
    if (hudMult) hudMult.classList.remove('crashed');
    if (txtTag) txtTag.textContent = 'AGUARDANDO NOVA APOSTA';
  }, 2000);
}

/* ====================================================================
   9. GESTÃO DE NAVEGAÇÃO ENTRE ABAS DE JOGOS
   ==================================================================== */

function selecionarAbaJogo(nomeJogo) {
  estado.jogoAtivo = nomeJogo;

  // Atualiza botões da tab
  document.querySelectorAll('.game-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === nomeJogo);
  });

  // Atualiza telas de jogo
  document.querySelectorAll('.game-screen').forEach(screen => {
    screen.classList.toggle('active', screen.id === `game-${nomeJogo}`);
  });

  verificarOverlayJogoBloqueado();

  if (nomeJogo === 'roleta') {
    desenharRoleta();
  } else if (nomeJogo === 'crash') {
    desenharCenaCrash(1.0, false);
  }
}

function resetarVisualJogos() {
  // Cara ou coroa
  const coin = document.getElementById('coin-element');
  if (coin) coin.style.transform = 'rotateY(0deg)';

  // High/Low
  estado.subjogos.highlow.cartaAtual = gerarCartaAleatoria();
  renderizarCarta('hl-card-current', estado.subjogos.highlow.cartaAtual, false);
  renderizarCarta('hl-card-next', null, true);

  // Minas
  inicializarTabuleiroMinas();
  finalizarMinasUI();

  // Blackjack
  renderizarMaoBlackjack('bj-player-cards', [], false);
  renderizarMaoBlackjack('bj-dealer-cards', [], false);

  // Roleta & Crash
  desenharRoleta();
  desenharCenaCrash(1.0, false);
}

/* ====================================================================
   10. ANIMAÇÃO DE FUNDO (PARTÍCULAS LEVES DE CYBERPUNK)
   ==================================================================== */

function iniciarCanvasParticulas() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const particulas = Array.from({ length: 35 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    raio: Math.random() * 2 + 1,
    cor: Math.random() > 0.5 ? 'rgba(0, 242, 254, 0.25)' : 'rgba(176, 87, 255, 0.25)'
  }));

  function animar() {
    ctx.clearRect(0, 0, w, h);
    particulas.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
      ctx.fillStyle = p.cor;
      ctx.fill();
    });
    requestAnimationFrame(animar);
  }
  animar();
}

/* ====================================================================
   11. EVENT LISTENERS E INICIALIZAÇÃO
   ==================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Validação central de probabilidades
  validarProbabilidades();

  // 2. Partículas de fundo
  iniciarCanvasParticulas();

  // 3. Inicializações visuais
  resetarVisualJogos();
  atualizarInterface();

  // Modal de Primeiro Acesso
  const btnStartWelcome = document.getElementById('btn-welcome-start');
  if (btnStartWelcome) {
    btnStartWelcome.addEventListener('click', () => {
      audio.init();
      audio.tocarSom('click');
      document.getElementById('modal-welcome').classList.add('hidden');
      estado.partidaAtiva = true;
      iniciarCronometro();
    });
  }

  // Alternar Áudio
  const btnSound = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      estado.somAtivo = !estado.somAtivo;
      soundIcon.textContent = estado.somAtivo ? '🔊' : '🔇';
      audio.tocarSom('click');
    });
  }

  // Modais de Ajuda e Reinício
  document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.add('hidden');
  });
  document.getElementById('btn-help-ok')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.add('hidden');
  });

  document.getElementById('btn-restart-game')?.addEventListener('click', () => {
    document.getElementById('modal-confirm-restart')?.classList.remove('hidden');
  });
  document.getElementById('btn-restart-cancel')?.addEventListener('click', () => {
    document.getElementById('modal-confirm-restart')?.classList.add('hidden');
  });
  document.getElementById('btn-restart-confirm')?.addEventListener('click', () => {
    reiniciarJogo();
  });

  document.getElementById('btn-day-win-continue')?.addEventListener('click', () => {
    iniciarProximoDia();
  });
  document.getElementById('btn-defeat-retry')?.addEventListener('click', () => {
    reiniciarJogo();
  });
  document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
    reiniciarJogo();
  });
  document.getElementById('btn-advance-day')?.addEventListener('click', () => {
    if (estado.saldo >= estado.metaAtual) {
      avancarDia();
    }
  });

  document.getElementById('btn-goto-available')?.addEventListener('click', () => {
    selecionarAbaJogo('moeda');
  });

  // Seletor de Abas de Jogos
  document.querySelectorAll('.game-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      selecionarAbaJogo(btn.dataset.game);
    });
  });

  // Controles de Aposta (Chips, Frações, Operações)
  const inputBet = document.getElementById('input-bet-amount');

  document.querySelectorAll('.bet-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      audio.tocarSom('click');
      const add = Number(chip.dataset.val);
      const atual = Number(inputBet.value) || 0;
      inputBet.value = Math.min(estado.saldo, atual + add);
    });
  });

  document.querySelectorAll('.bet-mod').forEach(mod => {
    mod.addEventListener('click', () => {
      audio.tocarSom('click');
      const pct = Number(mod.dataset.pct);
      const calc = Math.max(1, Math.floor((estado.saldo * pct) / 100));
      inputBet.value = calc;
    });
  });

  document.getElementById('btn-bet-half')?.addEventListener('click', () => {
    audio.tocarSom('click');
    const atual = Number(inputBet.value) || 1;
    inputBet.value = Math.max(1, Math.floor(atual / 2));
  });

  document.getElementById('btn-bet-double')?.addEventListener('click', () => {
    audio.tocarSom('click');
    const atual = Number(inputBet.value) || 1;
    inputBet.value = Math.min(estado.saldo, atual * 2);
  });

  document.getElementById('btn-bet-clear')?.addEventListener('click', () => {
    audio.tocarSom('click');
    inputBet.value = 10;
  });

  // ================= JOGO 1: MOEDA =================
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estado.subjogos.moeda.escolha = btn.dataset.choice;
    });
  });
  document.getElementById('btn-play-moeda')?.addEventListener('click', jogarCaraOuCoroa);

  // ================= JOGO 2: DADOS =================
  document.querySelectorAll('.dice-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      document.querySelectorAll('.dice-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estado.subjogos.dados.tipo = btn.dataset.type;

      const exactBox = document.getElementById('dice-exact-numbers');
      if (exactBox) {
        if (btn.dataset.type === 'exato') {
          exactBox.classList.add('show');
        } else {
          exactBox.classList.remove('show');
        }
      }
    });
  });

  document.querySelectorAll('.exact-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      document.querySelectorAll('.exact-num-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estado.subjogos.dados.numeroExato = parseInt(btn.dataset.num);
    });
  });
  document.getElementById('btn-play-dados')?.addEventListener('click', jogarDados);

  // ================= JOGO 3: ROLETA =================
  document.getElementById('btn-play-roleta')?.addEventListener('click', jogarRoleta);

  // ================= JOGO 4: HIGH / LOW =================
  document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      document.querySelectorAll('.mode-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const modo = btn.dataset.mode;
      estado.subjogos.highlow.modo = modo;

      if (modo === 'std') {
        document.getElementById('hl-actions-std').classList.remove('hidden');
        document.getElementById('hl-actions-risk').classList.add('hidden');
        estado.subjogos.highlow.predicao = 'high';
      } else {
        document.getElementById('hl-actions-std').classList.add('hidden');
        document.getElementById('hl-actions-risk').classList.remove('hidden');
        estado.subjogos.highlow.predicao = 'super_high';
      }
    });
  });

  document.querySelectorAll('.hl-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.tocarSom('click');
      btn.parentElement.querySelectorAll('.hl-action-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      estado.subjogos.highlow.predicao = btn.dataset.pred;
    });
  });
  document.getElementById('btn-play-highlow')?.addEventListener('click', jogarHighLow);

  // ================= JOGO 5: MINAS =================
  document.getElementById('btn-start-minas')?.addEventListener('click', iniciarJogoMinas);
  document.getElementById('btn-cashout-minas')?.addEventListener('click', sacarMinas);

  // ================= JOGO 6: BLACKJACK =================
  document.getElementById('btn-bj-deal')?.addEventListener('click', iniciarBlackjack);
  document.getElementById('btn-bj-hit')?.addEventListener('click', comprarCartaBlackjack);
  document.getElementById('btn-bj-stand')?.addEventListener('click', pararBlackjack);
  document.getElementById('btn-bj-double')?.addEventListener('click', dobrarApostaBlackjack);

  // ================= JOGO 7: CRASH =================
  document.getElementById('btn-crash-start')?.addEventListener('click', iniciarCrash);
  document.getElementById('btn-crash-cashout')?.addEventListener('click', sacarCrash);
});

/* ====================================================================
   EASTER EGG — Clicar 5x no logo BET WARRIORS:
   · Dia vai para 10 (todos os jogos desbloqueados)
   · Tempo fica infinito (cronômetro para)
   · Saldo travado em R$ 20.000
   ==================================================================== */
(function() {
  let clickCount = 0;
  let resetTimer = null;
  let easterEggAtivo = false;

  const logoEl = document.getElementById('logo-easter-egg');
  if (!logoEl) return;

  // Sem cursor de clique — segredo total
  logoEl.style.cursor = 'default';
  logoEl.style.userSelect = 'none';

  logoEl.addEventListener('click', () => {
    if (easterEggAtivo) return; // já ativo, ignora
    clickCount++;

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { clickCount = 0; }, 2000);

    if (clickCount >= 5) {
      clickCount = 0;
      clearTimeout(resetTimer);
      ativarEasterEgg();
    }
  });

  function ativarEasterEgg() {
    easterEggAtivo = true;

    // 1. Dia → 10 (desbloqueia todos os jogos)
    estado.dia = 10;
    desbloquearJogos();
    atualizarHUD();

    // 2. Para o cronômetro e trava o tempo
    if (estado.intervaloTempo) {
      clearInterval(estado.intervaloTempo);
      estado.intervaloTempo = null;
    }
    estado.tempoRestante = Infinity;

    // Exibe "∞" no HUD de tempo e remove aviso de urgência
    const hudTempo = document.getElementById('hud-tempo');
    const timerBarFill = document.getElementById('timer-bar-fill');
    const timerBox = document.getElementById('timer-box');
    if (hudTempo) hudTempo.textContent = '∞';
    if (timerBarFill) timerBarFill.style.width = '100%';
    if (timerBox) timerBox.classList.remove('warning');

    // 3. Saldo travado em R$ 20.000
    estado.saldo = 20000;
    atualizarHUD();

    // Monkey-patch: intercepta mudanças de saldo para sempre voltar a 20000
    const originalAtualizar = window.atualizarHUD || atualizarHUD;
    // Sobrescreve saldo antes de cada atualização de HUD
    const hudSaldo = document.getElementById('hud-saldo');
    const betAvail = document.getElementById('bet-available');
    const observer = new MutationObserver(() => {
      if (estado.saldo !== 20000) {
        estado.saldo = 20000;
        if (hudSaldo) hudSaldo.textContent = formatarMoeda(20000);
        if (betAvail) betAvail.textContent = formatarMoeda(20000);
      }
    });
    if (hudSaldo) {
      observer.observe(hudSaldo, { childList: true, characterData: true, subtree: true });
    }

    mostrarToastSecreto();
  }

  function mostrarToastSecreto() {
    const antigo = document.getElementById('easter-egg-toast');
    if (antigo) antigo.remove();

    const toast = document.createElement('div');
    toast.id = 'easter-egg-toast';
    toast.innerHTML = '⚡ <strong>MODO GUERREIRO ATIVADO</strong> — Dia 10 · Tempo ∞ · Saldo R$&nbsp;20.000';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: linear-gradient(135deg, #7c3aed, #c026d3);
      color: #fff;
      padding: 14px 28px;
      border-radius: 50px;
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      box-shadow: 0 0 30px rgba(192,38,211,0.7), 0 4px 20px rgba(0,0,0,0.5);
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease, transform 0.4s ease;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
})();



