import React, { useRef, useState } from "react";
import {
  type MonitorSite,
  MAX_SITES,
  nextWipeDate,
  exportSitesJson,
  parseSitesJson,
} from "../locations.ts";
import { CloseIcon } from "./ui-icons.tsx";

interface LocationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sites: MonitorSite[];
  onSitesChange: (sites: MonitorSite[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGenerateReport: (site: MonitorSite | null) => void;
  reportAvailable: boolean;
}

export default function LocationsPanel({
  isOpen,
  onClose,
  sites,
  onSitesChange,
  selectedId,
  onSelect,
  onGenerateReport,
  reportAvailable,
}: LocationsPanelProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<"Obra" | "Evento" | "Porto / Indústria" | "Escritório" | "Outro">("Obra");
  const [responsibleName, setResponsibleName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [latVal, setLatVal] = useState("-25.4411");
  const [lonVal, setLonVal] = useState("-49.2782");
  const [critical, setCritical] = useState("8");
  const [alert, setAlert] = useState("15");
  const [people, setPeople] = useState("0");

  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [geoSuccessMsg, setGeoSuccessMsg] = useState<string | null>(null);
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const atLimit = sites.length >= MAX_SITES;
  const currentId = selectedId || sites[0]?.id || null;
  const nextWipe = nextWipeDate().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Busca de Coordenadas por Geocoding (OpenStreetMap Nominatim)
  const handleSearchCoordinates = async () => {
    if (!address.trim()) {
      setGeoErrorMsg("Digite o endereço para realizar a busca.");
      return;
    }
    setIsSearchingGeo(true);
    setGeoErrorMsg(null);
    setGeoSuccessMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latNum = parseFloat(data[0].lat);
        const lonNum = parseFloat(data[0].lon);
        setLatVal(latNum.toFixed(5));
        setLonVal(lonNum.toFixed(5));
        setGeoSuccessMsg(`📍 Localizado! Lat: ${latNum.toFixed(4)}, Lon: ${lonNum.toFixed(4)}`);
      } else {
        setGeoErrorMsg("Endereço não localizado. Ajuste a grafia ou insira as coordenadas manualmente.");
      }
    } catch {
      setGeoErrorMsg("Falha na busca de coordenadas. Verifique a conexão.");
    } finally {
      setIsSearchingGeo(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || atLimit) return;
    const parsedLat = parseFloat(latVal) || -25.4411;
    const parsedLon = parseFloat(lonVal) || -49.2782;

    const site: MonitorSite = {
      id: `site-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      lat: parsedLat,
      lon: parsedLon,
      criticalRadiusKm: parseInt(critical) || 8,
      alertRadiusKm: parseInt(alert) || 15,
      peopleCount: parseInt(people) || 0,
      category,
      responsibleName: responsibleName.trim(),
      managerPhone: managerPhone.trim(),
    };
    onSitesChange([...sites, site]);
    onSelect(site.id);
    setName("");
    setAddress("");
    setResponsibleName("");
    setManagerPhone("");
    setPeople("0");
    setGeoSuccessMsg(null);
    setGeoErrorMsg(null);
  };

  const handleRemove = (id: string) => {
    onSitesChange(sites.filter((s) => s.id !== id));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseSitesJson(text);
      onSitesChange(parsed);
      if (parsed[0]) onSelect(parsed[0].id);
      setImportError(null);
    } catch {
      setImportError("Não foi possível ler o arquivo .json.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const selectedSite = sites.find((s) => s.id === currentId) || null;

  return (
    <>
      {isOpen && <div className="locations-backdrop" onClick={onClose} />}

      <aside className={`locations-drawer ${isOpen ? "locations-drawer--open" : ""}`} aria-hidden={!isOpen}>
        <div className="locations-drawer-header">
          <div>
            <h2>Locais de Monitoramento 📍</h2>
            <span className="locations-count">
              {sites.length}/{MAX_SITES} locais cadastrados
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar painel">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="locations-drawer-body">
          <p className="locations-notice">
            🔒 Seus locais ficam salvos <strong>apenas neste navegador</strong> e são apagados
            automaticamente <strong>toda segunda-feira às 01:00</strong> (próxima: {nextWipe}).
            Exporte um arquivo <code>.json</code> para guardar ou levar a outro dispositivo.
          </p>

          <div className="locations-io">
            <button
              className="loc-btn loc-btn--ghost"
              onClick={() => exportSitesJson(sites)}
              disabled={sites.length === 0}
            >
              ⬇️ Exportar .json
            </button>
            <button className="loc-btn loc-btn--ghost" onClick={() => fileRef.current?.click()}>
              ⬆️ Importar .json
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={handleImport}
            />
          </div>
          {importError && <p className="loc-error">{importError}</p>}

          {/* Lista de locais */}
          <div className="locations-list">
            {sites.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                Nenhum local cadastrado ainda. Adicione até {MAX_SITES} abaixo com busca por endereço.
              </p>
            )}
            {sites.map((site) => {
              const isSel = currentId === site.id;
              return (
                <div
                  key={site.id}
                  className={`loc-card ${isSel ? "loc-card--sel" : ""}`}
                  onClick={() => onSelect(site.id)}
                >
                  <div className="loc-card-top">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "var(--chip)", color: "#0284c7" }}>
                        {site.category || "Obra"}
                      </span>
                      <strong>{site.name}</strong>
                    </div>
                    <button
                      className="loc-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(site.id);
                      }}
                      aria-label="Remover local"
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                  {site.address && <div className="loc-card-addr">📍 {site.address}</div>}
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", margin: "4px 0" }}>
                    🌐 GPS: {site.lat.toFixed(4)}, {site.lon.toFixed(4)}
                  </div>
                  {site.responsibleName && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      👤 Resp: <strong>{site.responsibleName}</strong> {site.managerPhone && `(${site.managerPhone})`}
                    </div>
                  )}
                  <div className="loc-card-meta" style={{ marginTop: 6 }}>
                    <span>🔴 Crítico: {site.criticalRadiusKm} km</span>
                    <span>🟠 Alerta: {site.alertRadiusKm} km</span>
                    {site.peopleCount > 0 && <span>👥 {site.peopleCount} operários</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulário de novo local com Geocoding */}
          {!atLimit ? (
            <form className="loc-form" onSubmit={handleAdd}>
              <h3>➕ Adicionar local de monitoramento</h3>
              
              <label>
                Categoria do Local
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)" }}
                >
                  <option value="Obra">Obra / Construção Civil</option>
                  <option value="Evento">Show / Arena de Eventos</option>
                  <option value="Porto / Indústria">Porto / Mineração / Indústria</option>
                  <option value="Escritório">Escritório / Sede Corporativa</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>

              <label>
                Nome do Canteiro / Local
                <input
                  type="text"
                  placeholder="Ex.: Torre Horizon — Canteiro Batel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label>
                Endereço Completo para Busca de GPS
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Ex.: Av. Batel, 1500 - Curitiba - PR"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchCoordinates}
                    disabled={isSearchingGeo}
                    style={{ background: "#0284c7", color: "#fff", border: "none", padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {isSearchingGeo ? "Buscando..." : "🔍 Buscar Coordenadas"}
                  </button>
                </div>
              </label>

              {geoSuccessMsg && <p style={{ fontSize: 12, color: "#16a34a", margin: "4px 0 8px 0", fontWeight: 600 }}>{geoSuccessMsg}</p>}
              {geoErrorMsg && <p style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 8px 0", fontWeight: 600 }}>{geoErrorMsg}</p>}

              <div className="loc-form-row">
                <label>
                  Latitude (GPS)
                  <input type="text" value={latVal} onChange={(e) => setLatVal(e.target.value)} />
                </label>
                <label>
                  Longitude (GPS)
                  <input type="text" value={lonVal} onChange={(e) => setLonVal(e.target.value)} />
                </label>
              </div>

              <div className="loc-form-row">
                <label>
                  Engenheiro / Responsável
                  <input
                    type="text"
                    placeholder="Ex: Eng. Carlos"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                  />
                </label>
                <label>
                  WhatsApp Alertas
                  <input
                    type="text"
                    placeholder="5541988885871"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                  />
                </label>
              </div>

              <div className="loc-form-row">
                <label>
                  Raio crítico (km)
                  <input type="number" min="1" value={critical} onChange={(e) => setCritical(e.target.value)} />
                </label>
                <label>
                  Raio de alerta (km)
                  <input type="number" min="1" value={alert} onChange={(e) => setAlert(e.target.value)} />
                </label>
                <label>
                  Nº de pessoas
                  <input type="number" min="0" value={people} onChange={(e) => setPeople(e.target.value)} />
                </label>
              </div>

              <button type="submit" className="loc-btn loc-btn--primary">
                + Salvar e Monitorar este Local
              </button>
            </form>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Limite de {MAX_SITES} locais atingido. Remova um para adicionar outro.
            </p>
          )}

          {/* Relatório PDF (1 por dia por máquina) */}
          <div className="locations-report">
            <h3>Relatório de telemetria (PDF)</h3>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
              {selectedSite ? (
                <>Local selecionado: <strong>{selectedSite.name}</strong>.</>
              ) : (
                <>Sem local selecionado — usa a localização atual do monitor.</>
              )}{" "}
              Limite de 1 relatório por dia por máquina.
            </p>
            <button
              className="loc-btn loc-btn--primary"
              disabled={!reportAvailable}
              onClick={() => onGenerateReport(selectedSite)}
            >
              {reportAvailable ? "📄 Emitir Relatório PDF" : "✅ Relatório de hoje já emitido"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
