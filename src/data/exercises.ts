export interface SmartExercise {
  id: string;
  name: string;
  description: string;
  objective: string;
  benefitsForDiabetes: string;
  categories: string[]; // e.g. ["Caminhada", "Exercícios para iniciantes"]
  musclesWorked: string[];
  difficulty: "iniciante" | "intermediario" | "avancado";
  intensity: "leve" | "moderada" | "alta";
  timeSuggested: string;
  setsReps?: string;
  frequencyRecommended: string;
  contraindications: string;
  correctExecutionTips: string[];
  steps: string[];
  gifPlaceholderType: "walk" | "run" | "bike" | "stretch" | "mobility" | "strength" | "band";
}

export const SMART_EXERCISES: SmartExercise[] = [
  {
    id: "caminhada_moderada",
    name: "Caminhada Rítmica de Intervalo",
    description: "Uma caminhada ativa alternando ritmos para estimular a captação de glicose muscular de maneira suave e contínua.",
    objective: "Reduzir o pico glicêmico pós-prandial e melhorar a aptidão cardiovascular geral.",
    benefitsForDiabetes: "Ativa os transportadores de glicose GLUT4 nos músculos sem precisar de picos de insulina, estabilizando as curvas de açúcar no sangue por até 24 horas.",
    categories: ["Caminhada", "Exercícios para iniciantes", "Exercícios para idosos", "Exercícios sem equipamentos"],
    musclesWorked: ["Quadríceps", "Panturrilhas", "Glúteos", "Isquiotibiais"],
    difficulty: "iniciante",
    intensity: "moderada",
    timeSuggested: "20 a 30 minutos",
    frequencyRecommended: "Diariamente (especialmente 30 minutos após a maior refeição)",
    contraindications: "Pessoas com neuropatia diabética severa ativa devem inspecionar os pés antes/depois e utilizar calçados macios apropriados para evitar calos ou lesões.",
    correctExecutionTips: [
      "Mantenha a coluna ereta e os ombros relaxados.",
      "Mova os braços em ritmo alternado com as pernas para maior gasto calórico.",
      "Inicie com 5 minutos de ritmo lento e aumente progressivamente."
    ],
    steps: [
      "Vista calçados confortáveis e meias sem costura grossa.",
      "Inicie caminhando calmamente por 5 minutos para aquecer as articulações.",
      "Aumente o passo para um ritmo moderado (onde você consegue falar, mas não consegue cantar facilmente).",
      "Mantenha o ritmo firme por 15 a 20 minutos.",
      "Desacelere nos últimos 5 minutos para retorno seguro ao estado basal."
    ],
    gifPlaceholderType: "walk"
  },
  {
    id: "agachamento_casa",
    name: "Agachamento Livre com Cadeira",
    description: "Exercício fundamental de força focado nos grandes grupos musculares inferiores, utilizando o peso do próprio corpo e apoio seguro de uma cadeira.",
    objective: "Desenvolver força nos membros inferiores e aumentar a massa muscular ativa.",
    benefitsForDiabetes: "Grandes músculos inferiores consomem grandes quantidades de glicogênio. Aumentar a musculatura das pernas cria um 'reservatório' maior para absorver glicose do sangue, reduzindo a resistência insulínica crônica.",
    categories: ["Exercícios de força", "Exercícios para iniciantes", "Exercícios para idosos", "Exercícios para fazer em casa", "Exercícios sem equipamentos"],
    musclesWorked: ["Quadríceps", "Glúteo máximo", "Isquiotibiais", "Core (Abdominais)"],
    difficulty: "iniciante",
    intensity: "moderada",
    timeSuggested: "10 a 15 minutos",
    setsReps: "3 séries de 10 a 12 repetições (com 1 minuto de descanso)",
    frequencyRecommended: "3 vezes por semana",
    contraindications: "Lesões agudas nos joelhos ou quadris sem liberação fisioterapêutica.",
    correctExecutionTips: [
      "Não deixe seus joelhos ultrapassarem excessivamente a linha dos pés.",
      "Mantenha o peito aberto e olhe para frente, nunca para o chão.",
      "Distribua o peso do corpo no calcanhar, não na ponta dos pés."
    ],
    steps: [
      "Posicione-se em pé, de costas para uma cadeira firme, com os pés afastados na largura dos ombros.",
      "Estenda os braços à frente para dar equilíbrio.",
      "Inicie o movimento dobrando os quadris para trás, como se fosse sentar na cadeira.",
      "Toque levemente o assento com o bumbum de forma controlada (sem despencar).",
      "Empurre o chão firmemente com os calcanhares para retornar à posição inicial em pé."
    ],
    gifPlaceholderType: "strength"
  },
  {
    id: "alongamento_diabetes",
    name: "Alongamento Integral para Flexibilidade",
    description: "Sequência de alongamentos estáticos suaves focados nas cadeias musculares anterior e posterior para relaxamento neuromuscular.",
    objective: "Melhorar a flexibilidade articular e diminuir hormônios de estresse (cortisol).",
    benefitsForDiabetes: "O estresse psicológico e a rigidez articular decorrentes da hiperglicemia crônica (glicação de colágeno) são reduzidos, estimulando a circulação capilar periférica saudável.",
    categories: ["Alongamentos", "Mobilidade", "Exercícios para iniciantes", "Exercícios para idosos", "Exercícios para fazer em casa", "Exercícios sem equipamentos"],
    musclesWorked: ["Isquiotibiais", "Costas", "Peitoral", "Flexores do quadril"],
    difficulty: "iniciante",
    intensity: "leve",
    timeSuggested: "10 a 12 minutos",
    setsReps: "Manter cada postura por 30 segundos",
    frequencyRecommended: "Diariamente (ideal antes de dormir para acalmar o sistema nervoso)",
    contraindications: "Evitar alongar excessivamente áreas com estiramentos recentes ou dores articulares agudas.",
    correctExecutionTips: [
      "Respire fundo de forma controlada durante todo o alongamento.",
      "O alongamento deve causar uma sensação de tensão suave, nunca dor forte.",
      "Mantenha a postura estática sem ficar dando 'solavancos'."
    ],
    steps: [
      "Alongamento de Isquiotibiais: Sentado na ponta da cadeira, estique uma perna à frente com o calcanhar no chão e incline o tronco suavemente para a frente.",
      "Alongamento de Peitoral: Em pé, entrelace as mãos atrás das costas e abra o peito, olhando ligeiramente para o teto.",
      "Alongamento Lateral: Eleve um braço acima da cabeça e incline o corpo suavemente para o lado oposto.",
      "Respire fundo em cada postura por pelo menos 30 segundos, alternando os lados quando aplicável."
    ],
    gifPlaceholderType: "stretch"
  },
  {
    id: "corrida_intervalada",
    name: "Corrida Intervalada Aeróbica/Anaeróbica",
    description: "Corrida alternando períodos de maior velocidade com períodos de caminhada de recuperação ativa.",
    objective: "Aumentar drasticamente a capacidade cardiorrespiratória e o consumo calórico pós-exercício.",
    benefitsForDiabetes: "Gera um efeito de consumo de oxigênio pós-exercício (EPOC) prolongado, mantendo a sensibilidade muscular à insulina elevada por até 48 horas após o término da atividade.",
    categories: ["Corrida", "Exercícios de força"],
    musclesWorked: ["Quadríceps", "Panturrilhas", "Glúteos", "Músculos abdominais e lombares"],
    difficulty: "avancado",
    intensity: "alta",
    timeSuggested: "20 a 25 minutos",
    frequencyRecommended: "2 a 3 vezes por semana",
    contraindications: "Histórico recente de retinopatia diabética proliferativa não tratada (devido ao aumento rápido de pressão arterial sistólica) ou neuropatia periférica moderada a grave.",
    correctExecutionTips: [
      "Use tênis com excelente amortecimento.",
      "Certifique-se de que a sua glicemia não está abaixo de 100 mg/dL antes de iniciar para evitar hipoglicemia severa.",
      "Monitore o cansaço extremo e hidrate-se com água."
    ],
    steps: [
      "Inicie com uma caminhada leve e pequenos trotes por 5 minutos para aquecimento.",
      "Corra em velocidade acelerada (esforço 8 de 10) por exatamente 1 minuto.",
      "Caminhe lentamente em recuperação ativa por 2 minutos.",
      "Repita esse ciclo de aceleração e caminhada por 5 a 6 vezes.",
      "Faça 4 minutos de caminhada de resfriamento lento no final."
    ],
    gifPlaceholderType: "run"
  },
  {
    id: "mobilidade_quadril",
    name: "Mobilidade Dinâmica de Quadril e Tornozelo",
    description: "Exercícios de movimento articular fluido para lubrificação das articulações de suporte inferior e diminuição de dores lombares.",
    objective: "Restaurar a amplitude de movimento articular e melhorar o equilíbrio postural.",
    benefitsForDiabetes: "Favorece a microcirculação nas extremidades inferiores, o que é de suma importância para prevenir neuropatias e disfunções de marcha em pacientes diabéticos de longa data.",
    categories: ["Mobilidade", "Exercícios para iniciantes", "Exercícios para idosos", "Exercícios para fazer em casa"],
    musclesWorked: ["Flexores do quadril", "Panturrilha anterior", "Glúteo médio"],
    difficulty: "iniciante",
    intensity: "leve",
    timeSuggested: "8 a 10 minutos",
    setsReps: "2 séries de 10 repetições de cada lado",
    frequencyRecommended: "Diariamente (pode ser usado como aquecimento para caminhada ou musculação)",
    contraindications: "Prótese de quadril recente ou cirurgia recente na região articular sem aval ortopédico.",
    correctExecutionTips: [
      "Execute o movimento de maneira lenta e consciente, sem pressa.",
      "Use uma parede ou móvel firme como apoio se sentir desequilíbrio.",
      "Evite prender a respiração."
    ],
    steps: [
      "Balanço de Perna Lateral: Segure na parede e balance uma perna lateralmente para a esquerda e direita de forma natural.",
      "Mobilidade de Tornozelo na Parede: Apoie as mãos na parede, dê um passo atrás com uma perna e dobre o joelho da frente tentando aproximá-lo da parede sem tirar o calcanhar traseiro do chão.",
      "Repita os movimentos 10 vezes em cada perna de maneira contínua."
    ],
    gifPlaceholderType: "mobility"
  },
  {
    id: "pedalada_leve",
    name: "Pedalada Estática de Baixo Impacto",
    description: "Ciclismo em bicicleta ergométrica ou de passeio em ritmo constante e confortável, excelente para poupar articulações.",
    objective: "Treinamento cardiovascular aeróbico contínuo de baixo impacto articular.",
    benefitsForDiabetes: "Estabiliza os níveis de glicose no sangue de forma previsível. O risco de picos de pressão ou lesões articulares é baixíssimo, ideal para quem tem excesso de peso ou osteoartrite associada.",
    categories: ["Bicicleta", "Exercícios para iniciantes", "Exercícios para idosos"],
    musclesWorked: ["Quadríceps", "Isquiotibiais", "Panturrilhas"],
    difficulty: "iniciante",
    intensity: "leve",
    timeSuggested: "25 a 40 minutos",
    frequencyRecommended: "3 a 4 vezes por semana",
    contraindications: "Problemas agudos na região lombar ou dores ciáticas graves que piorem ao sentar no selim da bicicleta.",
    correctExecutionTips: [
      "Ajuste a altura do banco de modo que seu joelho fique ligeiramente flexionado (cerca de 10 a 15 graus) no ponto mais baixo do pedal.",
      "Mantenha os pés planos e evite pedalar usando apenas a ponta dos dedos.",
      "Beba pequenos goles de água a cada 10 minutos."
    ],
    steps: [
      "Suba na bicicleta e certifique-se de que o selim e o guidão estão bem firmes e regulados.",
      "Pedale sem carga (resistência zero) por 3 minutos.",
      "Adicione uma resistência leve a moderada onde você sinta um trabalho muscular suave sem precisar fazer esforço extremo.",
      "Pedale em ritmo constante (em torno de 60 a 70 rotações por minuto) por 20 a 30 minutos.",
      "Reduza a resistência a zero nos últimos 2 minutos para desaceleração controlada."
    ],
    gifPlaceholderType: "bike"
  },
  {
    id: "forca_elastico",
    name: "Remada Sentada com Faixa Elástica",
    description: "Exercício de fortalecimento para a musculatura das costas e ombros, utilizando uma faixa elástica de resistência (teraband).",
    objective: "Melhorar a postura, fortalecer o tronco superior e aumentar a taxa metabólica.",
    benefitsForDiabetes: "O treinamento de resistência com elástico oferece uma tensão contínua e segura, gerando microlesões musculares saudáveis que, ao se regenerarem, absorvem mais glicose sanguínea nas refeições seguintes.",
    categories: ["Exercícios de força", "Exercícios com elástico", "Exercícios para fazer em casa"],
    musclesWorked: ["Latíssimo do dorso (Costas)", "Rombóides", "Bíceps braquial", "Deltoide posterior"],
    difficulty: "iniciante",
    intensity: "moderada",
    timeSuggested: "12 a 15 minutos",
    setsReps: "3 séries de 12 a 15 repetições (com 45 segundos de descanso)",
    frequencyRecommended: "3 vezes por semana",
    contraindications: "Dores agudas no ombro ou tendinites severas em fase inflamatória.",
    correctExecutionTips: [
      "Mantenha a coluna bem alongada e os ombros afastados das orelhas.",
      "Inicie o movimento puxando os cotovelos para trás e espremendo as escápulas.",
      "Não deixe o elástico puxar seus braços de volta rapidamente; controle o retorno."
    ],
    steps: [
      "Sente-se no chão ou em um colchonete com as pernas esticadas para frente.",
      "Passe a faixa elástica ao redor das solas dos pés, segurando uma extremidade com cada mão.",
      "Inicie a puxada trazendo as mãos em direção às costelas, mantendo os cotovelos colados ao corpo.",
      "Sinta a musculatura das costas contrair no final do movimento por 1 segundo.",
      "Retorne lentamente os braços à posição estendida inicial de forma controlada."
    ],
    gifPlaceholderType: "band"
  }
];
