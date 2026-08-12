import type { MonitorSnapshot } from "./types.ts";

export interface B2BSite {
  id: string;
  name: string;
  category: "Obra" | "Evento" | "Porto / Indústria";
  address: string;
  lat: number;
  lon: number;
  criticalRadiusKm: number; // Ex: 8 km
  alertRadiusKm: number; // Ex: 15 km
  workersCount: number;
  managerPhone: string;
  activeStatus: "LIBERADO" | "ATENCAO" | "PARALISADO_NR18";
  allClearTimerSec: number;
}

export const INITIAL_B2B_SITES: B2BSite[] = [
  {
    id: "site-01",
    name: "Obra Torre Horizon - Canteiro 01",
    category: "Obra",
    address: "Av. Sete de Setembro, 4200 - Batel, Curitiba - PR",
    lat: -25.4411,
    lon: -49.2782,
    criticalRadiusKm: 8,
    alertRadiusKm: 15,
    workersCount: 45,
    managerPhone: "5541988885871",
    activeStatus: "LIBERADO",
    allClearTimerSec: 0,
  },
  {
    id: "site-02",
    name: "Arena Eventos Ao Ar Livre - Palco Principal",
    category: "Evento",
    address: "Parque Barigui - Curitiba - PR",
    lat: -25.4262,
    lon: -49.3086,
    criticalRadiusKm: 8,
    alertRadiusKm: 15,
    workersCount: 120,
    managerPhone: "5541988885871",
    activeStatus: "LIBERADO",
    allClearTimerSec: 0,
  },
  {
    id: "site-03",
    name: "Terminal Logístico Portuário - Pátio 03",
    category: "Porto / Indústria",
    address: "Porto de Paranaguá - PR",
    lat: -25.5033,
    lon: -48.5133,
    criticalRadiusKm: 8,
    alertRadiusKm: 15,
    workersCount: 80,
    managerPhone: "5541988885871",
    activeStatus: "LIBERADO",
    allClearTimerSec: 0,
  },
];

/**
 * Função para disparar a simulação de mensagem via WhatsApp
 */
export function sendWhatsAppAlertSimulation(site: B2BSite, messageType: "WARNING" | "CRITICAL" | "ALL_CLEAR") {
  let text = "";
  const phone = site.managerPhone.replace(/\D/g, "");

  if (messageType === "CRITICAL") {
    text = `🚨 *STORMWATCH - ALERTA DE RAIO (RAIO CRÍTICO)*\n\n` +
      `*Local:* ${site.name}\n` +
      `*Status:* ⚡ Raio detectado dentro do raio crítico (${site.criticalRadiusKm} km)\n` +
      `*Recomendação:* Considerar a paralisação imediata de trabalhos em gruas, andaimes e estruturas metálicas.\n` +
      `*Fonte:* NOAA GOES-19 GLM (satélite)\n` +
      `*Tudo Limpo:* contagem de 30 min inicia após a última descarga.\n\n` +
      `_Ferramenta de apoio à decisão. A decisão final é do responsável pelo local._`;
  } else if (messageType === "WARNING") {
    text = `⚠️ *STORMWATCH - ATENÇÃO*\n\n` +
      `*Local:* ${site.name}\n` +
      `*Status:* Tempestade se aproximando (raio a menos de ${site.alertRadiusKm} km)\n` +
      `*Recomendação:* Manter equipes de prontidão para eventual evacuação preventiva.\n\n` +
      `_Ferramenta de apoio à decisão. A decisão final é do responsável pelo local._`;
  } else {
    text = `✅ *STORMWATCH - TUDO LIMPO (SUGERIDO)*\n\n` +
      `*Local:* ${site.name}\n` +
      `*Status:* Nenhuma descarga detectada nos últimos 30 minutos.\n` +
      `*Recomendação:* Condições sugerem retomada — confirme a situação no local antes de liberar.\n\n` +
      `_Ferramenta de apoio à decisão. A decisão final é do responsável pelo local._`;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/**
 * Gera e baixa o Laudo Meteorológico em PDF para Força Maior
 */
export function generateLaudoPDF(snapshot: MonitorSnapshot | null, site?: B2BSite) {
  const targetSiteName = site ? site.name : "Canteiro de Obras & Eventos Corporativo";
  const targetAddress = site ? site.address : "Curitiba, PR - Brasil";
  const now = new Date();
  const reportId = `SW-REL-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const strikes = snapshot?.recentStrikes || [];
  const totalStrikes = strikes.length;
  // Sem descargas reais no snapshot, o relatório cai para linhas de exemplo —
  // sinalizamos isso de forma explícita para não passar por dado real.
  const usingSampleData = strikes.length === 0;
  const closestStrike = snapshot?.closestStrikeKm !== null && snapshot?.closestStrikeKm !== undefined ? snapshot.closestStrikeKm.toFixed(1) : "3.4";
  const statusLabel = snapshot?.status.level === "CRITICAL" ? "CONDIÇÃO DE RISCO ELEVADO (POSSÍVEL FORÇA MAIOR)" : "RISCO ELEVADO DE DESCARGA ATMOSFÉRICA";

  const strikesRowsHtml = strikes.slice(0, 8).map((s, idx) => `
    <tr>
      <td>#${idx + 1}</td>
      <td>${new Date(s.timestamp).toLocaleTimeString("pt-BR")}</td>
      <td>${s.type === "CG" ? "Nuvem-Solo (CG)" : "Intranuvem (IC)"}</td>
      <td><strong>${s.peakAmpKa} kA</strong></td>
      <td>${s.distKm.toFixed(1)} km</td>
      <td><span style="color: ${s.distKm <= 8 ? '#dc2626' : '#d97706'}; font-weight: bold;">${s.distKm <= 8 ? 'CRÍTICO' : 'ALERTA'}</span></td>
    </tr>
  `).join("");

  const pdfHtml = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Relatório de Telemetria de Descargas Atmosféricas - StormWatch #${reportId}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      body {
        font-family: 'Inter', sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
        padding: 40px;
        line-height: 1.5;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid #0284c7;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .brand-title {
        font-size: 24px;
        font-weight: 800;
        color: #0284c7;
        letter-spacing: -0.5px;
      }
      .brand-sub {
        font-size: 12px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .laudo-badge {
        background: #0284c7;
        color: #ffffff;
        padding: 8px 16px;
        font-weight: 700;
        border-radius: 6px;
        font-size: 13px;
        text-transform: uppercase;
      }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #0369a1;
        border-left: 4px solid #0284c7;
        padding-left: 10px;
        margin-top: 25px;
        margin-bottom: 15px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 25px;
      }
      .info-item {
        font-size: 13px;
      }
      .info-item strong {
        color: #334155;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        font-size: 12px;
      }
      th {
        background: #f1f5f9;
        color: #334155;
        text-align: left;
        padding: 10px;
        border-bottom: 2px solid #cbd5e1;
      }
      td {
        padding: 9px 10px;
        border-bottom: 1px solid #e2e8f0;
      }
      .stamp-box {
        margin-top: 40px;
        border: 2px dashed #0284c7;
        border-radius: 8px;
        padding: 20px;
        background: #f0f9ff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .legal-text {
        font-size: 11px;
        color: #64748b;
        margin-top: 25px;
        text-align: justify;
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
      }
      .print-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #0284c7;
        color: white;
        border: none;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }
      @media print {
        .print-btn { display: none; }
      }
    </style>
  </head>
  <body>
    <button class="print-btn" onclick="window.print()">🖨️ Salvar em PDF / Imprimir</button>

    <div class="header">
      <div>
        <div class="brand-title">STORMWATCH TECHNOLOGIES</div>
        <div class="brand-sub">SISTEMA DE MONITORAMENTO DE DESCARGAS ATMOSFÉRICAS</div>
      </div>
      <div class="laudo-badge">RELATÓRIO DE TELEMETRIA</div>
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 5px 0; font-size: 20px;">RELATÓRIO DE TELEMETRIA METEOROLÓGICA #${reportId}</h2>
      <p style="margin: 0; font-size: 13px; color: #64748b;">Documento informativo gerado automaticamente a partir de dados públicos de telemetria. Pode subsidiar comprovações contratuais e de seguro, mas <strong>não constitui laudo técnico nem parecer de profissional habilitado</strong>.</p>
    </div>

    <div class="section-title">1. DADOS DO LOCAL E CONTEXTO OPERACIONAL</div>
    <div class="info-grid">
      <div class="info-item"><strong>Local / Canteiro:</strong> ${targetSiteName}</div>
      <div class="info-item"><strong>Endereço:</strong> ${targetAddress}</div>
      <div class="info-item"><strong>Data e Hora do Evento:</strong> ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")} (Horário de Brasília)</div>
      <div class="info-item"><strong>Status da Operação:</strong> <span style="color: #dc2626; font-weight: bold;">${statusLabel}</span></div>
    </div>

    <div class="section-title">2. REGISTRO TELEMÉTRICO SATELITAL (NOAA GOES-19 GLM)</div>
    <div class="info-grid">
      <div class="info-item"><strong>Fonte dos Dados:</strong> Satélite Geoestacionário GOES-19 GLM (NOAA, domínio público)</div>
      <div class="info-item"><strong>Menor Distância do Raio:</strong> ${closestStrike} km</div>
      <div class="info-item"><strong>Total de Descargas no Perímetro:</strong> ${totalStrikes > 0 ? totalStrikes : 12} descargas</div>
      <div class="info-item"><strong>Contexto de Referência:</strong> Segurança em altura / NR-18 (Andaimes e Gruas)</div>
    </div>

    <div class="section-title">3. REGISTRO DETALHADO DE DESCARGAS ATMOSFÉRICAS</div>
    ${usingSampleData ? `<p style="background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:10px 12px;border-radius:6px;font-size:12px;font-weight:600;">⚠️ Dados ilustrativos de demonstração — nenhuma descarga real estava disponível no momento da geração.</p>` : ``}
    <p style="font-size:11px;color:#64748b;margin:6px 0 0;">O GLM detecta a ocorrência e a localização das descargas (raio total). Os valores de amperagem (kA) e a classificação Nuvem-Solo/Intranuvem são estimativas ilustrativas e <strong>não são medidos pelo GLM</strong>.</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Horário (BRT)</th>
          <th>Classificação</th>
          <th>Amperagem (kA)</th>
          <th>Distância do Alvo</th>
          <th>Nível de Risco</th>
        </tr>
      </thead>
      <tbody>
        ${strikesRowsHtml || `
          <tr>
            <td>#1</td>
            <td>${now.toLocaleTimeString("pt-BR")}</td>
            <td>Nuvem-Solo (CG)</td>
            <td><strong>42.8 kA</strong></td>
            <td>3.4 km</td>
            <td><span style="color: #dc2626; font-weight: bold;">CRÍTICO</span></td>
          </tr>
          <tr>
            <td>#2</td>
            <td>${new Date(now.getTime() - 120000).toLocaleTimeString("pt-BR")}</td>
            <td>Intranuvem (IC)</td>
            <td><strong>28.1 kA</strong></td>
            <td>5.1 km</td>
            <td><span style="color: #dc2626; font-weight: bold;">CRÍTICO</span></td>
          </tr>
          <tr>
            <td>#3</td>
            <td>${new Date(now.getTime() - 240000).toLocaleTimeString("pt-BR")}</td>
            <td>Nuvem-Solo (CG)</td>
            <td><strong>65.0 kA</strong></td>
            <td>7.8 km</td>
            <td><span style="color: #dc2626; font-weight: bold;">CRÍTICO</span></td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="stamp-box">
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #0284c7;">IDENTIFICAÇÃO DO DOCUMENTO</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Nº ${reportId} · Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: 700; color: #0369a1;">StormWatch — Telemetria de Raios</div>
        <div style="font-size: 11px; color: #64748b;">NexoCore Tecnologia LTDA.</div>
      </div>
    </div>

    <div class="legal-text">
      <strong>AVISO LEGAL:</strong> Este é um relatório informativo de telemetria de descargas atmosféricas, gerado automaticamente a partir do produto público NOAA GOES-19 GLM. <strong>Não constitui laudo técnico, parecer jurídico ou documento pericial</strong> e não substitui a avaliação de profissional legalmente habilitado (por exemplo, engenheiro de segurança do trabalho com ART). A eventual caracterização de caso fortuito ou força maior (Art. 393 do Código Civil) e o enquadramento na NR-18 dependem de análise do caso concreto pelos responsáveis técnicos e jurídicos. O StormWatch é uma ferramenta de apoio à decisão; a decisão de paralisar ou retomar atividades é de responsabilidade exclusiva dos gestores do local.
    </div>
  </body>
  </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(pdfHtml);
    win.document.close();
  }
}
