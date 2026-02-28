import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { oauthConfig } from '../config/oauth.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name: string;
        provider: 'wechat' | 'qq' | 'demo';
    };
}

export const authMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, oauthConfig.jwt.secret) as {
            id: string;
            name: string;
            provider: 'wechat' | 'qq' | 'demo';
        };

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: '认证令牌无效或已过期' });
    }
};

// 可选认证中间件 (允许未登录用户访问)
export const optionalAuthMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, oauthConfig.jwt.secret) as {
                id: string;
                name: string;
                provider: 'wechat' | 'qq' | 'demo';
            };
            req.user = decoded;
        } catch {
            // 忽略无效令牌，继续处理请求
        }
    }

    next();
};
