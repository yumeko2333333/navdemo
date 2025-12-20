document.addEventListener('mouseup', function() {
    // 1. 获取用户选中的文本
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
        // 2. 获取选中范围
        const range = selection.getRangeAt(0);
        
        // 3. 创建一个高亮span并包裹住选中的文本
        const highlight = document.createElement('span');
        highlight.className = 'my-highlight';
        highlight.style.backgroundColor = 'yellow';
        range.surroundContents(highlight);
        
        // 4. 取消选中状态
        selection.removeAllRanges();
    }
});