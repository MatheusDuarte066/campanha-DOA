/* =====================================================================
   CONFIGURAÇÃO DO MESTRE
   URL_DO_SCRIPT: o link do "App da Web" do Google Apps Script da planilha.
   WHATSAPP_DO_MESTRE: só números, 55 + DDD + número (ex.: '5541999998888').
   Vazio = o botão abre a lista de contatos e o jogador escolhe.
   ===================================================================== */
window.DOA_CONFIG = {
  URL_DO_SCRIPT: '',
  WHATSAPP_DO_MESTRE: ''
};

/* Lógica compartilhada entre a ficha (index.html) e o painel (mestre.html). */
(function(){
  'use strict';

  const FIELDS = [
    {id:'jogador', g:'Identificação', label:'Seu nome (jogador)', type:'text', ph:'Como o mestre te chama'},
    {id:'personagem', g:'Identificação', label:'Nome do personagem', type:'text', ph:'Ex.: Rafael Nogueira, o "Rafa"'},
    {id:'tipo', g:'Identificação', label:'Tipo', type:'choice', options:['Tributo','Dívida']},
    {id:'poder', g:'Identificação', label:'Nome do poder', type:'text', ph:'Ex.: O Pagode Inacabado'},
    {id:'morto', g:'Quem morreu', label:'Quem morreu', ph:'Nome, idade e quem essa pessoa era. Ex.: Seu Valdir, 58 anos, pagodeiro de bairro, tio do personagem.'},
    {id:'laco', g:'Quem morreu', label:'Laço com o personagem', ph:'Por que ela importava para você, e você para ela. Nem sempre é amor.'},
    {id:'morte', g:'Quem morreu', label:'Como foi a morte', ph:'Onde você estava? Estava junto, chegou tarde, só soube dias depois?'},
    {id:'desejo', g:'Quem morreu', label:'O último desejo', hint:'Uma frase, na voz de quem morreu.', ph:'Ex.: "Eu só queria terminar essa música pra ela."'},
    {id:'manifesta', g:'O poder', label:'Como se manifesta', ph:'Uma arma, um objeto, um som, um cheiro, uma presença, uma mudança no corpo.'},
    {id:'efeito', g:'O poder', label:'O que faz', ph:'Duas ou três frases sobre o efeito principal.'},
    {id:'limites', g:'O poder', label:'Limites e falhas', ph:'Alcance, duração, gatilho, o que anula, quando falha.'},
    {id:'peso', g:'O poder', label:'O peso', hint:'A compulsão do Tributo ou o custo da Dívida.', ph:'Ex.: ele não consegue parar no meio de uma música.'},
    {id:'ignorar', g:'O poder', label:'O que acontece se ignorar', ph:'Ex.: a música toca na cabeça dele sem parar até ele cantar.'},
    {id:'recrutamento', g:'D.O.A.', label:'Como a D.O.A. te encontrou', type:'choice', options:['Incidente','Indicação','Busca','Testemunha','Outro']},
    {id:'recrutamento_det', g:'D.O.A.', label:'Conte como foi', ph:'O que aconteceu, quem apareceu, como você entrou.'},
    {id:'esconde', g:'D.O.A.', label:'O que você esconde da D.O.A.', ph:'O que você não contou sobre o seu poder, ou sobre quem morreu.'},
    {id:'segredo', g:'Só para o mestre', label:'Algo que nem seu personagem sabe', hint:'Opcional. Uma ponta solta sobre o poder ou sobre quem morreu.', ph:'O mestre vai usar isso para te surpreender.', optional:true}
  ];

  function fichaTexto(v, protocolo, zap){
    const b = s => zap ? '*' + s + '*' : s;
    const L = [b('FICHA DE HERDEIRO · D.O.A.'), 'Protocolo ' + (protocolo || '-')];
    let g = null;
    FIELDS.forEach(f => {
      if (f.g !== g){ g = f.g; L.push('', b(g.toUpperCase())); }
      const val = String(v[f.id] || '').trim() || '-';
      L.push(zap ? b(f.label + ':') + ' ' + val : f.label.toUpperCase() + ': ' + val);
    });
    return L.join('\n');
  }

  const INK = [27,34,48], MUTED = [91,100,112], STAMP = [91,63,168];
  function limparTexto(s){
    return String(s == null ? '' : s)
      .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/•/g, '-')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
  }
  function novoPdf(){
    const J = window.jspdf && window.jspdf.jsPDF; if (!J) return null;
    const doc = new J({unit:'mm', format:'a4'});
    const W = 210, H = 297, M = 18, MW = W - 2 * M; let y = M;
    return {
      text(str, o){
        o = o || {};
        const size = o.size || 10.5;
        doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor.apply(doc, o.color || INK);
        let s = limparTexto(str); if (o.norm) s = s.replace(/\s+/g, ' ').trim();
        const ind = o.indent || 0; const lines = doc.splitTextToSize(s, MW - ind); const lh = size * 0.3528 * 1.4;
        if (o.keep && y + lh * 3 > H - M){ doc.addPage(); y = M; }
        lines.forEach(l => { if (y + lh > H - M){ doc.addPage(); y = M; } doc.text(l, M + ind, y + lh * 0.75); y += lh; });
        y += (o.gap == null ? 1.5 : o.gap);
      },
      space(n){ y += n; },
      rule(){ if (y + 4 > H - M){ doc.addPage(); y = M; } doc.setDrawColor(200,206,202); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 3; },
      finish(titulo){
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++){ doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTED); doc.text(limparTexto(titulo + ' · pág. ' + i + ' de ' + n), M, H - 9); }
        return doc.output('blob');
      }
    };
  }
  function fichaPdf(v, protocolo){
    const p = novoPdf(); if (!p) return null;
    p.text('Ficha de Herdeiro', {size:18, bold:true, gap:1});
    p.text('D.O.A. · Divisão de Ocorrências Atípicas · Protocolo ' + (protocolo || '-'), {size:9, color:MUTED, gap:5});
    let g = null;
    FIELDS.forEach(f => {
      if (f.g !== g){ g = f.g; p.space(2); p.text(g.toUpperCase(), {size:10, bold:true, color:STAMP, gap:1.5, keep:true}); p.rule(); }
      p.text(f.label, {size:9.5, bold:true, color:MUTED, gap:0.8, keep:true});
      p.text(String(v[f.id] || '').trim() || '-', {size:11, gap:3.5});
    });
    return p.finish('Ficha de Herdeiro · ' + (protocolo || ''));
  }
  function nomeArquivo(s){ return limparTexto(s).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'herdeiro'; }
  function baixarBlob(nome, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function arquivoDaFicha(v, protocolo){
    const base = 'Ficha - ' + nomeArquivo(v.personagem || 'herdeiro');
    const pdf = fichaPdf(v, protocolo);
    if (pdf) return {nome: base + '.pdf', blob: pdf, tipo: 'application/pdf'};
    return {nome: base + '.txt', blob: new Blob([fichaTexto(v, protocolo, false)], {type:'text/plain;charset=utf-8'}), tipo: 'text/plain'};
  }
  function dataCurta(iso){
    try { return new Date(iso).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); } catch (e) { return ''; }
  }

  let avisoT = null;
  function aviso(msg){
    const a = document.getElementById('aviso'); if (!a) return;
    a.textContent = msg; a.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 5000);
  }
  function copiar(texto, ancora){
    const reserva = () => {
      let ta = ancora._copia;
      if (!ta){ ta = document.createElement('textarea'); ta.className = 'copia'; ta.readOnly = true; ta.rows = 8; ta.setAttribute('aria-label','Texto da ficha'); ancora.parentElement.after(ta); ancora._copia = ta; }
      ta.value = texto; ta.hidden = false; ta.focus(); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      aviso(ok ? 'Texto copiado.' : 'Texto selecionado. Copie para levar.');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext){
        navigator.clipboard.writeText(texto).then(() => { if (ancora._copia) ancora._copia.hidden = true; aviso('Texto copiado.'); }, reserva);
      } else reserva();
    } catch (e) { reserva(); }
  }

  /* Conversa com o Apps Script. Corpo em texto puro, sem cabeçalhos extras, para o Google aceitar a chamada. */
  async function chamarScript(dados){
    const url = String(window.DOA_CONFIG.URL_DO_SCRIPT || '').trim();
    if (!url) throw {codigo:'sem-url'};
    let r;
    try { r = await fetch(url, {method:'POST', body: JSON.stringify(dados)}); }
    catch (e) { throw {codigo:'rede'}; }
    let json;
    try { json = await r.json(); } catch (e) { throw {codigo:'resposta'}; }
    if (!json || !json.ok) throw {codigo: (json && json.erro) || 'desconhecido'};
    return json;
  }

  window.DOA = {FIELDS, fichaTexto, novoPdf, fichaPdf, limparTexto, nomeArquivo, baixarBlob, arquivoDaFicha, dataCurta, aviso, copiar, chamarScript, CORES:{INK, MUTED, STAMP}};
})();
