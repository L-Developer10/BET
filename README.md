# ⚡ BET WARRIORS — Simulador de Apostas Fictícias

O **BET WARRIORS** é um jogo de navegador completo, desenvolvido prioritariamente com **HTML5**, **CSS3** e **JavaScript Puro**, focado em uma simulação estratégica de apostas utilizando **100% dinheiro fictício**.

---

## 🎮 Conceito e Objetivo

O jogador começa sua jornada no **Dia 1** com um saldo fictício de **R$ 10.000** e dispõe de **10 dias** para alcançar o grande objetivo final de acumular **R$ 1.000.000+**.

Cada dia possui um tempo limite de **2 minutos (120 segundos)**. Para avançar, o jogador deve terminar o dia com saldo igual ou superior à meta daquele dia.

---

## 📈 Sistema de Aumento Dinâmico das Metas

Quando o jogador encerra um dia com saldo superior à meta estipulada, a meta base do dia seguinte é aumentada proporcionalmente ao **percentual excedente** obtido:

$$\text{novaMeta} = \text{metaBaseDoProximoDia} \times (1 + \text{percentualExcedente})$$

### Metas Base de Referência:
| Dia | Meta Base | Jogos Desbloqueados |
|:---:|:---:|:---|
| **1** | R$ 10.000 | 🪙 Cara ou Coroa |
| **2** | R$ 20.000 | 🎲 Dados da Sorte |
| **3** | R$ 35.000 | - |
| **4** | R$ 60.000 | 🎡 Roda da Sorte |
| **5** | R$ 100.000 | - |
| **6** | R$ 180.000 | 🃏 High/Low & 💣 Minas (5x5) |
| **7** | R$ 300.000 | - |
| **8** | R$ 500.000 | ♠️ Blackjack 21 |
| **9** | R$ 750.000 | 🚀 Crash Rocket |
| **10** | R$ 1.000.000+ | 🏆 Grande Final |

---

## 🎰 Os 7 Jogos de Aposta

1. **🪙 Cara ou Coroa (Dia 1):** Escolha Cara ou Coroa com animação 3D de rotação da moeda. Multiplicador de **x1.90** (50% chance).
2. **🎲 Dados da Sorte (Dia 2):** Escolha Baixo (1-3, x1.90), Alto (4-6, x1.90) ou Número Exato (1 a 6, x5.50) com animação 3D de rotação.
3. **🎡 Roda da Sorte (Dia 4):** Roleta de prêmios desenhada em HTML5 Canvas com 8 setores calibrados (Perde tudo, x0.5, x1.0, x1.5, x2.0, x3.0, x5.0 e x10.0). Probabilidades validadas que somam exatamente 100%.
4. **🃏 High / Low (Dia 6):** Preveja se a próxima carta será maior ou menor (Modo Padrão x1.80) ou arrisque no Modo Higher Risk (Super High / Super Low x3.60).
5. **💣 Campo Minado (5x5) (Dia 6):** Tabuleiro com minas configuráveis (1 a 20 minas). Cada diamante revelado aumenta o multiplicador. Saque a qualquer momento antes de clicar em uma mina!
6. **♠️ Blackjack 21 (Dia 8):** Versão ágil do 21 com Hit, Stand e Double Down. Ás vale 1 ou 11 automaticamente. Pagamento normal x2.0, Blackjack natural x2.5 e empate devolve aposta.
7. **🚀 Crash Rocket (Dia 9):** Foguete que decola em tempo real sobre um Canvas espacial. O multiplicador cresce exponencialmente. Saque antes que o foguete exploda!

---

## 🔊 Recursos Extras

* **Efeitos Sonoros Integrados (Web Audio API):** Áudio 100% sintetizado e auto-suficiente via código (sem arquivos externos). Inclui botão para mutar/desmutar.
* **Sistema Universal de Apostas:** Fichas rápidas (+10, +50, +100, +500, +1K, +5K, +10K), porcentagens (10%, 25%, 50%, 75%, ALL-IN), dobrar, dividir e input numérico validado.
* **Histórico e Estatísticas:** Registro das últimas 20 jogadas com lucros/perdas e acompanhamento em tempo real do total apostado, maior ganho, win streak e multiplicadores.
* **Design Cyberpunk / Cassino Futurista:** Interface escura moderna com gradientes neon, responsiva para Desktop, Tablet e Mobile.

---

## 🚀 Como Executar Localmente

### Opção 1 (Direto pelo Navegador):
Basta dar um duplo clique no arquivo [`index.html`](file:///C:/Users/tinol/.gemini/antigravity/scratch/bet-warriors/index.html) e jogar em qualquer navegador moderno.

### Opção 2 (Via Servidor Local Python):
Execute no terminal:
```bash
python server.py
```
E acesse `http://localhost:8080`.
