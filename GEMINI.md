# REGLAS DEL PROYECTO: INTEGRACIÓN CON SEGUNDO CEREBRO (OBSIDIAN)

> **Destino de la base de conocimiento:** `c:/Users/User/Documents/vault`  
> **Esquema maestro:** `c:/Users/User/Documents/vault/CLAUDE.md`

### ⚡ REGLAS CRÍTICAS DE RESPUESTA & DIRECTIVAS
1. **Identidad Obligatoria:** Inicia obligatoriamente cada respuesta con `[Irvin Dev]`.
2. **Directivas Locales:** Aplica estrictamente las directivas definidas en `.antigravity/rules.md`.

Como agente de IA en este proyecto, estás conectado al **Segundo Cerebro** del usuario en Obsidian.

---

## ⚡ REGLA CRÍTICA: REGISTRO AUTÓNOMO ("ZERO-PROMPT LOGGING")

**NUNCA esperes a que el usuario te pida documentar la conversación.**
Cada vez que en este proyecto:
1. Concluyas una tarea o hito relevante de desarrollo.
2. Diseñes o refactorices una arquitectura de software.
3. Resuelvas un bug complejo o encuentres una solución no trivial.
4. Utilices herramientas clave (MCPs, CLI, APIs), skills especializadas o librerías importantes.

Debes **autónomamente** registrar la síntesis de la sesión y los aprendizajes en el Segundo Cerebro antes de finalizar tu intervención o como parte de la entrega de la tarea.

---

## 📝 PROTOCOLO DE AUTO-REGISTRO

### 1. Crear Nota de Síntesis
Genera un archivo Markdown en:
`c:/Users/User/Documents/vault/pages/syntheses/YYYY-MM-DD-[NombreProyecto]-[TemaClave].md`

Usa la siguiente estructura obligatoria:

```markdown
---
title: "Título Descriptivo de la Sesión"
type: synthesis
project: "NombreDelProyectoActual"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tools_used:
  - nombre_herramienta_1
  - nombre_herramienta_2
skills_used:
  - nombre_skill_1
tags:
  - sesion-antigravity
  - sintesis
  - arquitectura
  - [tags_adicionales]
sources:
  - "Conversación Antigravity ([NombreProyectoActual])"
---

# Título Descriptivo de la Sesión

> **Proyecto:** `[NombreProyecto]` | **Fecha:** YYYY-MM-DD  
> **Sistema:** Antigravity AI Assistant → [[Segundo Cerebro con IA]]

---

## 🎯 Contexto y Objetivo
Resumen claro de lo solicitado, el problema que se resolvió o la meta técnica alcanzada.

---

## 🛠️ Herramientas, MCPs y Skills Empleados

| Categoría | Nombre / Identificador | Propósito en la Sesión |
| :--- | :--- | :--- |
| **Herramienta** | `nombre_herramienta` | Para qué se usó |
| **Skill** | `nombre_skill` | Procedimiento aplicado |
| **MCP / API** | `nombre_mcp` | Integración ejecutada |
| **CLI / Script** | `comando` | Ejecución en terminal |

---

## 📐 Diagrama de Arquitectura / Flujo
Incluye SIEMPRE un diagrama Mermaid representativo (arquitectura de componentes, diagrama de secuencia o flujo de datos):

\`\`\`mermaid
flowchart TD
    A[Componente / Entrada] --> B[Procesamiento]
    B --> C[Salida / Resultado]
\`\`\`

---

## 💡 Decisiones Técnicas & Aprendizajes Clave
- **Decisiones de diseño:** Qué se decidió y por qué.
- **Lecciones aprendidas:** Gotchas, errores superados o patrones reutilizables para el futuro.
- **Fragmentos de código o configuraciones críticas.**

---

## 🔗 Referencias y Conexiones en el Vault
- [[Concepto Relacionado]] (ej. [[Wiki LLM]], [[Segundo Cerebro con IA]])
- [[Entidad Relacionada]] (ej. [[Obsidian]], librerías o frameworks)
```

---

### 2. Actualizar el Índice General
Añade la nota en `c:/Users/User/Documents/vault/index.md` dentro de la sección:
`## 📊 4. Síntesis & Comparativas (pages/syntheses/)`
Formato:
`- [[YYYY-MM-DD-NombreProyecto-TemaClave]] — Resumen de una línea del hito o solución. *(Síntesis | YYYY-MM-DD | Proyecto: Nombre)*`

---

### 3. Registrar en la Bitácora
Añade una entrada al final de `c:/Users/User/Documents/vault/log.md`:
```markdown
---

## [YYYY-MM-DD] SESION | [NombreProyecto] - [TemaClave]
- **Objetivo:** Breve resumen de lo realizado.
- **Herramientas & Skills:** Listado de herramientas y skills destacadas.
- **Nota generada:** [[YYYY-MM-DD-NombreProyecto-TemaClave]]
- **Catálogo:** Actualizado en [[index]].
```

---

### 4. Nuevas Entidades o Conceptos
Si durante el trabajo se exploró a fondo una nueva tecnología, biblioteca, framework o concepto de diseño que valga la pena aislar para el futuro, crea adicionalmente su nota atómica en:
- `c:/Users/User/Documents/vault/pages/concepts/[Concepto].md`
- `c:/Users/User/Documents/vault/pages/entities/[Herramienta O Librería].md`
Y vincúlala con wikilinks `[[...]]`.

---

### 5. Onboarding y Centralización de Nuevos Proyectos (`pages/projects/`)
Si este proyecto es nuevo o no cuenta aún con su suite documental en el Segundo Cerebro:
1. **Crear Carpeta:** `c:/Users/User/Documents/vault/pages/projects/[NombreProyecto]/`.
2. **Generar Hub MOC:** `pages/projects/[NombreProyecto]/[NombreProyecto].md` con metadatos `type: project`, alcance, índice de documentación, diagrama Mermaid, análisis residual con [[Residuality Theory]] y roles de The Agency.
3. **Centralizar Documentos:** Toda documentación técnica, bitácora o especificación del proyecto debe crearse dentro de esa carpeta.
4. **Actualizar Catálogo:** Añadir el proyecto a `c:/Users/User/Documents/vault/index.md` bajo `## 🚀 Proyectos & Suites Documentales (pages/projects/)`.
5. **Asentar en Bitácora:** Registrar la inicialización en `c:/Users/User/Documents/vault/log.md`.
6. **Verificar Salud:** Ejecutar `python c:/Users/User/Documents/vault/scripts/vault_lint.py`.
*(Ver protocolo completo en [[Protocolo de Inicializacion y Centralizacion de Proyectos]])*
