import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 所有健康记录路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/health
 * 获取用户的健康记录
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { type, limit = 50, offset = 0 } = req.query;

        let query = supabaseAdmin
            .from('health_records')
            .select('*')
            .eq('user_id', req.user!.id)
            .order('recorded_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (type) {
            query = query.eq('type', type);
        }

        const { data: records, error } = await query;

        if (error) throw error;

        // 转换为前端格式
        const result = records.map((record: any) => ({
            id: record.id,
            type: record.type,
            value: record.value,
            unit: record.unit,
            timestamp: formatTimestamp(record.recorded_at),
            status: record.status,
        }));

        res.json(result);
    } catch (error) {
        console.error('获取健康记录错误:', error);
        res.status(500).json({ error: '获取健康记录失败' });
    }
});

/**
 * POST /api/health
 * 添加健康记录
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { type, value, unit, note } = req.body;

        if (!type || !value) {
            return res.status(400).json({ error: '请填写记录类型和数值' });
        }

        // 根据类型判断状态
        const status = evaluateHealthStatus(type, value);

        const newRecord = {
            id: uuidv4(),
            user_id: req.user!.id,
            type,
            value,
            unit: unit || getDefaultUnit(type),
            status,
            note,
            recorded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };

        const { data: record, error } = await supabaseAdmin
            .from('health_records')
            .insert(newRecord)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            id: record.id,
            type: record.type,
            value: record.value,
            unit: record.unit,
            timestamp: formatTimestamp(record.recorded_at),
            status: record.status,
        });
    } catch (error) {
        console.error('添加健康记录错误:', error);
        res.status(500).json({ error: '添加健康记录失败' });
    }
});

/**
 * GET /api/health/statistics
 * 获取健康数据统计
 */
router.get('/statistics', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { type, days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        let query = supabaseAdmin
            .from('health_records')
            .select('*')
            .eq('user_id', req.user!.id)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true });

        if (type) {
            query = query.eq('type', type);
        }

        const { data: records, error } = await query;

        if (error) throw error;

        // 按日期分组统计
        const groupedData: { [key: string]: any[] } = {};
        records.forEach((record: any) => {
            const date = new Date(record.recorded_at).toLocaleDateString('zh-CN', {
                weekday: 'short',
            });
            if (!groupedData[date]) {
                groupedData[date] = [];
            }
            groupedData[date].push(record);
        });

        // 生成图表数据
        const chartData = Object.entries(groupedData).map(([date, dayRecords]) => {
            const result: any = { name: date };

            // 计算每种类型的平均值
            const typeValues: { [key: string]: number[] } = {};
            dayRecords.forEach((record: any) => {
                if (!typeValues[record.type]) {
                    typeValues[record.type] = [];
                }
                // 解析数值（处理血压格式如 "120/80"）
                if (record.type === 'bloodPressure') {
                    const [sys] = record.value.split('/').map(Number);
                    typeValues[record.type].push(sys);
                } else {
                    typeValues[record.type].push(Number(record.value));
                }
            });

            Object.entries(typeValues).forEach(([t, values]) => {
                result[t] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            });

            return result;
        });

        res.json({
            chartData,
            totalRecords: records.length,
            period: `最近${days}天`,
        });
    } catch (error) {
        console.error('获取健康统计错误:', error);
        res.status(500).json({ error: '获取健康统计失败' });
    }
});

/**
 * DELETE /api/health/:id
 * 删除健康记录
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('health_records')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user!.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('删除健康记录错误:', error);
        res.status(500).json({ error: '删除健康记录失败' });
    }
});

// ============== 辅助函数 ==============

function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `今天 ${time}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${time}`;
    }

    return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getDefaultUnit(type: string): string {
    const units: { [key: string]: string } = {
        bloodPressure: 'mmHg',
        bloodSugar: 'mmol/L',
        heartRate: '次/分',
        symptom: '',
        weight: 'kg',
        temperature: '°C',
    };
    return units[type] || '';
}

function evaluateHealthStatus(type: string, value: string): string {
    switch (type) {
        case 'bloodPressure': {
            const [sys, dia] = value.split('/').map(Number);
            if (sys >= 140 || dia >= 90) return 'warning';
            if (sys >= 160 || dia >= 100) return 'danger';
            if (sys < 90 || dia < 60) return 'warning';
            return 'normal';
        }
        case 'bloodSugar': {
            const sugar = Number(value);
            if (sugar >= 7.0) return 'warning';
            if (sugar >= 11.1) return 'danger';
            if (sugar < 3.9) return 'danger';
            return 'normal';
        }
        case 'heartRate': {
            const rate = Number(value);
            if (rate > 100 || rate < 60) return 'warning';
            if (rate > 120 || rate < 50) return 'danger';
            return 'normal';
        }
        case 'symptom':
            return 'info';
        default:
            return 'normal';
    }
}

export default router;
