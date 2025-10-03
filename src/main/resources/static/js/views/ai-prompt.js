document.addEventListener('DOMContentLoaded', () => {
    const aiPromptPanel = document.getElementById('aiPromptPanel');
    const aiPromptHandle = document.querySelector('.ai-prompt-handle');
    const promptContent = document.querySelector('.ai-prompt-content');

    // Toggle panel visibility
    if (aiPromptHandle) {
        aiPromptHandle.addEventListener('click', () => {
            aiPromptPanel.classList.toggle('show');
        });
    }

    // Load all prompts from the backend
    fetch('/api/ai/prompt')
        .then(response => response.json())
        .then(prompts => {
            promptContent.innerHTML = `
                <h5>
                    <i class="bi bi-pencil-square me-2"></i>
                    自定义AI提示词
                </h5>
            `;
            prompts.forEach(prompt => {
                const promptEl = document.createElement('div');
                promptEl.classList.add('mb-3');

                let placeholdersHtml = '';
                if (prompt.placeholders) {
                    placeholdersHtml = Object.keys(prompt.placeholders)
                        .filter(key => prompt.placeholders[key].required)
                        .map(key => {
                            const placeholder = prompt.placeholders[key];
                            return `
                                <div class="mb-2">
                                    <label for="prompt-${prompt.name}-${key}" class="form-label">${placeholder.description || key}</label>
                                    <input type="text" id="prompt-${prompt.name}-${key}" class="form-control form-control-sm" value="${placeholder.value || ''}">
                                </div>
                            `;
                        }).join('');
                }

                promptEl.innerHTML = `
                    <div class="mt-2">
                        ${placeholdersHtml}
                    </div>
                    <button class="btn btn-primary btn-sm w-100 mt-2 render-prompt-btn" data-prompt-name="${prompt.name}">保存</button>
                `;
                promptContent.appendChild(promptEl);
            });

            document.querySelectorAll('.render-prompt-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const promptName = e.target.dataset.promptName;
                    const prompt = prompts.find(p => p.name === promptName);
                    const variables = {};
                    if (prompt.placeholders) {
                        Object.keys(prompt.placeholders).forEach(key => {
                            const inputElement = document.getElementById(`prompt-${prompt.name}-${key}`);
                            if (inputElement) {
                                variables[key] = inputElement.value;
                            }
                        });
                    }

                    const requestData = {
                        name: promptName,
                        variables: variables
                    };

                    fetch('/api/ai/prompt/render', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestData),
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .then(renderedPrompt => {
                        console.log('Success:', renderedPrompt);
                        const toast = new bootstrap.Toast(document.getElementById('globalToast'));
                        document.getElementById('globalToastBody').textContent = 'AI提示词已保存！';
                        toast.show();
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        const toast = new bootstrap.Toast(document.getElementById('globalToast'));
                        document.getElementById('globalToastBody').textContent = 'AI提示词保存失败！';
                        toast.show();
                    });
                });
            });
        })
        .catch(error => console.error('Error loading prompts:', error));
});
