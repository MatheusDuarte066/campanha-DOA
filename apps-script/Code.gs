/**
 * Registro de Herdeiros · D.O.A.
 * Recebe as fichas enviadas pelo site e guarda nesta planilha.
 * O painel do mestre só lê as fichas com a senha abaixo.
 *
 * ANTES DE IMPLANTAR: troque a senha da linha abaixo.
 * Esta senha fica só no seu Google; nunca coloque ela no GitHub.
 */
const SENHA_MESTRE = 'TROQUE-ESTA-SENHA';

const ABA = 'Fichas';
const CAMPOS = ['jogador','personagem','tipo','poder','morto','laco','morte','desejo','manifesta','efeito','limites','peso','ignorar','recrutamento','recrutamento_det','esconde','segredo'];
const ROTULOS = ['Jogador','Personagem','Tipo','Poder','Quem morreu','Laço','Como foi a morte','Último desejo','Como se manifesta','O que faz','Limites e falhas','O peso','Se ignorar','Recrutamento','Como foi','Esconde da D.O.A.','Só para o mestre'];
const TAMANHO_MAXIMO = 6000;
const TENTATIVAS_MAXIMAS = 10;

function doGet() {
  return resposta({ ok: true, servico: 'Registro de Herdeiros' });
}

function doPost(e) {
  let dados;
  try { dados = JSON.parse(e.postData.contents); }
  catch (err) { return resposta({ ok: false, erro: 'formato' }); }
  if (dados.acao === 'enviar') return enviar(dados);
  if (dados.acao === 'listar') return listar(dados);
  return resposta({ ok: false, erro: 'acao' });
}

function planilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA);
  if (!aba) aba = ss.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    const cabecalho = ['Atualizada em', 'Protocolo'].concat(ROTULOS).concat(['Chave (não editar)']);
    aba.appendRow(cabecalho);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold');
  }
  return aba;
}

function texto(v) {
  let s = String(v == null ? '' : v).slice(0, TAMANHO_MAXIMO);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // impede que a planilha trate o texto como fórmula
  return s;
}

function enviar(dados) {
  const ficha = dados.ficha || {};
  const campos = ficha.campos || {};
  const protocolo = String(ficha.protocolo || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  const chave = String(ficha.chave || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 64);
  if (!protocolo || chave.length < 16 || !String(campos.personagem || '').trim()) {
    return resposta({ ok: false, erro: 'incompleta' });
  }
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const aba = planilha();
    const agora = new Date();
    const linha = [agora, protocolo].concat(CAMPOS.map(function (k) { return texto(campos[k]); })).concat([chave]);
    const colunaChave = CAMPOS.length + 3;
    const ultima = aba.getLastRow();
    let alvo = 0;
    if (ultima > 1) {
      const chaves = aba.getRange(2, colunaChave, ultima - 1, 1).getValues();
      for (let i = 0; i < chaves.length; i++) {
        if (String(chaves[i][0]) === chave) { alvo = i + 2; break; }
      }
    }
    if (alvo) aba.getRange(alvo, 1, 1, linha.length).setValues([linha]);
    else aba.appendRow(linha);
    return resposta({ ok: true, atualizada: !!alvo, em: agora.toISOString() });
  } finally {
    trava.releaseLock();
  }
}

function listar(dados) {
  if (SENHA_MESTRE === 'TROQUE-ESTA-SENHA') return resposta({ ok: false, erro: 'sem-senha' });
  const cache = CacheService.getScriptCache();
  const falhas = Number(cache.get('falhas') || 0);
  if (falhas >= TENTATIVAS_MAXIMAS) return resposta({ ok: false, erro: 'bloqueado' });
  if (String(dados.senha || '') !== SENHA_MESTRE) {
    cache.put('falhas', String(falhas + 1), 600);
    return resposta({ ok: false, erro: 'senha' });
  }
  const aba = planilha();
  const ultima = aba.getLastRow();
  if (ultima < 2) return resposta({ ok: true, fichas: [] });
  const valores = aba.getRange(2, 1, ultima - 1, CAMPOS.length + 2).getValues();
  const fichas = valores.map(function (linha) {
    const campos = {};
    CAMPOS.forEach(function (k, i) { campos[k] = String(linha[i + 2]); });
    const data = linha[0];
    return {
      atualizadaEm: data instanceof Date ? data.toISOString() : String(data),
      protocolo: String(linha[1]),
      campos: campos
    };
  }).filter(function (f) { return f.protocolo; });
  fichas.sort(function (a, b) { return a.atualizadaEm < b.atualizadaEm ? 1 : -1; });
  return resposta({ ok: true, fichas: fichas });
}

function resposta(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
