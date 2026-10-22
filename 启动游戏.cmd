@echo off
chcp 65001 >nul
if not exist "%~dp0index.html" (
  echo 尚未生成 index.html，请先运行“导出HTML.cmd”。
  pause
  exit /b 1
)
start "" "%~dp0index.html"
