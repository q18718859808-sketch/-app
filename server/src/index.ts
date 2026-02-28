import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import medicationsRoutes from './routes/medications.js';
import healthRoutes from './routes/health.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============== 中间件配置 ==============

// CORS 配置
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// JSON 解析
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ============== API 路由 ==============

// 健康检查
app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: '药小助 API 服务',
    });
});

// 认证路由
app.use('/api/auth', authRoutes);

// 药品管理路由
app.use('/api/medications', medicationsRoutes);

// 健康记录路由
app.use('/api/health', healthRoutes);

// ============== 错误处理 ==============

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// ============== 启动服务 ==============

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   💊 药小助 API 服务已启动!                               ║
║                                                           ║
║   地址: http://localhost:${PORT}                            ║
║   健康检查: http://localhost:${PORT}/api/health-check       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
