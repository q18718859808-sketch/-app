import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 所有药品路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/medications
 * 获取用户的所有药品
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data: medications, error } = await supabaseAdmin
            .from('medications')
            .select('*')
            .eq('user_id', req.user!.id)
            .order('scheduled_time', { ascending: true });

        if (error) throw error;

        // 转换字段名为前端格式
        const result = medications.map((med: any) => ({
            id: med.id,
            name: med.name,
            dosage: med.dosage,
            timeLabel: med.time_label,
            scheduledTime: med.scheduled_time,
            status: med.status,
            instructions: med.instructions,
            stock: med.stock,
            takenTime: med.taken_time,
        }));

        res.json(result);
    } catch (error) {
        console.error('获取药品列表错误:', error);
        res.status(500).json({ error: '获取药品列表失败' });
    }
});

/**
 * POST /api/medications
 * 添加新药品
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, dosage, timeLabel, scheduledTime, instructions, stock } = req.body;

        if (!name || !dosage || !scheduledTime) {
            return res.status(400).json({ error: '请填写必要的药品信息' });
        }

        const newMedication = {
            id: uuidv4(),
            user_id: req.user!.id,
            name,
            dosage,
            time_label: timeLabel || '早上',
            scheduled_time: scheduledTime,
            instructions: instructions || '遵医嘱',
            stock: stock || 30,
            status: 'pending',
            created_at: new Date().toISOString(),
        };

        const { data: medication, error } = await supabaseAdmin
            .from('medications')
            .insert(newMedication)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            timeLabel: medication.time_label,
            scheduledTime: medication.scheduled_time,
            status: medication.status,
            instructions: medication.instructions,
            stock: medication.stock,
        });
    } catch (error) {
        console.error('添加药品错误:', error);
        res.status(500).json({ error: '添加药品失败' });
    }
});

/**
 * PUT /api/medications/:id
 * 更新药品信息
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, dosage, timeLabel, scheduledTime, instructions, stock, status } = req.body;

        const { data: medication, error } = await supabaseAdmin
            .from('medications')
            .update({
                name,
                dosage,
                time_label: timeLabel,
                scheduled_time: scheduledTime,
                instructions,
                stock,
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .select()
            .single();

        if (error) throw error;

        if (!medication) {
            return res.status(404).json({ error: '药品不存在' });
        }

        res.json({
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            timeLabel: medication.time_label,
            scheduledTime: medication.scheduled_time,
            status: medication.status,
            instructions: medication.instructions,
            stock: medication.stock,
        });
    } catch (error) {
        console.error('更新药品错误:', error);
        res.status(500).json({ error: '更新药品失败' });
    }
});

/**
 * POST /api/medications/:id/take
 * 标记药品已服用
 */
router.post('/:id/take', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const takenTime = new Date().toISOString();

        // 获取当前药品信息
        const { data: currentMed } = await supabaseAdmin
            .from('medications')
            .select('stock')
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .single();

        if (!currentMed) {
            return res.status(404).json({ error: '药品不存在' });
        }

        // 更新药品状态
        const { data: medication, error } = await supabaseAdmin
            .from('medications')
            .update({
                status: 'taken',
                stock: Math.max(0, currentMed.stock - 1),
                taken_time: takenTime,
                updated_at: takenTime,
            })
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .select()
            .single();

        if (error) throw error;

        // 创建服药记录
        await supabaseAdmin.from('medication_records').insert({
            id: uuidv4(),
            medication_id: id,
            user_id: req.user!.id,
            scheduled_time: medication.scheduled_time,
            taken_time: takenTime,
            status: 'taken',
            created_at: takenTime,
        });

        res.json({
            id: medication.id,
            name: medication.name,
            status: medication.status,
            stock: medication.stock,
            takenTime: medication.taken_time,
        });
    } catch (error) {
        console.error('记录服药错误:', error);
        res.status(500).json({ error: '记录服药失败' });
    }
});

/**
 * DELETE /api/medications/:id
 * 删除药品
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('medications')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user!.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('删除药品错误:', error);
        res.status(500).json({ error: '删除药品失败' });
    }
});

/**
 * POST /api/medications/reset-daily
 * 重置每日药品状态 (用于每天凌晨定时任务)
 */
router.post('/reset-daily', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { error } = await supabaseAdmin
            .from('medications')
            .update({
                status: 'pending',
                taken_time: null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', req.user!.id)
            .eq('status', 'taken');

        if (error) throw error;

        res.json({ success: true, message: '已重置今日药品状态' });
    } catch (error) {
        console.error('重置药品状态错误:', error);
        res.status(500).json({ error: '重置药品状态失败' });
    }
});

export default router;
