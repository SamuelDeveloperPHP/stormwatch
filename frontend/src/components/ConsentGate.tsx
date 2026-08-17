import { useState } from "react";

/**
 * Portão de consentimento — aparece ao acessar o site e BLOQUEIA o app até o
 * usuário aceitar os Termos. Exibido uma vez por sessão (controle no App via
 * sessionStorage). Reforça o aviso de isenção (ferramenta de apoio à decisão).
 */
interface ConsentGateProps {
  onAccept: () => void;
  onOpenTerms: (tab: "terms" | "privacy") => void;
}

export default function ConsentGate({ onAccept, onOpenTerms }: ConsentGateProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="consent-card">
        <h2 id="consent-title" className="consent-title">
          ⚠️ Antes de usar o StormWatch
        </h2>

        <div className="legal-alert legal-alert--warning consent-alert">
          <p>
            <strong>Ferramenta de apoio à decisão.</strong> Não substitui os protocolos de
            segurança do local, os alertas oficiais da Defesa Civil/INMET nem a avaliação de
            profissional habilitado. Fonte única (GOES-19), incerteza de ~10&nbsp;km e latência de
            1–2&nbsp;min. Parar ou retomar atividades é responsabilidade do usuário.
          </p>
        </div>

        <p className="consent-links">
          Recomendamos ler os{" "}
          <button type="button" className="terms-trigger-btn" onClick={() => onOpenTerms("terms")}>
            Termos de Uso
          </button>{" "}
          e a{" "}
          <button type="button" className="terms-trigger-btn" onClick={() => onOpenTerms("privacy")}>
            Política de Privacidade
          </button>
          .
        </p>

        <label className="consent-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
        </label>

        <div className="consent-footer">
          <button
            type="button"
            className="consent-accept-btn"
            disabled={!checked}
            onClick={onAccept}
          >
            Aceitar e continuar
          </button>
        </div>
      </div>
    </div>
  );
}
