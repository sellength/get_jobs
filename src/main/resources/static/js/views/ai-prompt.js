document.addEventListener('DOMContentLoaded', () => {
    const aiPromptPanel = document.getElementById('aiPromptPanel');
    const aiPromptHandle = document.querySelector('.ai-prompt-handle');

    // Toggle panel visibility
    if (aiPromptHandle) {
        aiPromptHandle.addEventListener('click', () => {
            aiPromptPanel.classList.toggle('show');
        });
    }

    // 初始化候选人信息表单
    initializeProfileForm();
    
    // 初始化打招呼内容
    initializeGreetingForm();

    // 保存候选人信息按钮事件
    const saveAiPromptBtn = document.getElementById('saveAiPromptBtn');
    if (saveAiPromptBtn) {
        saveAiPromptBtn.addEventListener('click', saveProfileData);
    }
});

// 初始化候选人信息表单
function initializeProfileForm() {
    // 加载已保存的候选人信息
    loadProfileData();
    
    // 为表单字段添加实时验证
    const requiredFields = ['profileRole', 'profileYears'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', validateRequiredField);
        }
    });
}

// 初始化打招呼内容
function initializeGreetingForm() {
    // 加载已保存的打招呼内容
    loadGreetingContent();
}

// 验证必填字段
function validateRequiredField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    if (!value) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
    } else {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    }
}

// 收集候选人信息表单数据
function collectProfileData() {
    const profileData = {
        role: document.getElementById('profileRole')?.value?.trim() || '',
        years: parseInt(document.getElementById('profileYears')?.value) || 0,
        domains: parseStringToList(document.getElementById('profileDomains')?.value),
        coreStack: parseStringToList(document.getElementById('profileCoreStack')?.value),
        scale: {
            qps_peak: document.getElementById('profileQpsPeak')?.value?.trim() || '',
            sla: document.getElementById('profileSla')?.value?.trim() || ''
        },
        achievements: parseStringToList(document.getElementById('profileAchievements')?.value, ';'),
        strengths: parseStringToList(document.getElementById('profileStrengths')?.value),
        improvements: parseStringToList(document.getElementById('profileImprovements')?.value),
        availability: document.getElementById('profileAvailability')?.value?.trim() || '',
        links: {
            github: document.getElementById('profileGithub')?.value?.trim() || '',
            portfolio: document.getElementById('profilePortfolio')?.value?.trim() || ''
        }
    };
    
    return profileData;
}

// 解析字符串为列表
function parseStringToList(str, separator = ',') {
    if (!str || !str.trim()) {
        return [];
    }
    return str.split(separator)
              .map(item => item.trim())
              .filter(item => item.length > 0);
}

// 验证候选人信息
function validateProfileData(profileData) {
    const errors = [];
    
    if (!profileData.role) {
        errors.push('角色/职位不能为空');
    }
    
    if (profileData.years <= 0) {
        errors.push('工作年限必须大于0');
    }
    
    return errors;
}

// 保存候选人信息
function saveProfileData() {
    const profileData = collectProfileData();
    const errors = validateProfileData(profileData);
    
    if (errors.length > 0) {
        showToast('请检查以下错误：\n' + errors.join('\n'), 'error');
        return;
    }
    
    // 显示保存中的状态
    const saveBtn = document.getElementById('saveAiPromptBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>保存中...';
    saveBtn.disabled = true;
    
    // 发送到后端保存
    fetch('/api/ai/profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(result => {
        showToast('候选人信息保存成功！', 'success');
        // 本地存储
        localStorage.setItem('candidateProfile', JSON.stringify(profileData));
    })
    .catch((error) => {
        console.error('Error saving profile:', error);
        showToast('候选人信息保存失败！', 'error');
    })
    .finally(() => {
        // 恢复按钮状态
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    });
}

// 加载候选人信息
function loadProfileData() {
    // 先从本地存储加载
    const savedProfile = localStorage.getItem('candidateProfile');
    if (savedProfile) {
        try {
            const profileData = JSON.parse(savedProfile);
            populateProfileForm(profileData);
        } catch (error) {
            console.error('Error parsing saved profile:', error);
        }
    }
    
    // 再从后端加载
    fetch('/api/ai/profile')
        .then(response => response.json())
        .then(profileData => {
            if (profileData && Object.keys(profileData).length > 0) {
                populateProfileForm(profileData);
            }
        })
        .catch(error => {
            console.error('Error loading profile from server:', error);
        });
}

// 填充候选人信息表单
function populateProfileForm(profileData) {
    if (!profileData) return;
    
    // 基本字段
    setFieldValue('profileRole', profileData.role);
    setFieldValue('profileYears', profileData.years);
    setFieldValue('profileDomains', profileData.domains?.join(', '));
    setFieldValue('profileCoreStack', profileData.coreStack?.join(', '));
    setFieldValue('profileAchievements', profileData.achievements?.join('; '));
    setFieldValue('profileStrengths', profileData.strengths?.join(', '));
    setFieldValue('profileImprovements', profileData.improvements?.join(', '));
    setFieldValue('profileAvailability', profileData.availability);
    
    // 项目规模
    if (profileData.scale) {
        setFieldValue('profileQpsPeak', profileData.scale.qps_peak);
        setFieldValue('profileSla', profileData.scale.sla);
    }
    
    // 个人链接
    if (profileData.links) {
        setFieldValue('profileGithub', profileData.links.github);
        setFieldValue('profilePortfolio', profileData.links.portfolio);
    }
}

// 设置字段值
function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value !== undefined && value !== null) {
        field.value = value;
    }
}

// 加载打招呼内容
function loadGreetingContent() {
    // 从本地存储加载
    const savedGreeting = localStorage.getItem('aiGreetingContent');
    if (savedGreeting) {
        const greetingField = document.getElementById('aiGreetingContent');
        if (greetingField) {
            greetingField.value = savedGreeting;
        }
    }
}

// 显示提示消息
function showToast(message, type = 'success') {
    const toast = new bootstrap.Toast(document.getElementById('globalToast'));
    const toastBody = document.getElementById('globalToastBody');
    const toastElement = document.getElementById('globalToast');
    
    if (type === 'error') {
        toastElement.className = 'toast align-items-center text-bg-danger border-0';
    } else if (type === 'warning') {
        toastElement.className = 'toast align-items-center text-bg-warning border-0';
    } else {
        toastElement.className = 'toast align-items-center text-bg-success border-0';
    }
    
    toastBody.textContent = message;
    toast.show();
}
