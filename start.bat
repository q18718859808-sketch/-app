@echo off
chcp 65001 > nul
echo ===================================================
echo             启动 药小助 (Medicare) 服务
echo ===================================================
echo.

echo [1/2] 正在启动后端 API 服务 (端口 3001)...
start "药小助 后端服务 (Backend)" cmd /k "cd server && npm run dev"

echo [2/2] 正在启动前端 Web 服务 (端口 5173)...
start "药小助 前端服务 (Frontend)" cmd /k "npm run dev -- --host"

echo.
echo 服务启动命令已发送！
echo.
echo 后端将运行在本机的 3001 端口
echo 前端将运行在本机的 5173 端口 (支持局域网手机访问)
echo.
echo 请查看弹出的两个黑色命令行窗口了解运行状态。
echo 如果遇到模块找不到的错误，请先运行 install_dependencies.bat 安装依赖。
echo.
pause
