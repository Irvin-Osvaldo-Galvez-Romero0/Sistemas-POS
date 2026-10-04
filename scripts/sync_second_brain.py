import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

vault_dir = r"C:\Users\User\Documents\vault"
synthesis_path = os.path.join(vault_dir, "pages", "syntheses", "2026-09-24-POS-Eliminacion-Modulos-Benchmark-Presets-APK.md")
index_path = os.path.join(vault_dir, "index.md")
log_path = os.path.join(vault_dir, "log.md")

# 2. Update index.md
with open(index_path, "r", encoding="utf-8") as f:
    index_text = f.read()

new_index_entry = "- [[2026-09-24-POS-Eliminacion-Modulos-Benchmark-Presets-APK]] — Depuración limpia de módulos de benchmarking, presets y stress test, exportación APK y validación en vivo en tableta física. *(Síntesis | 2026-09-24 | Proyecto: POS)*"

if "2026-09-24-POS-Eliminacion-Modulos-Benchmark-Presets-APK" not in index_text:
    target_marker = "## 📊 Síntesis & Comparativas (`pages/syntheses/`)"
    if target_marker in index_text:
        parts = index_text.split(target_marker, 1)
        subparts = parts[1].split("\n", 1)
        updated_index = parts[0] + target_marker + "\n" + new_index_entry + "\n" + subparts[1].lstrip("\r\n")
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(updated_index)
        print("Updated index.md with new synthesis entry")
    else:
        print("Target marker not found in index.md")
else:
    print("Entry already in index.md")
