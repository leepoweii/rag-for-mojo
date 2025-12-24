/**
 * 夢酒館 MOJO 品牌大使 - 前端互動腳本
 */

// DOM 元素
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatContainer = document.getElementById('chatContainer');

// 自動調整 textarea 高度
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Enter 發送，Shift+Enter 換行
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// 表單提交處理
chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message) return;

    // Check if this is the first message (for thinking block display)
    const existingMessages = chatContainer.querySelectorAll('.message');
    const isFirstMessage = existingMessages.length === 0;

    // 添加使用者訊息到聊天區
    addMessage(message, 'user');

    // 清空輸入框並重置高度
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 禁用輸入和按鈕
    setInputState(false);

    // 顯示 typing indicator
    const typingIndicator = showTypingIndicator();

    try {
        // 發送請求到後端 (使用 streaming endpoint)
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error('Stream connection failed');
        }

        // 移除 typing indicator
        removeTypingIndicator(typingIndicator);

        // Process the SSE stream (using isFirstMessage defined above)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep incomplete line in buffer
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                try {
                    const data = JSON.parse(line.slice(6));

                    switch (data.type) {
                        case 'stage1':
                            // Only show thinking blocks for first message
                            if (isFirstMessage) {
                                renderStage1Block(data.data);
                                scrollToBottom();
                            }
                            break;

                        case 'stage2':
                            if (isFirstMessage) {
                                renderStage2Block(data.data);
                                scrollToBottom();
                            }
                            break;

                        case 'stage3':
                            if (isFirstMessage) {
                                renderStage3Block(data.data);
                                scrollToBottom();
                            }
                            break;

                        case 'final_answer':
                            await addMessage(data.data, 'assistant', true);
                            scrollToBottom();
                            break;

                        case 'error':
                            addMessage(data.message || '發生錯誤', 'assistant');
                            break;

                        case 'done':
                            // Stream complete
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e);
                }
            }
        }

    } catch (error) {
        console.error('錯誤:', error);
        removeTypingIndicator(typingIndicator);
        addMessage('連線發生問題，請檢查網路連線後再試一次。', 'assistant');
    } finally {
        // 重新啟用輸入和按鈕
        setInputState(true);

        // 聚焦輸入框
        messageInput.focus();
    }
});

/**
 * 顯示 typing indicator
 */
function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant typing-indicator-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content typing-indicator';

    // 使用 textContent 安全地添加內容
    const dot1 = document.createElement('span');
    const dot2 = document.createElement('span');
    const dot3 = document.createElement('span');
    contentDiv.appendChild(dot1);
    contentDiv.appendChild(dot2);
    contentDiv.appendChild(dot3);

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    scrollToBottom();

    return messageDiv;
}

/**
 * 移除 typing indicator
 */
function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

/**
 * 簡單的 markdown 解析器
 * 支援：links, bold, italic, line breaks
 */
function parseMarkdown(text) {
    // 處理 links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 處理 bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 處理 italic *text*
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 處理換行
    text = text.replace(/\n/g, '<br>');

    return text;
}

/**
 * 添加訊息到聊天區
 * @param {string} text - 訊息內容
 * @param {string} role - 'user' 或 'assistant'
 * @param {boolean} animate - 是否使用打字動畫
 */
async function addMessage(text, role, animate = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    if (animate && role === 'assistant') {
        // 打字機效果 + markdown rendering
        await typeWriterWithMarkdown(contentDiv, text);
    } else {
        // 直接顯示（user 訊息用純文字）
        if (role === 'user') {
            contentDiv.textContent = text;
        } else {
            // assistant 訊息支援 markdown，使用 DOMPurify 淨化
            const renderedHTML = parseMarkdown(text);
            const cleanHTML = DOMPurify.sanitize(renderedHTML);
            contentDiv.innerHTML = cleanHTML;
        }
    }

    // 滾動到最新訊息
    scrollToBottom();
}

/**
 * 打字機效果（支援 markdown）
 * @param {HTMLElement} element - 目標元素
 * @param {string} text - 文字內容
 */
function typeWriterWithMarkdown(element, text) {
    return new Promise((resolve) => {
        let index = 0;
        const speed = 15; // 打字速度（毫秒）

        // 先渲染成 markdown HTML
        const renderedHTML = parseMarkdown(text);

        // 創建臨時元素來獲取純文字內容
        const temp = document.createElement('div');
        temp.textContent = ''; // 使用 textContent 確保安全
        const tempClean = document.createElement('div');
        tempClean.innerHTML = DOMPurify.sanitize(renderedHTML);
        const plainText = tempClean.textContent;

        function type() {
            if (index < plainText.length) {
                // 逐字顯示純文字
                element.textContent = plainText.substring(0, index + 1);
                index++;
                scrollToBottom();
                setTimeout(type, speed);
            } else {
                // 完成後替換為完整的 markdown HTML（使用 DOMPurify 淨化）
                const cleanHTML = DOMPurify.sanitize(renderedHTML);
                element.innerHTML = cleanHTML;
                resolve();
            }
        }

        type();
    });
}

/**
 * 滾動到聊天容器底部
 */
function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * 設定輸入狀態
 * @param {boolean} enabled - 是否啟用
 */
function setInputState(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
}

/**
 * Render Stage 1 block (Query Decomposition)
 */
function renderStage1Block(data) {
    const content = renderStage1Content(data);
    const block = createStageBlock(
        'Stage 1: Query Decomposition',
        '🧩',
        content,
        false  // Expanded by default
    );

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant thinking-message';
    messageDiv.id = 'thinking-blocks-container';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content thinking-content';
    contentDiv.appendChild(block);

    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);

    return messageDiv;
}

/**
 * Render Stage 2 block (Individual Retrieval)
 */
function renderStage2Block(data) {
    const content = renderStage2Content(data);
    const block = createStageBlock(
        'Stage 2: Individual Retrieval',
        '🔍',
        content,
        true  // Collapsed by default
    );

    const container = document.getElementById('thinking-blocks-container');
    if (container) {
        const contentDiv = container.querySelector('.thinking-content');
        contentDiv.appendChild(block);
    }

    return block;
}

/**
 * Render Stage 3 block (Final Integration)
 */
function renderStage3Block(data) {
    const content = renderStage3Content(data);
    const block = createStageBlock(
        'Stage 3: Final Integration',
        '🎯',
        content,
        true  // Collapsed by default
    );

    const container = document.getElementById('thinking-blocks-container');
    if (container) {
        const contentDiv = container.querySelector('.thinking-content');
        contentDiv.appendChild(block);
    }

    return block;
}

/**
 * Create a collapsible stage block
 */
function createStageBlock(title, icon, content, collapsed = true) {
    const block = document.createElement('div');
    block.className = 'thinking-stage';

    const header = document.createElement('div');
    header.className = 'thinking-stage-header';

    // Create child elements safely (no innerHTML)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'thinking-stage-icon';
    iconSpan.textContent = icon;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'thinking-stage-title';
    titleSpan.textContent = title;

    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'thinking-stage-toggle';
    toggleSpan.textContent = collapsed ? '▼' : '▲';

    header.appendChild(iconSpan);
    header.appendChild(titleSpan);
    header.appendChild(toggleSpan);

    const bodyWrapper = document.createElement('div');
    bodyWrapper.className = 'thinking-stage-body';

    if (collapsed) {
        bodyWrapper.style.maxHeight = '0';
        bodyWrapper.style.overflow = 'hidden';
    } else {
        // For expanded state, calculate height after DOM insertion
        setTimeout(() => {
            bodyWrapper.style.maxHeight = bodyWrapper.scrollHeight + 'px';
        }, 0);
    }

    bodyWrapper.appendChild(content);

    // Toggle click handler
    header.addEventListener('click', () => {
        const isCollapsed = bodyWrapper.style.maxHeight === '0px' || bodyWrapper.style.maxHeight === '';
        const toggle = header.querySelector('.thinking-stage-toggle');

        if (isCollapsed) {
            bodyWrapper.style.maxHeight = bodyWrapper.scrollHeight + 'px';
            toggle.textContent = '▲';
        } else {
            bodyWrapper.style.maxHeight = '0';
            toggle.textContent = '▼';
        }
    });

    block.appendChild(header);
    block.appendChild(bodyWrapper);
    return block;
}

/**
 * Render Stage 1 content (Query Decomposition)
 */
function renderStage1Content(stage1) {
    const div = document.createElement('div');
    div.className = 'stage-content';

    // Original query
    const originalQuery = document.createElement('div');
    originalQuery.className = 'original-query';

    const queryLabel = document.createElement('strong');
    queryLabel.textContent = 'Original Query:';
    originalQuery.appendChild(queryLabel);
    originalQuery.appendChild(document.createElement('br'));

    const queryText = document.createTextNode(stage1.original_query);
    originalQuery.appendChild(queryText);

    // Sub-queries title
    const subQueriesTitle = document.createElement('div');
    subQueriesTitle.className = 'sub-queries-title';
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = 'Decomposed Sub-queries:';
    subQueriesTitle.appendChild(titleStrong);

    // Sub-queries list
    const subQueriesList = document.createElement('ol');
    subQueriesList.className = 'sub-queries-list';
    stage1.sub_queries.forEach(query => {
        const li = document.createElement('li');
        li.textContent = query;
        subQueriesList.appendChild(li);
    });

    div.appendChild(originalQuery);
    div.appendChild(subQueriesTitle);
    div.appendChild(subQueriesList);
    return div;
}

/**
 * Render Stage 2 content (Individual Retrieval)
 */
function renderStage2Content(stage2) {
    const div = document.createElement('div');
    div.className = 'stage-content';

    stage2.forEach((retrieval, index) => {
        const retrievalBlock = document.createElement('div');
        retrievalBlock.className = 'retrieval-block';

        // Query title
        const queryTitle = document.createElement('div');
        queryTitle.className = 'retrieval-query';
        const queryStrong = document.createElement('strong');
        queryStrong.textContent = `Sub-query ${index + 1}: `;
        queryTitle.appendChild(queryStrong);
        queryTitle.appendChild(document.createTextNode(retrieval.sub_query));

        // Chunks title
        const chunksTitle = document.createElement('div');
        chunksTitle.className = 'chunks-title';
        chunksTitle.textContent = 'Retrieved Chunks:';

        // Chunks list
        const chunksList = document.createElement('div');
        chunksList.className = 'chunks-list';
        retrieval.chunks.forEach((chunk, chunkIndex) => {
            const chunkDiv = document.createElement('div');
            chunkDiv.className = 'chunk-item';

            const chunkNumber = document.createElement('span');
            chunkNumber.className = 'chunk-number';
            chunkNumber.textContent = `${chunkIndex + 1}. `;

            // Truncate chunk to 150 chars
            const truncatedChunk = chunk.length > 150
                ? chunk.substring(0, 150) + '...'
                : chunk;

            chunkDiv.appendChild(chunkNumber);
            chunkDiv.appendChild(document.createTextNode(truncatedChunk));
            chunksList.appendChild(chunkDiv);
        });

        retrievalBlock.appendChild(queryTitle);
        retrievalBlock.appendChild(chunksTitle);
        retrievalBlock.appendChild(chunksList);
        div.appendChild(retrievalBlock);
    });

    return div;
}

/**
 * Render Stage 3 content (Integration)
 */
function renderStage3Content(stage3) {
    const div = document.createElement('div');
    div.className = 'stage-content';

    // Method
    const method = document.createElement('div');
    const methodLabel = document.createElement('strong');
    methodLabel.textContent = 'Method: ';
    method.appendChild(methodLabel);
    method.appendChild(document.createTextNode(stage3.method));

    // Note
    const note = document.createElement('div');
    note.style.marginTop = '10px';
    const noteLabel = document.createElement('strong');
    noteLabel.textContent = 'Note: ';
    note.appendChild(noteLabel);
    note.appendChild(document.createTextNode(stage3.note));

    // Final Prompt (if available)
    if (stage3.final_prompt) {
        const promptSection = document.createElement('div');
        promptSection.style.marginTop = '15px';

        const promptTitle = document.createElement('div');
        promptTitle.className = 'sub-queries-title';
        const promptTitleStrong = document.createElement('strong');
        promptTitleStrong.textContent = 'Final Prompt Sent to LLM:';
        promptTitle.appendChild(promptTitleStrong);

        const promptContent = document.createElement('pre');
        promptContent.style.background = 'rgba(0, 0, 0, 0.2)';
        promptContent.style.padding = '12px';
        promptContent.style.borderRadius = '8px';
        promptContent.style.whiteSpace = 'pre-wrap';
        promptContent.style.wordWrap = 'break-word';
        promptContent.style.fontSize = '0.85em';
        promptContent.style.lineHeight = '1.5';
        promptContent.style.maxHeight = '400px';
        promptContent.style.overflow = 'auto';
        promptContent.style.border = '1px solid rgba(201, 169, 97, 0.2)';
        promptContent.textContent = stage3.final_prompt;

        promptSection.appendChild(promptTitle);
        promptSection.appendChild(promptContent);
        div.appendChild(method);
        div.appendChild(note);
        div.appendChild(promptSection);
    } else {
        div.appendChild(method);
        div.appendChild(note);
    }

    return div;
}

// 頁面載入完成後聚焦輸入框
window.addEventListener('load', () => {
    messageInput.focus();
});

// 防止表單重複提交
let isSubmitting = false;
chatForm.addEventListener('submit', function(e) {
    if (isSubmitting) {
        e.preventDefault();
        return;
    }
    isSubmitting = true;
    setTimeout(() => {
        isSubmitting = false;
    }, 1000);
});
