#!/bin/bash
cd "$HOME/Documents/Dev/PZE" || exit 1

echo "=== FAQ-Dateien committen und pushen ==="

git checkout v7-dev
git add public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf
git add public/manuals/PZE-FAQ-Zeiterfassung-v1.docx
git commit -m "FAQ Zeiterfassung v1 - PDF und DOCX in public/manuals"
git push origin v7-dev

git checkout main
git merge v7-dev -m "merge: FAQ Zeiterfassung Dateien"
git push origin main
git checkout v7-dev

echo "=== FERTIG! ==="
