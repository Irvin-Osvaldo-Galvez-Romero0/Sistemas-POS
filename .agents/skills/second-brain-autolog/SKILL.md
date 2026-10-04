---
name: second-brain-autolog
description: >-
  Autonomous logger that captures important technical decisions, tools used, skills, architectures, and Mermaid diagrams from Antigravity development sessions into the user's Obsidian Second Brain vault (c:/Users/User/Documents/vault). Activate when concluding tasks, establishing architectures, solving non-trivial bugs, or learning reusable patterns.
---

# Skill: Second Brain Auto-Logger

Esta habilidad le enseña al agente cómo extraer el valor técnico de cualquier sesión de trabajo en Antigravity y compilarlo en el Segundo Cerebro de Obsidian sin interrumpir al usuario.

---

## 📍 Rutas del Vault
- **Raíz del Vault:** `c:/Users/User/Documents/vault`
- **Síntesis de Sesiones:** `c:/Users/User/Documents/vault/pages/syntheses/`
- **Conceptos Nuevos:** `c:/Users/User/Documents/vault/pages/concepts/`
- **Entidades/Herramientas:** `c:/Users/User/Documents/vault/pages/entities/`
- **Índice:** `c:/Users/User/Documents/vault/index.md`
- **Bitácora:** `c:/Users/User/Documents/vault/log.md`

---

## 📋 Pasos de Ejecución

### 1. Extracción de Metadatos y Aprendizajes
Revisa la conversación actual e identifica:
- **Herramientas empleadas:** (e.g. `run_command`, `replace_file_content`, scripts PowerShell, linters).
- **Skills invocadas:** (e.g. `agy-customizations`, skills de tests, skills de deployment).
- **Decisiones arquitectónicas:** Por qué se eligió una solución sobre otra.
- **Diagrama visual:** Una representación en Mermaid que resuma el flujo, los módulos o la secuencia.

### 2. Redacción de la Nota de Síntesis
Escribe el archivo en:
`c:/Users/User/Documents/vault/pages/syntheses/YYYY-MM-DD-[NombreProyecto]-[Tema].md`

Asegúrate de incluir:
- Frontmatter YAML con etiquetas claras.
- Tabla formateada de herramientas y skills.
- Diagrama Mermaid delimitado con cuatro o tres backticks según corresponda.
- Puntos clave y lecciones aprendidas.
- Enlaces internos `[[...]]`.

### 3. Actualización de Catálogo e Historial
- Añade el enlace a `index.md`.
- Añade una entrada con encabezado `## [YYYY-MM-DD] SESION | [NombreProyecto] - [Tema]` en `log.md`.

### 4. Verificación de Salud
Si tienes acceso a ejecutar comandos en la bóveda, puedes ejecutar opcionalmente:
`python c:/Users/User/Documents/vault/scripts/vault_lint.py`
para asegurar que no quedaron enlaces rotos ni cabeceras mal formateadas.
