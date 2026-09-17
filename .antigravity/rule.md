# PROTOCOLO CANARIO DE INTEGRIDAD (DETECCIÓN DE ALUCINACIONES)
- **Token Canario Obligatorio:** En ABSOLUTAMENTE TODAS tus respuestas, la primera línea debe comenzar exactamente con:
  `[CANARIO: VIGILANTE-PWA-OK]`
- **Propósito:** Validar que las reglas de sistema, la persistencia en `Docs/` y las directivas arquitectónicas siguen activas en el contexto.
- **Regla estricta:** Si una respuesta no incluye este encabezado exacto en el primer carácter, se considera una pérdida de contexto/alucinación crítica.

---

# POLÍTICA DE OPTIMIZACIÓN Y AHORRO DE TOKENS (ISO/IEC 25010)
Para maximizar la eficiencia y reducir consumo de contexto:
1. **Modificaciones de código:** Proporciona únicamente bloques `diff` unificados o el fragmento exacto que cambia; NUNCA reescribas archivos completos salvo que se solicite explícitamente.
2. **Concisión técnica:** Cero saludos, cero transiciones de cortesía o resúmenes introductorios redundantes. Ve directo a la implementación técnica o la documentación.
3. **Persistencia limpia:** Al actualizar la matriz documental en `Docs/`, edita o añade únicamente los registros correspondientes sin replicar tablas completas ya existentes.

---

# SKILL: CAVEMAN (COMPRESIÓN RADICAL DE TOKENS & RESPUESTA COMPACTA)
Cuando el usuario solicite modo ultra-conciso, correcciones directas o refactors rápidos:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\caveman`
2. **Criterios de Ejecución POS:**
   - Salida técnica pura: únicamente diffs unificados, snippets de handlers o queries de almacenamiento.
   - Prohibido código envoltorio innecesario, descripciones intermedias o texto conversacional.

---

# SKILL: PONYTAIL (CONTROL DE DEUDA TÉCNICA, REFACTORING & CLEAN ARCHITECTURE)
Cuando se audite la mantenibilidad del código o se planifiquen refactorizaciones del POS:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\ponytail`
2. **Criterios de Mantenibilidad (ISO/IEC 25010):**
   - Desacople estricto del core transaccional (cálculo de subtotal, descuentos, impuestos) de la capa de renderizado.
   - Aislamiento de adaptadores de hardware (impresora térmica ESC/POS, balanza, scanner) tras interfaces/puertos abstractos.
   - Detección de fugas de memoria en buffers de eventos globales del scanner USB.

---

# SKILL: GSTACK (INGENIERÍA DE PRODUCTO & WORKFLOW FULL-STACK PWA)
Cuando se diseñen flujos transaccionales y features de extremo a extremo:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\gstack`
2. **Estándares Operativos POS:**
   - Implementación de Outbox Pattern: escritura local inmediata en IndexedDB y sync asíncrono con el backend.
   - Contratos de API idempotentes: generación de identificador único de ticket en cliente (UUID v4 + terminal ID).
   - Manejo de fallos en corte de red: resolución determinista de conflictos en sincronización de inventario.

---

# SKILL: CONTEXT-ENGINEERING & COMPRESSION (OPTIMIZACIÓN EXTREMA DE CONTEXTO)
Cuando se procesen tareas extensas, refactors masivos o flujos de caja continuos:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\context-engineering-collection`
     `$HOME\.agents\skills\context-compressor`
2. **Estrategias Operativas:**
   - Reducción del payload: serialización mínima de tickets y exclusión de metadatos no críticos en sync.
   - Purgado de trazas: logs locales efímeros con rotación automática para evitar desbordar memoria.

---

# SKILL: VERCEL-REACT-BEST-PRACTICES (ARQUITECTURA REACT & RENDIMIENTO)
Cuando se diseñe, construya o refactorice el App Shell y pantallas de cobro:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\vercel-react-best-practices`
2. **Estándares Técnicos Obligatorios:**
   - Cero re-renders en el ticket: memoización de filas individuales de productos para mantener el input del escáner en <16ms.
   - Virtualización estricta de la cuadrícula de catálogo (>1,000 SKUs).
   - Optimización de estados derivados: cálculo del total en memoria con selectores puros sin re-ejecutar subárboles DOM.

---

# SKILL: CORE-WEB-VITALS & LIGHTHOUSE-AUDIT (RENDIMIENTO PWA & ISO/IEC 25010)
Cuando se optimicen tiempos de respuesta en caja y ciclo de vida offline:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\core-web-vitals`
     `$HOME\.agents\skills\lighthouse-audit`
2. **Métricas y Criterios Obligatorios:**
   - INP < 50ms en inserción de ítem por lector de código de barras o teclado numérico táctil.
   - Service Worker Cache: Stale-While-Revalidate para App Shell y assets estáticos; Network-Only con fallback local para endpoints de checkout.
   - Cero layouts shifts (CLS = 0) al actualizar dinámicamente el ticket de compra.

---

# SKILL: FRONTEND-SECURITY (DEFENSA EN CLIENTE & ISO/IEC 27001)
Cuando se maneje autenticación, datos fiscales y flujo de pagos:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\frontend-security`
2. **Pilares de Seguridad Obligatorios:**
   - Cero almacenamiento de PAN/CVV en IndexedDB, Service Worker o `localStorage`.
   - Cifrado en reposo para datos de ventas offline con Web Crypto API (AES-GCM-256) antes del despacho.
   - Bloqueo automático de terminal por inactividad y sanitización estricta contra inyecciones en cadenas leídas por código de barras.

---

# SKILL: ARCHIFY (GENERACIÓN DE DIAGRAMAS HTML)
Cuando se generen flujos transaccionales, ciclos de vida de tickets o arquitecturas periféricas:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\archify`
2. **Ejecutable y Flujo:**
   - Comando: `node "$HOME\.agents\skills\archify\bin\archify.mjs"`
   - Diagramas POS: topología de comunicación WebUSB/Serial, ciclo de vida del Outbox Pattern y flujo de rollback en fallos de cobro.

---

# SKILL: AUTOMATED CODE REVIEW & QA AUDITING
Cuando se inspeccione código de lógica de caja o capas de persistencia:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\automated-code-review`
2. **Evaluación Multidimensional POS:**
   - Detección de condiciones de carrera en apertura de gaveta de dinero o impresión múltiple (Web Locks API).
   - Validación de consistencia de coma flotante: cálculos monetarios obligatorios con enteros (centavos) para evitar errores de precisión.
   - Auditoría de manejo de eventos de desconexión abrupta de red durante un commit transaccional.

---

# SKILL: IMPECCABLE (DISEÑO UI, ACCESIBILIDAD Y AUDITORÍA FRONTEND)
Cuando se construyan o ajusten componentes de interacción de punto de venta:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\impeccable`
2. **Criterios de Interfaz POS:**
   - Zonas táctiles mínimas de 48x48px en keypad numérico y selectores de cobro rápido.
   - Alto contraste visual para condiciones variables de iluminación en mostrador.
   - Foco visual inequívoco y navegación completa por teclado (atajos `F1-F12`, `Esc`, `Enter`).

---

# SKILL: FRONTEND-DESIGN (SISTEMAS DE DISEÑO & UI ENGINEERING)
Cuando se maquete la interfaz del terminal y layouts de mostrador:
1. **Directivas Base:**
   - Consulta y ejecuta las heurísticas instaladas en:
     `$HOME\.agents\skills\frontend-design`
2. **Criterios de Construcción:**
   - Layouts resilientes optimizados para monitores touch y tablets en orientación fija.
   - Numpad integrado en pantalla que previene la activación del teclado virtual nativo del sistema operativo.
   - Estados visuales inmediatos para confirmación de cobro, lectura de código y errores de hardware.