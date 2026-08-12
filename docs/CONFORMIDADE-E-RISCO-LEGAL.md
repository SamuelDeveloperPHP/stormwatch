# StormWatch — Conformidade & Risco Legal

> **Aviso:** este documento é um **material interno de apoio**, preparado para
> organizar a discussão com profissionais. **Não é parecer jurídico.** Antes de
> operar comercialmente, submeta-o à revisão de um **advogado** (direito digital
> + responsabilidade civil/consumidor) e de um **engenheiro de segurança do
> trabalho** (parte de NR-18 / laudos / ART).
>
> Última atualização: 2026-08-12.

---

## 1. O risco central

O StormWatch é um **sistema de apoio à decisão de segurança**. O risco jurídico
relevante não é "ser processado por existir" — é **alguém se acidentar por um
raio** num momento em que o sistema falhou, ficou indisponível, atrasou ou
exibiu "LIBERADO". É o binômio **dano + falha/negligência** que gera
responsabilidade. Todas as mitigações abaixo servem para reduzir essa exposição
e para **demonstrar diligência**.

---

## 2. As três perguntas

### 2.1 A responsabilidade recai sobre mim?
Pode recair, como **desenvolvedor e fornecedor** — a responsabilidade civil no
Brasil independe de contrato ou pagamento (Código Civil, arts. 186 e 927). Para
afastar da **pessoa física**, operar tudo pela **NexoCore Tecnologia LTDA**
(separa o patrimônio pessoal). A proteção da LTDA cai apenas em casos de fraude,
abuso ou dívidas específicas (desconsideração da personalidade jurídica) — por
isso a empresa precisa ser real e bem operada.

### 2.2 Ser gratuito me protege de processo?
**Reduz, mas não blinda.**
- Responsabilidade civil geral **não depende de ter cobrado**.
- O **CDC** pode se aplicar mesmo a serviço gratuito quando há **remuneração
  indireta** (freemium que alimenta planos pagos, geração de leads, dados).
- O que segura um processo é **não causar dano** + **agir com diligência**
  (avisos claros, fail-safe, sem promessas falsas).

### 2.3 E se eu comercializar?
- **B2C (consumidor final):** CDC aplica cheio, com **responsabilidade objetiva**
  por defeito do serviço (art. 14) — responde-se mesmo sem culpa.
- **B2B (construtoras, produtoras — foco atual):** o **contrato** permite
  **limitar e alocar responsabilidade**; cláusulas de limitação são bem mais
  aceitas entre empresas. É o caminho de menor risco.
- **Promessas viram obrigação contratual:** "SLA 24/7", "99.9%",
  "conformidade NR-18" — não prometa o que não pode garantir, ainda mais com
  **fonte única** de dados (GOES-19).

---

## 3. Pontos mais sensíveis do produto (e status)

| Ponto | Risco | Status |
|---|---|---|
| "Laudo oficial de força maior" + "parecer jurídico" no PDF | Implica autoridade técnica/legal que o documento não tem | ✅ **Corrigido** — vira "Relatório de Telemetria" com aviso legal |
| Hash SHA256 falso (`Math.random`) como "autenticação" | Autenticidade fabricada | ✅ **Corrigido** — removido; substituído por ID + data de geração |
| Dados de exemplo (kA, CG/IC) apresentados como reais | GLM não mede amperagem nem classifica CG/IC | ✅ **Corrigido** — rótulo de "dados ilustrativos" + nota de limitação |
| "Conformidade NR-18" no marketing | Sugere que o uso torna a obra "conforme" | ✅ **Ajustado** — vira "apoio à NR-18 / à conformidade" |
| "SLA 99.9% GOES-19" | Garantia de disponibilidade sobre fonte única | ✅ **Ajustado** — vira "Fonte de telemetria: NOAA GOES-19" |
| Mensagens "Ação exigida / liberado com segurança" | Assume a decisão no lugar do responsável | ✅ **Ajustado** — vira recomendação + "decisão final é do responsável" |
| Falso "LIBERADO" causando acidente | Cenário de dano | ⚠️ Mitigado por fail-safe + disclaimers; manter **logs/auditoria** |
| Análise de amperagem (kA) / separação CG-IC no marketing | Recurso divulgado que a fonte não fornece | ⏳ **Rever** posicionamento com o time |

---

## 4. O que já joga a favor (diligência demonstrável)

- **Fail-safe**: o sistema nunca declara "seguro" sem dado — em falha/atraso
  exibe "monitoramento indisponível".
- **Disclaimers de transparência** no doc técnico e agora **visíveis no app**
  (rodapé do monitor, Termos de Uso reforçados, aviso legal dentro do relatório).
- **Política de Privacidade (LGPD)** já publicada.
- **Registro de dados/telemetria** que pode servir de prova de funcionamento.

---

## 5. Mitigações feitas nesta rodada (no código)

- **Termos de Uso** (`TermsModal.tsx`): limitação de responsabilidade "na máxima
  extensão permitida"; nova seção de **precisão/limitações técnicas**; nova seção
  de **módulos pagos, alertas e relatórios** (apoio à decisão, entrega de alerta
  não garantida, relatório não é laudo, uso comercial regido por contrato).
- **Disclaimer visível** no rodapé do monitor (`App.tsx` + `.safety-disclaimer`).
- **Relatório PDF** (`b2bModules.ts`): renomeado de "laudo oficial" para
  "relatório de telemetria"; removidos "parecer jurídico" e hash falso; adicionados
  avisos de limitação (kA/CG-IC ilustrativos) e de "dados de demonstração".
- **Textos de marketing** (landing + modal B2B): "laudo/força maior/conformidade"
  → "relatório de telemetria / apoio à conformidade"; "SLA 99.9%" → "fonte GOES-19".
- **Mensagens de WhatsApp**: reformuladas para recomendação, com "a decisão final
  é do responsável pelo local".

---

## 6. Checklist para levar ao advogado / engenheiro

**Jurídico / contratos**
- [ ] Revisar e validar os **Termos de Uso** (versão do app) — inclusive a
      cláusula de limitação e o **teto de responsabilidade** (ex.: valor pago nos
      últimos 12 meses).
- [ ] **Contrato B2B** padrão (SaaS): objeto, SLA realista, limitação de
      responsabilidade, isenção para decisões de segurança, LGPD (papéis de
      controlador/operador), foro.
- [ ] Modelo de **Termos comerciais** distinto do uso gratuito.
- [ ] Avaliar necessidade de **consentimento/aceite registrado** (checkbox + log)
      antes do uso.

**Técnico / NR-18**
- [ ] Definir com **engenheiro de segurança do trabalho** se os relatórios podem
      ser assinados por profissional habilitado (com **ART**) ou se permanecem
      como "registro de telemetria" informativo.
- [ ] Revisar o uso das expressões "NR-18", "laudo", "força maior" no produto.
- [ ] Decidir o posicionamento de **amperagem (kA)** e **CG/IC** (a fonte GLM não
      fornece esses valores).

**Estrutura / seguros**
- [ ] Operar tudo pela **CNPJ** (contratos, cobrança, termos em nome da NexoCore).
- [ ] Contratar **Seguro de Responsabilidade Civil Profissional / E&O**.
- [ ] Contador: enquadramento tributário e blindagem da LTDA.

**LGPD / dados**
- [ ] Base legal para telefone/localização de trabalhadores nos alertas.
- [ ] Contrato de **operador/controlador** com clientes B2B.
- [ ] Política de retenção e segurança dos logs/telemetria.

**Operacional / prova**
- [ ] Manter **logs auditáveis** de cada alerta, estado e indisponibilidade.
- [ ] Registrar as versões dos Termos aceitas por cada cliente.

---

## 7. Com quem falar

- **Advogado** — direito digital + responsabilidade civil/consumidor (Termos,
  contratos B2B, estrutura, LGPD).
- **Engenheiro de segurança do trabalho** — NR-18, laudo/ART.
- **Contador** — enquadramento e blindagem da LTDA.
- **Corretor de seguros** — RC Profissional / E&O.

---

*Referências citadas para conferência do profissional: Código Civil (arts. 186,
187, 393, 927); CDC (arts. 12–14); LGPD (Lei nº 13.709/2018); NR-18; NBR 5419.*
