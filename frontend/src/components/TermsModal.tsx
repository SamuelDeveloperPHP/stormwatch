import { useState } from "react";
import { DocumentIcon, LockIcon, WarnIcon } from "./ui-icons.tsx";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "terms" | "privacy";
}

export default function TermsModal({ isOpen, onClose, defaultTab = "terms" }: TermsModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Informações Legais & Transparência</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar modal">
            ✕
          </button>
        </header>

        <nav className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === "terms" ? "modal-tab--active" : ""}`}
            onClick={() => setActiveTab("terms")}
          >
            <DocumentIcon size={15} style={{ marginRight: 6 }} />Termos de Uso & Isenção
          </button>
          <button
            className={`modal-tab ${activeTab === "privacy" ? "modal-tab--active" : ""}`}
            onClick={() => setActiveTab("privacy")}
          >
            <LockIcon size={15} style={{ marginRight: 6 }} />Política de Privacidade (LGPD)
          </button>
        </nav>

        <div className="modal-body">
          {activeTab === "terms" ? (
            <article className="legal-text">
              <h3>Termos de Uso e Isenção de Responsabilidade</h3>
              <p className="legal-version">Versão 1.0 — Uso Gratuito e Informativo</p>
              
              <div className="legal-alert legal-alert--warning">
                <strong><WarnIcon size={15} style={{ marginRight: 6 }} />AVISO IMPORTANTE DE SEGURANÇA:</strong>
                <p>
                  O StormWatch é uma ferramenta tecnológica de apoio à decisão, de caráter informativo.
                  <strong> NÃO substitui os alertas oficiais da Defesa Civil, do INMET, os equipamentos e laudos de Segurança do Trabalho (NR-10 / NBR 5419), nem a avaliação de profissional legalmente habilitado (engenheiro de segurança do trabalho com ART).</strong>
                </p>
              </div>

              <h4>1. Gratuidade e Caráter Informativo</h4>
              <p>
                O StormWatch é fornecido gratuitamente para fins exclusivamente de informação, educação e consulta visual de dados meteorológicos e descargas atmosféricas.
              </p>

              <h4>2. Cláusula de Fornecimento "AS IS" (Como Está)</h4>
              <p>
                O serviço é disponibilizado "COMO ESTÁ" (<em>AS IS</em>) e "CONFORME DISPONÍVEL", sem qualquer garantia explícita, implícita ou legal referente à exatidão geográfica, precisão do tempo de detecção de raios, disponibilidade ininterrupta do servidor ou adequação a propósitos específicos.
              </p>

              <h4>3. Limitação de Responsabilidade por Danos</h4>
              <p>
                Na máxima extensão permitida pela legislação aplicável, os desenvolvedores, mantenedores e colaboradores do StormWatch <strong>não serão responsáveis</strong> por danos diretos, indiretos, materiais, pessoais, morais ou lucros cessantes decorrentes de:
              </p>
              <ul>
                <li>Decisões tomadas ou ações realizadas com base nas informações exibidas no mapa e painéis;</li>
                <li>Eventuais atrasos, imprecisões ou omissões na detecção de raios ou previsão do tempo;</li>
                <li>Indisponibilidade temporária de conectividade com as fontes de dados (ex: NOAA GOES-19, Open-Meteo).</li>
              </ul>

              <h4>4. Exclusiva Responsabilidade do Usuário</h4>
              <p>
                O usuário reconhece e concorda que a tomada de decisões sobre segurança pessoal, busca de abrigo ou paralisação/retomada de atividades ao ar livre é de sua <strong>exclusiva responsabilidade</strong>, cabendo sempre o bom senso.
              </p>

              <h4>5. Precisão dos Dados e Limitações Técnicas</h4>
              <p>
                Os dados de raios provêm do produto público NOAA GOES-19 GLM, que detecta a ocorrência e a localização das descargas com incerteza de posição da ordem de ~10&nbsp;km e latência típica de 1 a 2 minutos, a partir de <strong>fonte única</strong>. Valores de amperagem (kA) e a classificação Nuvem-Solo/Intranuvem, quando exibidos, são <strong>estimativas ilustrativas</strong> e não são medidos pelo GLM.
              </p>

              <h4>6. Módulos Pagos, Alertas e Relatórios (B2B)</h4>
              <p>
                O geofencing, os alertas por WhatsApp/SMS e os relatórios em PDF são recursos de <strong>apoio à decisão</strong>. A entrega de alertas depende de terceiros (operadoras, WhatsApp) e não é garantida. Os relatórios gerados são <strong>registros de telemetria</strong> — não constituem laudo técnico, parecer pericial ou jurídico, e não substituem documento assinado por profissional habilitado (ART). O uso comercial é regido por contrato específico, que prevalece sobre estes Termos no que for divergente.
              </p>

              <h4>7. Alteração e Descontinuidade</h4>
              <p>
                Por se tratar de um serviço público gratuito, reservamo-nos o direito de alterar, suspender ou descontinuar a aplicação a qualquer tempo, sem prévio aviso.
              </p>
            </article>
          ) : (
            <article className="legal-text">
              <h3>Política de Privacidade (LGPD)</h3>
              <p className="legal-version">Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>

              <h4>1. Coleta e Uso de Geolocalização</h4>
              <p>
                Para apresentar a distância exata em relação aos raios detectados e exibir a sua cidade no radar, a aplicação solicita acesso à geolocalização do seu navegador (latitude e longitude). Esses dados são processados localmente em seu dispositivo e utilizados exclusivamente para consultar o feed meteorológico da sua região.
              </p>

              <h4>2. Coleta Mínima e Transparência</h4>
              <p>
                O StormWatch <strong>não vende, aluga nem compartilha</strong> seus dados pessoais com redes de anúncios ou parceiros comerciais. Não utilizamos cookies de rastreamento publicitário (*ad-tracking*).
              </p>

              <h4>3. Provedores de Serviço Essenciais</h4>
              <p>
                As consultas meteorológicas e de mapeamento são realizadas enviando apenas as coordenadas geográficas genéricas necessárias para carregar os blocos do mapa (OpenStreetMap) e os dados de previsão (Open-Meteo e NOAA).
              </p>

              <h4>4. Seus Direitos (Art. 18 da LGPD)</h4>
              <p>
                Você pode revogar a permissão de geolocalização a qualquer momento nas configurações do seu navegador de internet.
              </p>
            </article>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn-modal-agree" onClick={onClose}>
            Entendi e Concordo
          </button>
        </footer>
      </div>
    </div>
  );
}
