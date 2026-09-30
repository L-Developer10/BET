// Testes automatizados do motor de lógica do BET WARRIORS
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
      segmentos: [
        { label: 'Perde Tudo', mult: 0.0, prob: 0.20 },
        { label: 'x0.5', mult: 0.5, prob: 0.20 },
        { label: 'x1.0', mult: 1.0, prob: 0.25 },
        { label: 'x1.5', mult: 1.5, prob: 0.15 },
        { label: 'x2.0', mult: 2.0, prob: 0.10 },
        { label: 'x3.0', mult: 3.0, prob: 0.05 },
        { label: 'x5.0', mult: 5.0, prob: 0.03 },
        { label: 'x10.0', mult: 10.0, prob: 0.02 }
      ]
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

function validarProbabilidades() {
  const somaRoleta = CONFIG.jogos.roleta.segmentos.reduce((acc, s) => acc + s.prob, 0);
  const diff = Math.abs(somaRoleta - 1.0);
  return diff < 0.0001;
}

console.log('=== TESTES DO BET WARRIORS ===');

// Teste 1: Validação de Probabilidades da Roleta
const probOk = validarProbabilidades();
console.log('1. Probabilidades da Roleta somam 100%:', probOk ? 'PASSOU' : 'FALHOU');

// Teste 2: Exemplo 1 do Usuário (Dia 3, meta 35k, saldo 42k -> 20% exc -> Dia 4 base 60k -> 72k)
const t1 = calcularNovaMeta(3, 42000, 35000);
console.log('2. Cálculo Exemplo 1 (Meta 35k, Saldo 42k -> Próx Meta):', t1, t1 === 72000 ? 'PASSOU' : 'FALHOU');

// Teste 3: Exemplo 2 do Usuário (Dia 5, meta 100k, saldo 150k -> 50% exc -> Dia 6 base 180k -> 270k)
const t2 = calcularNovaMeta(5, 150000, 100000);
console.log('3. Cálculo Exemplo 2 (Meta 100k, Saldo 150k -> Próx Meta):', t2, t2 === 270000 ? 'PASSOU' : 'FALHOU');

// Teste 4: Saldo exatamente igual à meta (0% de excedente)
const t3 = calcularNovaMeta(1, 10000, 10000);
console.log('4. Cálculo sem excedente (Meta 10k, Saldo 10k -> Dia 2 Base 20k):', t3, t3 === 20000 ? 'PASSOU' : 'FALHOU');

// Teste 5: Dia 9 para Dia 10 com excedente
const t4 = calcularNovaMeta(9, 900000, 750000); // 20% excedente -> Dia 10 base 1M -> 1.2M
console.log('5. Cálculo Dia 10 Dinâmico (Meta 750k, Saldo 900k -> Dia 10):', t4, t4 === 1200000 ? 'PASSOU' : 'FALHOU');
