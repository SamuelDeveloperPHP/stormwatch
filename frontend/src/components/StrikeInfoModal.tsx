import { BoltIcon, CloudIcon } from "./ui-icons.tsx";

interface StrikeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export default function StrikeInfoModal({ isOpen, onClose }: StrikeInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="info-modal-title">
            <span className="info-modal-icon"><BoltIcon size={22} /></span>
            <div>
              <h2>Guia de Leitura & Intensidade de Raios</h2>
              <p className="modal-subtitle">Entenda o que significam os dados em tempo real</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body info-modal-body">
          <p
            className="estimate-note"
            style={{ marginTop: 0, borderTop: "none", background: "var(--watch-bg)", border: "1px solid var(--watch-border)", borderRadius: 8, padding: "10px 12px" }}
          >
            ⚠️ Este guia é educativo. No StormWatch, a <strong>amperagem (kA)</strong> e a
            classificação <strong>Nuvem-Solo (CG) / Intra-Nuvem (IC)</strong> são{" "}
            <strong>estimativas ilustrativas</strong>: o satélite GLM detecta a ocorrência e a
            localização das descargas (raio total), mas não mede amperagem nem separa CG/IC.
          </p>

          {/* Seção 1: Tipos de Descargas Elétricas */}
          <div className="info-section">
            <h3>1. Tipos de Raios</h3>
            <div className="info-cards-grid">
              <div className="info-card info-card--cg">
                <div className="info-card-header">
                  <span className="info-icon-badge info-icon-badge--cg"><BoltIcon size={14} style={{ marginRight: 5 }} />Nuvem-Solo (CG)</span>
                  <span className="info-tag info-tag--alert">Perigo Real</span>
                </div>
                <p>
                  Descarga elétrica que atinge a terra. É o raio mais perigoso para pessoas,
                  edificações e equipamentos eletrônicos.
                </p>
              </div>

              <div className="info-card info-card--ic">
                <div className="info-card-header">
                  <span className="info-icon-badge info-icon-badge--ic"><CloudIcon size={14} style={{ marginRight: 5 }} />Intra-Nuvem (IC)</span>
                  <span className="info-tag info-tag--info">Atividade Elétrica</span>
                </div>
                <p>
                  Ocorre no interior ou entre nuvens. Não toca o solo, mas indica o grau de
                  eletrificação e intensidade da tempestade.
                </p>
              </div>
            </div>
          </div>

          {/* Seção 2: Intensidade em Kiloamperes (kA) */}
          <div className="info-section">
            <h3>2. Intensidade da Corrente (Kiloamperes - kA)</h3>
            <p className="info-section-desc">
              Medida do pico de amperagem da descarga elétrica (1 kA = 1.000 Ampères):
            </p>
            <div className="ka-levels-list">
              <div className="ka-level-item">
                <span className="amp-badge amp-badge--low">Até 20 kA</span>
                <div className="ka-level-info">
                  <strong>Baixa Intensidade:</strong> Comum em raios intra-nuvem e descargas menores.
                </div>
              </div>

              <div className="ka-level-item">
                <span className="amp-badge amp-badge--med">20 kA a 30 kA</span>
                <div className="ka-level-info">
                  <strong>Intensidade Moderada:</strong> Média típica dos raios que atingem o solo no Brasil.
                </div>
              </div>

              <div className="ka-level-item">
                <span className="amp-badge amp-badge--high">&gt; 30 kA a 100+ kA</span>
                <div className="ka-level-info">
                  <strong>Intensidade Alta / Extrema:</strong> Descargas superpotentes com grande poder destrutivo e alto risco de queima de aparelhos pela rede.
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Cores dos Cards & Proximidade */}
          <div className="info-section">
            <h3>3. Alerta por Distância da Sua Posição</h3>
            <div className="distance-alerts">
              <div className="dist-alert-item dist-alert-item--near">
                <div className="dist-badge dist-badge--near">&lt; 8 km</div>
                <div>
                  <strong>Card Vermelho (ZONA CRÍTICA):</strong> Raio registrado dentro da zona de risco crítica (&lt; 8 km do seu ponto).
                </div>
              </div>

              <div className="dist-alert-item dist-alert-item--safe">
                <div className="dist-badge dist-badge--safe">&gt; 8 km</div>
                <div>
                  <strong>Card Padrão (Monitoramento):</strong> Raio registrado a mais de 8 km do seu ponto.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-agree" onClick={onClose}>
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}
