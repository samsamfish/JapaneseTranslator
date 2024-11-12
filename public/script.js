async function retryWithDelay(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithDelay(fn, retries - 1, delay * 2);
    }
}

// 常量定義
const MAX_TEXT_LENGTH = 1000;

// DOM 元素
const inputText = document.getElementById('inputText');
const translateBtn = document.getElementById('translateBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const toolbarButtons = document.querySelectorAll('.toolbar-btn');
const styleOptions = document.querySelectorAll('.style-option');

// 當前選擇的風格
let currentStyle = 'general';

// 風格選擇處理
styleOptions.forEach(option => {
    option.addEventListener('click', function() {
        // 移除其他選項的選中狀態
        styleOptions.forEach(opt => {
            opt.setAttribute('aria-checked', 'false');
        });
        
        // 設置當前選項為選中狀態
        this.setAttribute('aria-checked', 'true');
        
        // 更新當前風格
        currentStyle = this.dataset.style;
    });

    // 添加鍵盤支持
    option.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.click();
        }
    });
});

// 確保選項可以通過鍵盤聚焦
styleOptions.forEach(option => {
    option.setAttribute('tabindex', '0');
});

// 監聽輸入長度
inputText.addEventListener('input', function() {
    if (this.value.length > MAX_TEXT_LENGTH) {
        this.value = this.value.substring(0, MAX_TEXT_LENGTH);
    }
});

// Markdown轉換函數
function convertMarkdownToHtml(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗體
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜體
        .replace(/^- (.*)$/gm, '<li>$1</li>') // 列表項目
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>') // 將連續的列表項目包裝在ul中
        .replace(/\n/g, '<br>'); // 換行
}

// 工具欄按鈕點擊處理
toolbarButtons.forEach(button => {
    button.addEventListener('click', function() {
        const format = this.dataset.format;
        const textarea = inputText;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let replacement = '';
        switch (format) {
            case 'bold':
                replacement = `**${selectedText}**`;
                break;
            case 'italic':
                replacement = `*${selectedText}*`;
                break;
            case 'list':
                replacement = selectedText
                    .split('\n')
                    .map(line => line.trim() ? `- ${line}` : line)
                    .join('\n');
                break;
        }
        
        textarea.value = 
            textarea.value.substring(0, start) +
            replacement +
            textarea.value.substring(end);
    });
});

// 添加鍵盤快捷鍵
inputText.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                document.querySelector('[data-format="bold"]').click();
                break;
            case 'i':
                e.preventDefault();
                document.querySelector('[data-format="italic"]').click();
                break;
        }
    }
});

// 翻譯函數
async function translate(text, style) {
    try {
        // 添加日誌來檢查請求
        console.log('發送請求到:', window.location.origin + '/api/translate');
        console.log('請求內容:', { text, style });

        const translation = await retryWithDelay(() => 
            fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, style })
            })
        );

        // 添加更詳細的錯誤處理
        if (!translation.ok) {
            const errorData = await translation.json().catch(() => null);
            console.error('API 錯誤詳情:', {
                status: translation.status,
                statusText: translation.statusText,
                errorData
            });
            throw new Error(`API 請求失敗: ${translation.status} ${translation.statusText}`);
        }

        const data = await translation.json();
        
        return `
            <div class="translation">
                <p>${convertMarkdownToHtml(data.translation)}</p>
            </div>
        `;
    } catch (error) {
        console.error('Translation error:', error);
        showError(error.message || '翻譯服務暫時無法使用');
        throw error;
    }
}

// 顯示錯誤提示
function showError(message) {
    // 添加錯誤樣式
    inputText.classList.add('error');
    
    // 檢查是否已存在錯誤訊息元素
    let errorMessage = document.querySelector('.error-message');
    if (!errorMessage) {
        // 創建錯誤訊息元素
        errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <i class="ph ph-warning-circle"></i>
            <span>${message}</span>
        `;
        // 插入到textarea後面
        inputText.parentNode.insertBefore(errorMessage, inputText.nextSibling);
    } else {
        // 更新現有錯誤訊息
        errorMessage.querySelector('span').textContent = message;
    }
    
    // 顯示錯誤訊息
    setTimeout(() => errorMessage.classList.add('show'), 10);
    
    // 聚焦輸入框
    inputText.focus();
}

// 清除錯誤提示
function clearError() {
    inputText.classList.remove('error');
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.classList.remove('show');
        setTimeout(() => errorMessage.remove(), 200);
    }
}

// 監聽輸入，清除錯誤提示
inputText.addEventListener('input', clearError);

// 修改翻譯按鈕事件處理器
translateBtn.addEventListener('click', async function() {
    if (!inputText.value.trim()) {
        showError('請先輸入翻譯內容');
        return;
    }

    try {
        translateBtn.disabled = true;
        const originalText = translateBtn.innerHTML;
        translateBtn.innerHTML = '<i class="ph ph-translate"></i>翻譯中...';
        
        const result = await translate(inputText.value, currentStyle);
        outputText.innerHTML = result;
    } catch (error) {
        outputText.innerHTML = '<p class="error">翻譯失敗，請稍後重試</p>';
        console.error('Translation error:', error);
    } finally {
        translateBtn.disabled = false;
        translateBtn.innerHTML = '<i class="ph ph-translate"></i>生成翻譯';
    }
});

// 修改複製按鈕事件處理器
copyBtn.addEventListener('click', function() {
    const translationDiv = outputText.querySelector('.translation p');
    
    if (!translationDiv || !translationDiv.textContent.trim()) {
        showError('請先輸入翻譯內容');
        return;
    }
    
    const translation = translationDiv.textContent;
    
    navigator.clipboard.writeText(translation).then(() => {
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="ph ph-check"></i>已複製！';
        setTimeout(() => {
            this.innerHTML = originalText;
        }, 2000);
    });
});