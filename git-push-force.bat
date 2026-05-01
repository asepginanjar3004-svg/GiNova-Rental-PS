@echo off
set PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\mingw64\bin
git add .
git commit -m "Finalize GiNova Production Audit (Force Push)"
git push -u origin main --force
