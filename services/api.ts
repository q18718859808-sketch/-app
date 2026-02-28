/**
 * 药小助 API 服务
 * 统一的 API 调用层，连接前端与后端
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 获取存储的 Token
function getToken(): string | null {
    return localStorage.getItem('medicare_token');
}

// 存储 Token
function setToken(token: string): void {
    localStorage.setItem('medicare_token', token);
}

// 清除 Token
function clearToken(): void {
    localStorage.removeItem('medicare_token');
}

// 通用请求函数
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(error.error || '请求失败');
    }

    return response.json();
}

// ============== 认证 API ==============

export interface User {
    id: string;
    name: string;
    age?: number;
    emergencyContact?: string;
    guardianName?: string;
    guardianPhone?: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: User;
    warning?: string;
}

/**
 * 演示登录 (开发测试用)
 */
export async function demoLogin(name?: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

    if (result.token) {
        setToken(result.token);
    }

    return result;
}

/**
 * 获取微信授权 URL
 */
export async function getWechatAuthUrl(): Promise<{ url: string; state: string }> {
    return request('/auth/wechat/url');
}

/**
 * 微信登录回调
 */
export async function wechatLogin(code: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/auth/wechat/callback', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });

    if (result.token) {
        setToken(result.token);
    }

    return result;
}

/**
 * 获取 QQ 授权 URL
 */
export async function getQQAuthUrl(): Promise<{ url: string; state: string }> {
    return request('/auth/qq/url');
}

/**
 * QQ 登录回调
 */
export async function qqLogin(code: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/auth/qq/callback', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });

    if (result.token) {
        setToken(result.token);
    }

    return result;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
    return request('/auth/me');
}

/**
 * 更新用户信息
 */
export async function updateUser(data: Partial<User>): Promise<User> {
    return request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 退出登录
 */
export function logout(): void {
    clearToken();
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
    return !!getToken();
}

// ============== 药品 API ==============

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    timeLabel: string;
    scheduledTime: string;
    status: 'pending' | 'taken' | 'skipped';
    instructions?: string;
    stock: number;
    takenTime?: string;
}

/**
 * 获取药品列表
 */
export async function getMedications(): Promise<Medication[]> {
    return request('/medications');
}

/**
 * 添加药品
 */
export async function addMedication(data: Omit<Medication, 'id' | 'status' | 'takenTime'>): Promise<Medication> {
    return request('/medications', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新药品
 */
export async function updateMedication(id: string, data: Partial<Medication>): Promise<Medication> {
    return request(`/medications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 标记药品已服用
 */
export async function takeMedication(id: string): Promise<Medication> {
    return request(`/medications/${id}/take`, {
        method: 'POST',
    });
}

/**
 * 删除药品
 */
export async function deleteMedication(id: string): Promise<{ success: boolean }> {
    return request(`/medications/${id}`, {
        method: 'DELETE',
    });
}

/**
 * 重置每日药品状态
 */
export async function resetDailyMedications(): Promise<{ success: boolean }> {
    return request('/medications/reset-daily', {
        method: 'POST',
    });
}

// ============== 健康记录 API ==============

export interface HealthRecord {
    id: string;
    type: 'bloodPressure' | 'bloodSugar' | 'heartRate' | 'symptom';
    value: string;
    unit: string;
    timestamp: string;
    status: 'normal' | 'warning' | 'danger' | 'info';
}

/**
 * 获取健康记录
 */
export async function getHealthRecords(type?: string, limit = 50): Promise<HealthRecord[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('limit', String(limit));

    return request(`/health?${params.toString()}`);
}

/**
 * 添加健康记录
 */
export async function addHealthRecord(data: {
    type: string;
    value: string;
    unit?: string;
    note?: string;
}): Promise<HealthRecord> {
    return request('/health', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 获取健康统计
 */
export async function getHealthStatistics(type?: string, days = 7): Promise<{
    chartData: any[];
    totalRecords: number;
    period: string;
}> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('days', String(days));

    return request(`/health/statistics?${params.toString()}`);
}

/**
 * 删除健康记录
 */
export async function deleteHealthRecord(id: string): Promise<{ success: boolean }> {
    return request(`/health/${id}`, {
        method: 'DELETE',
    });
}

// ============== API 服务导出 ==============

export const api = {
    // 认证
    demoLogin,
    getWechatAuthUrl,
    wechatLogin,
    getQQAuthUrl,
    qqLogin,
    getCurrentUser,
    updateUser,
    logout,
    isLoggedIn,

    // 药品
    getMedications,
    addMedication,
    updateMedication,
    takeMedication,
    deleteMedication,
    resetDailyMedications,

    // 健康记录
    getHealthRecords,
    addHealthRecord,
    getHealthStatistics,
    deleteHealthRecord,
};

export default api;
