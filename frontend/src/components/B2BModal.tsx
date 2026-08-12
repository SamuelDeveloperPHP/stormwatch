import React, { useState } from "react";
import type { MonitorSnapshot } from "../types.ts";
import { type B2BSite, INITIAL_B2B_SITES, sendWhatsAppAlertSimulation, generateLaudoPDF } from "../b2bModules.ts";
import { CloseIcon, WarnIcon, ShieldCheckIcon, BoltIcon } from "./ui-icons.tsx";

interface B2BModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: MonitorSnapshot | null;
  selectedSite: B2BSite | null;
  onSelectSite: (site: B2BSite) => void;
}

export default function B2BModal({ isOpen, onClose, snapshot, selectedSite, onSelectSite }: B2BModalProps) {
  const [sites, setSites] = useState<B2BSite[]>(INITIAL_B2B_SITES);
  const [activeTab, setActiveTab] = useState<"geofence" | "whatsapp" | "laudo" | "multisite">("geofence");

  // Formulário de novo canteiro
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCategory, setNewSiteCategory] = useState<"Obra" | "Evento" | "Porto / Indústria">("Obra");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newSitePhone, setNewSitePhone] = useState("5541988885871");
  const [newSiteWorkers, setNewSiteWorkers] = useState("30");

  if (!isOpen) return null;

  const currentSite = selectedSite || sites[0];

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteAddress) return;

    const created: B2BSite = {
      id: `site-${Date.now()}`,
      name: newSiteName,
      category: newSiteCategory,
      address: newSiteAddress,
      lat: -25.4400 + (Math.random() - 0.5) * 0.05,
      lon: -49.2700 + (Math.random() - 0.5) * 0.05,
      criticalRadiusKm: 8,
      alertRadiusKm: 15,
      workersCount: parseInt(newSiteWorkers) || 20,
      managerPhone: newSitePhone,
      activeStatus: "LIBERADO",
      allClearTimerSec: 0,
    };

    setSites([created, ...sites]);
    onSelectSite(created);
    setNewSiteName("");
    setNewSiteAddress("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content b2b-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840, width: "95%" }}>
        
        {/* Header do Modal B2B */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="brand-dot" style={{ background: "#0284c7", width: 12, height: 12 }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                Módulos B2B Enterprise & Obras ⚡
              </h2>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
                Gestão de Geofencing, Alertas via WhatsApp e Emissão de Relatórios de Telemetria
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS B2B */}
        <div className="b2b-tab-bar" style={{ display: "flex", gap: 8, marginTop: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12, overflowX: "auto" }}>
          <button
            className={`b2b-tab-btn ${activeTab === "geofence" ? "active" : ""}`}
            onClick={() => setActiveTab("geofence")}
          >
            📍 Geofencing & Locais ({sites.length})
          </button>
          <button
            className={`b2b-tab-btn ${activeTab === "whatsapp" ? "active" : ""}`}
            onClick={() => setActiveTab("whatsapp")}
          >
            📲 Alertas WhatsApp (NR-18)
          </button>
          <button
            className={`b2b-tab-btn ${activeTab === "laudo" ? "active" : ""}`}
            onClick={() => setActiveTab("laudo")}
          >
            📄 Emitir Relatório PDF
          </button>
          <button
            className={`b2b-tab-btn ${activeTab === "multisite" ? "active" : ""}`}
            onClick={() => setActiveTab("multisite")}
          >
            🏢 Multi-Sítios & Equipes
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="b2b-tab-body" style={{ paddingTop: 20, maxHeight: "65vh", overflowY: "auto" }}>

          {/* TAB 1: GEOFENCING & OBRAS */}
          {activeTab === "geofence" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                
                {/* Lista de Locais Cadastrados */}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>Canteiros & Arenas Monitoradas</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sites.map((site) => {
                      const isSelected = currentSite.id === site.id;
                      return (
                        <div
                          key={site.id}
                          onClick={() => onSelectSite(site)}
                          style={{
                            padding: 14,
                            borderRadius: 12,
                            border: `1px solid ${isSelected ? "#0284c7" : "var(--line)"}`,
                            background: isSelected ? "rgba(2, 132, 199, 0.08)" : "var(--panel)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "var(--chip)", color: "#0284c7" }}>
                              {site.category}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>
                              ● {site.workersCount} Operários em Proteção
                            </span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                            {site.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                            📍 {site.address}
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-soft)" }}>
                            <span><strong>Raio Crítico:</strong> {site.criticalRadiusKm} km</span>
                            <span><strong>Raio Alerta:</strong> {site.alertRadiusKm} km</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cadastrar Novo Local */}
                <div style={{ background: "var(--chip)", padding: 18, borderRadius: 14, border: "1px solid var(--line)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>➕ Adicionar Novo Canteiro / Evento</h3>
                  <form onSubmit={handleAddSite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nome da Obra ou Local:</label>
                      <input
                        type="text"
                        placeholder="Ex: Obra Residenzial Torre II"
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Categoria:</label>
                      <select
                        value={newSiteCategory}
                        onChange={(e) => setNewSiteCategory(e.target.value as any)}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                      >
                        <option value="Obra">Obra & Construção Civil</option>
                        <option value="Evento">Show & Arena de Eventos</option>
                        <option value="Porto / Indústria">Porto / Mineração / Indústria</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Endereço Completo:</label>
                      <input
                        type="text"
                        placeholder="Ex: Av. Batel, 1500 - Curitiba - PR"
                        value={newSiteAddress}
                        onChange={(e) => setNewSiteAddress(e.target.value)}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>WhatsApp do Gerente:</label>
                        <input
                          type="text"
                          placeholder="5541988885871"
                          value={newSitePhone}
                          onChange={(e) => setNewSitePhone(e.target.value)}
                          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nº de Trabalhadores:</label>
                        <input
                          type="number"
                          placeholder="45"
                          value={newSiteWorkers}
                          onChange={(e) => setNewSiteWorkers(e.target.value)}
                          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-plan-action btn-plan-action--pro" style={{ marginTop: 6 }}>
                      Ativar Geofencing de Alerta (8km / 15km)
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ALERTAS WHATSAPP NR-18 */}
          {activeTab === "whatsapp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "rgba(2, 132, 199, 0.08)", border: "1px solid #0284c7", padding: 16, borderRadius: 12 }}>
                <h4 style={{ margin: "0 0 6px 0", color: "#0284c7", fontSize: 15, fontWeight: 700 }}>
                  📲 Simulação de Disparo de Alerta NR-18 no WhatsApp
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
                  Teste abaixo o envio em tempo real dos 3 níveis de alerta para o celular cadastrado (<code>{currentSite.managerPhone}</code>) do local <strong>{currentSite.name}</strong>:
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                
                {/* Alerta Crítico */}
                <div style={{ background: "var(--panel)", border: "1px solid #ef4444", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#dc2626", fontWeight: 800 }}>
                    <BoltIcon size={20} /> ALERTA CRÍTICO (NR-18)
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, flex: 1 }}>
                    Notificação de paralisação imediata de trabalhos em gruas e andaimes quando um raio é detectado dentro dos <strong>8 km</strong>.
                  </p>
                  <button
                    onClick={() => sendWhatsAppAlertSimulation(currentSite, "CRITICAL")}
                    style={{ background: "#dc2626", color: "#ffffff", border: "none", padding: 10, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                  >
                    🚨 Testar Alerta Crítico no WhatsApp
                  </button>
                </div>

                {/* Alerta de Atenção */}
                <div style={{ background: "var(--panel)", border: "1px solid #f59e0b", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d97706", fontWeight: 800 }}>
                    <WarnIcon size={20} /> ALERTA DE ATENÇÃO (15 KM)
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, flex: 1 }}>
                    Aviso preventivo para evacuação prévia de áreas abertas e preparação para interrupção de concretagem.
                  </p>
                  <button
                    onClick={() => sendWhatsAppAlertSimulation(currentSite, "WARNING")}
                    style={{ background: "#d97706", color: "#ffffff", border: "none", padding: 10, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                  >
                    ⚠️ Testar Alerta Atenção no WhatsApp
                  </button>
                </div>

                {/* Status Tudo Limpo */}
                <div style={{ background: "var(--panel)", border: "1px solid #10b981", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", fontWeight: 800 }}>
                    <ShieldCheckIcon size={20} /> STATUS TUDO LIMPO (30 MIN)
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, flex: 1 }}>
                    Mensagem de liberação dos trabalhos após término da contagem de 30 minutos sem incidência de novas descargas.
                  </p>
                  <button
                    onClick={() => sendWhatsAppAlertSimulation(currentSite, "ALL_CLEAR")}
                    style={{ background: "#059669", color: "#ffffff", border: "none", padding: 10, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                  >
                    ✅ Testar "Tudo Limpo" no WhatsApp
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: EMISSÃO DE LAUDO PDF */}
          {activeTab === "laudo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--chip)", padding: 18, borderRadius: 14, border: "1px solid var(--line)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 }}>
                  📄 Gerador de Relatórios de Telemetria para Seguradoras & Fiscalização
                </h4>
                <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "var(--ink-soft)" }}>
                  O documento registra os dados de telemetria de descargas do <strong>NOAA GOES-19 GLM</strong> (fonte pública) e pode subsidiar comprovações contratuais. <strong>Não é um laudo técnico</strong> e não substitui a avaliação de profissional habilitado (engenheiro com ART).
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <button
                    onClick={() => generateLaudoPDF(snapshot, currentSite)}
                    className="btn-plan-action btn-plan-action--enterprise"
                    style={{ padding: "12px 24px", fontSize: 14, fontWeight: 800, width: "auto" }}
                  >
                    🖨️ Gerar Relatório de Telemetria em PDF
                  </button>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    ● Válido para o local selecionado: <strong>{currentSite.name}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-SÍTIOS */}
          {activeTab === "multisite" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
                <div style={{ background: "var(--chip)", padding: 16, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>LOCAIS MONITORADOS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0284c7" }}>{sites.length} Canteiros</div>
                </div>
                <div style={{ background: "var(--chip)", padding: 16, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>TRABALHADORES EM PROTEÇÃO</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
                    {sites.reduce((acc, s) => acc + s.workersCount, 0)} Pessoas
                  </div>
                </div>
                <div style={{ background: "var(--chip)", padding: 16, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>FONTE DE TELEMETRIA</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#ec4899" }}>NOAA GOES-19</div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
