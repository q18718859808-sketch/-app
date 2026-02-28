import axios from 'axios';
import { oauthConfig } from '../config/oauth.js';

interface WechatAccessTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    openid: string;
    scope: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
}

interface WechatUserInfo {
    openid: string;
    nickname: string;
    sex: number;
    province: string;
    city: string;
    country: string;
    headimgurl: string;
    privilege: string[];
    unionid?: string;
}

export class WechatService {
    private config = oauthConfig.wechat;

    /**
     * 生成微信授权 URL
     */
    getAuthorizationUrl(redirectUri: string, state: string): string {
        const params = new URLSearchParams({
            appid: this.config.appId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'snsapi_login',
            state: state,
        });
        return `${this.config.authorizeUrl}?${params.toString()}#wechat_redirect`;
    }

    /**
     * 使用授权码获取 access_token
     */
    async getAccessToken(code: string): Promise<WechatAccessTokenResponse> {
        const params = new URLSearchParams({
            appid: this.config.appId,
            secret: this.config.appSecret,
            code: code,
            grant_type: 'authorization_code',
        });

        const response = await axios.get<WechatAccessTokenResponse>(
            `${this.config.accessTokenUrl}?${params.toString()}`
        );

        if (response.data.errcode) {
            throw new Error(`微信授权失败: ${response.data.errmsg}`);
        }

        return response.data;
    }

    /**
     * 获取用户信息
     */
    async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
        const params = new URLSearchParams({
            access_token: accessToken,
            openid: openid,
            lang: 'zh_CN',
        });

        const response = await axios.get<WechatUserInfo>(
            `${this.config.userInfoUrl}?${params.toString()}`
        );

        return response.data;
    }

    /**
     * 完整的登录流程
     */
    async login(code: string): Promise<{
        openid: string;
        unionid?: string;
        nickname: string;
        avatar: string;
    }> {
        const tokenData = await this.getAccessToken(code);
        const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid);

        return {
            openid: userInfo.openid,
            unionid: userInfo.unionid,
            nickname: userInfo.nickname,
            avatar: userInfo.headimgurl,
        };
    }
}

export const wechatService = new WechatService();
