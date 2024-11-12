import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { improveText } from './services/openai.js';
import { editingPrompt } from './prompts/editing.js';

// 設置 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變量
dotenv.config();

// 驗證環境變量
console.log('環境變量檢查：', {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '已設置' : '未設置'
});

const app = express();
const port = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(express.json());

// 設置靜態文件目錄
app.use(express.static('public'));

// 添加請求日誌中間件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 根路由
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// API 端點
app.post('/api/translate', async (req, res) => {
    try {
        const { text, style } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: '請提供要翻譯的文本' });
        }

        if (!process.env.OPENAI_API_KEY) {
            console.error('OpenAI API Key 未設置');
            return res.status(500).json({ error: 'API 配置錯誤' });
        }

        console.log('Processing translation request:', { text, style });

        const translation = await improveText(text, editingPrompt, style);

        console.log('Translation completed:', translation);

        res.json({ 
            translation: translation,
            style: style
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: '翻譯服務暫時無法使用',
            details: error.message 
        });
    }
});

// 確保所有其他路由都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// 啟動服務器
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 