document.addEventListener('DOMContentLoaded', () => {
    const aiPromptPanel = document.getElementById('aiPromptPanel');
    const aiPromptHandle = document.querySelector('.ai-prompt-handle');
    const saveAiPromptBtn = document.getElementById('saveAiPromptBtn');
    const jobMatchPrompt = document.getElementById('jobMatchPrompt');
    const jobMatchDescription = document.getElementById('jobMatchDescription');

    const basePrompt = "帮我根据职位描述判断对应职位是否匹配我的岗位，我需要做 {{描述}} 工作，给我返回是否匹配即可，是返回true，否返回false\n\n职位描述如下：";

    // Toggle panel visibility
    if (aiPromptHandle) {
        aiPromptHandle.addEventListener('click', () => {
            aiPromptPanel.classList.toggle('show');
        });
    }

    // Load saved prompt from localStorage
    const savedPrompt = localStorage.getItem('jobMatchPrompt');
    if (savedPrompt) {
        jobMatchPrompt.value = savedPrompt;
        const match = savedPrompt.match(/我需要做 (.*) 工作/);
        if (match && match[1] && jobMatchDescription) {
            jobMatchDescription.value = match[1];
        }
    } else {
        // If no prompt is saved, initialize with the base prompt but don't populate the user-facing input
        // so that the HTML placeholder is visible.
        jobMatchPrompt.value = basePrompt;
    }


    // Save prompt to localStorage
    if (saveAiPromptBtn) {
        saveAiPromptBtn.addEventListener('click', () => {
            if (jobMatchDescription && jobMatchPrompt) {
                const newPrompt = basePrompt.replace('{{描述}}', jobMatchDescription.value);
                jobMatchPrompt.value = newPrompt;
                localStorage.setItem('jobMatchPrompt', newPrompt);
                // You can add a toast notification here to inform the user
                // For example, using the existing globalToast
                const toast = new bootstrap.Toast(document.getElementById('globalToast'));
                document.getElementById('globalToastBody').textContent = 'AI提示词已保存！';
                toast.show();
            }
        });
    }
});
