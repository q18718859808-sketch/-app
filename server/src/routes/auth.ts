import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import { oauthConfig } from '../config/oauth.js';
import { wechatService } from '../services/wechat.js';
import { qqService } from '../services/qq.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 生成 JWT Token
function generateToken(user: { id: string; name: string; provider: string }) {
    return jwt.sign(user, oauthConfig.jwt.secret, {
        expiresIn: oauthConfig.jwt.expiresIn,
    });
}

// ============== 演示登录 (用于开发测试) ==============

/**
 * POST /api/auth/demo-login
 * 演示登录 - 无需真实 OAuth 账号
 */
router.post('/demo-login', async (req: Request, res: Response) => {
    try {
        const { name = '张建国' } = req.body;

        // 检查是否存在演示用户
        let { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('name', name)
            .single();

        // 如果用户不存在，创建一个
        if (!user) {
            const newUser = {
                id: uuidv4(),
                name: name,
                age: 72,
                phone: '13800138000',
                emergency_contact: '13800138000',
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabaseAdmin
                .from('users')
                .insert(newUser)
                .select()
                .single();

            if (error) {
                console.error('创建用户失败:', error);
                // 如果数据库未配置，返回模拟用户
                user = newUser;
            } else {
                user = data;
            }
        }

        const token = generateToken({
            id: user.id,
            name: user.name,
            provider: 'demo',
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                age: user.age,
                emergencyContact: user.emergency_contact,
            },
        });
    } catch (error) {
        console.error('演示登录错误:', error);

        // 即使数据库出错，也返回一个可用的演示令牌
        const demoUser = {
            id: uuidv4(),
            name: req.body.name || '张建国',
            provider: 'demo' as const,
        };

        const token = generateToken(demoUser);

        res.json({
            success: true,
            token,
            user: {
                id: demoUser.id,
                name: demoUser.name,
                age: 72,
                emergencyContact: '13800138000',
            },
            warning: '数据库未连接，使用本地模式',
        });
    }
});

// ============== 微信登录 ==============

/**
 * GET /api/auth/wechat/url
 * 获取微信授权 URL
 */
router.get('/wechat/url', (req: Request, res: Response) => {
    const redirectUri = `${oauthConfig.callbackBaseUrl}/auth/callback/wechat`;
    const state = uuidv4();
    const url = wechatService.getAuthorizationUrl(redirectUri, state);

    res.json({ url, state });
});

/**
 * POST /api/auth/wechat/callback
 * 微信授权回调
 */
router.post('/wechat/callback', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: '缺少授权码' });
        }

        // 获取微信用户信息
        const wechatUser = await wechatService.login(code);

        // 查找或创建用户
        let { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('wechat_openid', wechatUser.openid)
            .single();

        if (!user) {
            // 创建新用户
            const newUser = {
                id: uuidv4(),
                name: wechatUser.nickname,
                wechat_openid: wechatUser.openid,
                wechat_unionid: wechatUser.unionid,
                avatar: wechatUser.avatar,
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabaseAdmin
                .from('users')
                .insert(newUser)
                .select()
                .single();

            if (error) throw error;
            user = data;
        }

        const token = generateToken({
            id: user.id,
            name: user.name,
            provider: 'wechat',
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                age: user.age,
                emergencyContact: user.emergency_contact,
            },
        });
    } catch (error) {
        console.error('微信登录错误:', error);
        res.status(500).json({ error: '微信登录失败' });
    }
});

// ============== QQ 登录 ==============

/**
 * GET /api/auth/qq/url
 * 获取 QQ 授权 URL
 */
router.get('/qq/url', (req: Request, res: Response) => {
    const redirectUri = `${oauthConfig.callbackBaseUrl}/auth/callback/qq`;
    const state = uuidv4();
    const url = qqService.getAuthorizationUrl(redirectUri, state);

    res.json({ url, state });
});

/**
 * POST /api/auth/qq/callback
 * QQ 授权回调
 */
router.post('/qq/callback', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const redirectUri = `${oauthConfig.callbackBaseUrl}/auth/callback/qq`;

        if (!code) {
            return res.status(400).json({ error: '缺少授权码' });
        }

        // 获取 QQ 用户信息
        const qqUser = await qqService.login(code, redirectUri);

        // 查找或创建用户
        let { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('qq_openid', qqUser.openid)
            .single();

        if (!user) {
            // 创建新用户
            const newUser = {
                id: uuidv4(),
                name: qqUser.nickname,
                qq_openid: qqUser.openid,
                avatar: qqUser.avatar,
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabaseAdmin
                .from('users')
                .insert(newUser)
                .select()
                .single();

            if (error) throw error;
            user = data;
        }

        const token = generateToken({
            id: user.id,
            name: user.name,
            provider: 'qq',
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                age: user.age,
                emergencyContact: user.emergency_contact,
            },
        });
    } catch (error) {
        console.error('QQ 登录错误:', error);
        res.status(500).json({ error: 'QQ 登录失败' });
    }
});

// ============== 用户信息 ==============

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', req.user!.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({
            id: user.id,
            name: user.name,
            age: user.age,
            phone: user.phone,
            emergencyContact: user.emergency_contact,
            guardianName: user.guardian_name,
            guardianPhone: user.guardian_phone,
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

/**
 * PUT /api/auth/me
 * 更新用户信息
 */
router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, age, phone, emergencyContact, guardianName, guardianPhone } = req.body;

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                name,
                age,
                phone,
                emergency_contact: emergencyContact,
                guardian_name: guardianName,
                guardian_phone: guardianPhone,
                updated_at: new Date().toISOString(),
            })
            .eq('id', req.user!.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            id: user.id,
            name: user.name,
            age: user.age,
            emergencyContact: user.emergency_contact,
            guardianName: user.guardian_name,
            guardianPhone: user.guardian_phone,
        });
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ error: '更新用户信息失败' });
    }
});

export default router;
