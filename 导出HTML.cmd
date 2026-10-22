@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "GAME_NODE=node.exe"
where node.exe >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "GAME_NODE=%ProgramFiles%\nodejs\node.exe"
  ) else (
    echo 未找到 Node.js。游玩现有 index.html 不需要安装它；重新导出时才需要 Node.js 与项目依赖。
    pause
    exit /b 1
  )
)
"%GAME_NODE%" scripts\export-html.cjs
if errorlevel 1 (
  echo 导出失败，请保留上方错误信息。
  pause
  exit /b 1
)
echo 已更新 index.html，可以双击“启动游戏.cmd”游玩。
pause
