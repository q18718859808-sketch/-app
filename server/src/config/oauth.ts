import dotenv from 'dotenv';

dotenv.config();

export const oauthConfig = {
    wechat: {
        appId: process.env.WECHAT_APP_ID || '',
        appSecret: process.env.WECHAT_APP_SECRET || '',
        // 微信 OAuth 接口
        authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
        accessTokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
        userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
    },
    qq: {
        appId: process.env.QQ_APP_ID || '',
        appSecret: process.env.QQ_APP_SECRET || '',
        // QQ OAuth 接口
        authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
        accessTokenUrl: 'https://graph.qq.com/oauth2.0/token',
        openIdUrl: 'https://graph.qq.com/oauth2.0/me',
        userInfoUrl: 'https://graph.qq.com/user/get_user_info',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: '7d',
    },
    callbackBaseUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
