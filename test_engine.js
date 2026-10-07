// Testes automatizados do motor de lógica do BET WARRIORS
const crypto = require('crypto');

const CONFIG = {
  metasBase: [0, 10000, 20000, 35000, 60000, 100000, 180000, 300000, 500000, 750000, 1000000],
  jogos: {
    moeda: { chanceVitoria: 0.50, multiplicador: 1.90 },
    dados: {
      baixo: { chance: 0.50, multiplicador: 1.90 },
      alto: { chance: 0.50, multiplicador: 1.90 },
      exato: { chance: 1 / 6, multiplicador: 5.50 }
    },
    roleta: {
      sequencia: Object.freeze([
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
      ]),
      vermelhos: Object.freeze(new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])),
      pretos: Object.freeze(new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35])),
      multiplicadores: Object.freeze({
        vermelho: 2.0,
        preto: 2.0,
        verde: 36.0
      })
    }
  }
};

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

function sortearIndiceRoleta() {
  const buffer = new Uint32Array(1);
  const divisor = 37;
  const maxUniforme = Math.floor(0x100000000 / divisor) * divisor;
  let val;
  do {
    crypto.getRandomValues(buffer);
    val = buffer[0];
  } while (val >= maxUniforme);
  return val % divisor;
}

function resolverCorRoleta(numero) {
  if (numero === 0) return 'verde';
  if (CONFIG.jogos.roleta.vermelhos.has(numero)) return 'vermelho';
  return 'preto';
}

function validarEstruturaRoleta() {
  const seq = CONFIG.jogos.roleta.sequencia;
  if (!seq || seq.length !== 37) return false;
  const verm = CONFIG.jogos.roleta.vermelhos;
  const pret = CONFIG.jogos.roleta.pretos;
  if (verm.size !== 18 || pret.size !== 18) return false;
  // Verificar se todos os números de 0 a 36 estão presentes
  const conjunto = new Set(seq);
  if (conjunto.size !== 37) return false;
  for (let i = 0; i <= 36; i++) {
    if (!conjunto.has(i)) return false;
  }
  return true;
}

console.log('=== TESTES DO BET WARRIORS (MOTOR & ROLETA EUROPEIA) ===');

// Teste 1: Validação Estrutural da Roleta Europeia
const structOk = validarEstruturaRoleta();
console.log('1. Estrutura da Roleta Europeia (37 casas, 18V, 18P, 1Zero):', structOk ? 'PASSOU' : 'FALHOU');

// Teste 2: Validação de Amostragem Uniforme Criptográfica (100.000 sorteios)
const totalSorteios = 100000;
const contagem = new Array(37).fill(0);
let countVermelho = 0;
let countPreto = 0;
let countVerde = 0;

for (let i = 0; i < totalSorteios; i++) {
  const idx = sortearIndiceRoleta();
  contagem[idx]++;
  const num = CONFIG.jogos.roleta.sequencia[idx];
  const cor = resolverCorRoleta(num);
  if (cor === 'vermelho') countVermelho++;
  else if (cor === 'preto') countPreto++;
  else if (cor === 'verde') countVerde++;
}

// Cada número deve aparecer aproximadamente 100000 / 37 = 2702 vezes (~2.7%)
const todosApareceram = contagem.every(c => c > 2300 && c < 3100);
const pctVermelho = (countVermelho / totalSorteios) * 100;
const pctPreto = (countPreto / totalSorteios) * 100;
const pctVerde = (countVerde / totalSorteios) * 100;

console.log(`2. Distribuição Criptográfica (${totalSorteios} sorteios):`, todosApareceram ? 'PASSOU' : 'FALHOU');
console.log(`   - Vermelho: ${pctVermelho.toFixed(2)}% (esperado ~48.65%)`);
console.log(`   - Preto:    ${pctPreto.toFixed(2)}% (esperado ~48.65%)`);
console.log(`   - Verde:    ${pctVerde.toFixed(2)}% (esperado ~2.70%)`);

// Teste 3: Multiplicadores e Pagamentos
const multVerm = CONFIG.jogos.roleta.multiplicadores.vermelho === 2.0;
const multPret = CONFIG.jogos.roleta.multiplicadores.preto === 2.0;
const multVerd = CONFIG.jogos.roleta.multiplicadores.verde === 36.0;
console.log('3. Pagamentos Oficiais (Vermelho x2, Preto x2, Verde x36):', (multVerm && multPret && multVerd) ? 'PASSOU' : 'FALHOU');

// Teste 4: Exemplo 1 do Usuário (Dia 3, meta 35k, saldo 42k -> 20% exc -> Dia 4 base 60k -> 72k)
const t1 = calcularNovaMeta(3, 42000, 35000);
console.log('4. Cálculo Exemplo 1 (Meta 35k, Saldo 42k -> Próx Meta):', t1, t1 === 72000 ? 'PASSOU' : 'FALHOU');

// Teste 5: Exemplo 2 do Usuário (Dia 5, meta 100k, saldo 150k -> 50% exc -> Dia 6 base 180k -> 270k)
const t2 = calcularNovaMeta(5, 150000, 100000);
console.log('5. Cálculo Exemplo 2 (Meta 100k, Saldo 150k -> Próx Meta):', t2, t2 === 270000 ? 'PASSOU' : 'FALHOU');

// Teste 6: Saldo exatamente igual à meta (0% de excedente)
const t3 = calcularNovaMeta(1, 10000, 10000);
console.log('6. Cálculo sem excedente (Meta 10k, Saldo 10k -> Dia 2 Base 20k):', t3, t3 === 20000 ? 'PASSOU' : 'FALHOU');

// Teste 7: Dia 9 para Dia 10 com excedente
const t4 = calcularNovaMeta(9, 900000, 750000); // 20% excedente -> Dia 10 base 1M -> 1.2M
console.log('7. Cálculo Dia 10 Dinâmico (Meta 750k, Saldo 900k -> Dia 10):', t4, t4 === 1200000 ? 'PASSOU' : 'FALHOU');

