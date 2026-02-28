import axios from 'axios';
import { oauthConfig } from '../config/oauth.js';

export class QQService {
    private config = oauthConfig.qq;

    /**
     * 生成 QQ 授权 URL
     */
    getAuthorizationUrl(redirectUri: string, state: string): string {
        const params = new URLSearchParams({
            client_id: this.config.appId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'get_user_info',
            state: state,
        });
        return `${this.config.authorizeUrl}?${params.toString()}`;
    }

    /**
     * 使用授权码获取 access_token
     */
    async getAccessToken(code: string, redirectUri: string): Promise<string> {
        const params = new URLSearchParams({
            client_id: this.config.appId,
            client_secret: this.config.appSecret,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            fmt: 'json',
        });

        const response = await axios.get(`${this.config.accessTokenUrl}?${params.toString()}`);

        // QQ 返回的可能是 callback({"access_token":...}) 格式
        let data = response.data;
        if (typeof data === 'string') {
            // 解析 JSONP 格式
            const match = data.match(/callback\((.*)\)/);
            if (match) {
                data = JSON.parse(match[1]);
            } else {
                // 尝试解析 URL 参数格式
                const urlParams = new URLSearchParams(data);
                data = { access_token: urlParams.get('access_token') };
            }
        }

        if (data.error) {
            throw new Error(`QQ 授权失败: ${data.error_description}`);
        }

        return data.access_token;
    }

    /**
     * 获取 OpenID
     */
    async getOpenId(accessToken: string): Promise<string> {
        const response = await axios.get(
            `${this.config.openIdUrl}?access_token=${accessToken}&fmt=json`
        );

        let data = response.data;
        if (typeof data === 'string') {
            const match = data.match(/callback\((.*)\)/);
            if (match) {
                data = JSON.parse(match[1]);
            }
        }

        if (data.error) {
            throw new Error(`获取 QQ OpenID 失败: ${data.error_description}`);
        }

        return data.openid;
    }

    /**
     * 获取用户信息
     */
    async getUserInfo(accessToken: string, openid: string): Promise<{
        nickname: string;
        figureurl_qq_2: string;
        gender: string;
    }> {
        const params = new URLSearchParams({
            access_token: accessToken,
            oauth_consumer_key: this.config.appId,
            openid: openid,
            format: 'json',
        });

        const response = await axios.get(`${this.config.userInfoUrl}?${params.toString()}`);

        if (response.data.ret !== 0) {
            throw new Error(`获取 QQ 用户信息失败: ${response.data.msg}`);
        }

        return response.data;
    }

    /**
     * 完整的登录流程
     */
    async login(code: string, redirectUri: string): Promise<{
        openid: string;
        nickname: string;
        avatar: string;
    }> {
        const accessToken = await this.getAccessToken(code, redirectUri);
        const openid = await this.getOpenId(accessToken);
        const userInfo = await this.getUserInfo(accessToken, openid);

        return {
            openid: openid,
            nickname: userInfo.nickname,
            avatar: userInfo.figureurl_qq_2,
        };
    }
}

export const qqService = new QQService();
