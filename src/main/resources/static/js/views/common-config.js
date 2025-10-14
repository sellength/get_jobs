/**
 * 公共配置管理模块
 * 用于管理跨平台的通用配置，如黑名单关键字等
 */

(function() {
    'use strict';

    // API端点
    const API_ENDPOINTS = {
        SAVE_CONFIG: '/api/common/config/save',
        GET_CONFIG: '/api/common/config/get'
    };

    // DOM元素
    let jobBlacklistInput;
    let companyBlacklistInput;
    let jobTagsInput;
    let companyTagsInput;
    let saveBtn;
    let resetBtn;

    /**
     * 初始化模块
     */
    function init() {
        // 获取DOM元素
        jobBlacklistInput = document.getElementById('commonJobBlacklistKeywords');
        companyBlacklistInput = document.getElementById('commonCompanyBlacklistKeywords');
        const jobTagsWrapper = document.getElementById('jobBlacklistTags');
        const companyTagsWrapper = document.getElementById('companyBlacklistTags');
        saveBtn = document.getElementById('saveCommonConfigBtn');
        resetBtn = document.getElementById('resetCommonConfigBtn');

        // 初始化标签输入组件
        if (jobBlacklistInput && jobTagsWrapper) {
            jobTagsInput = new window.TagsInput(jobBlacklistInput, jobTagsWrapper);
        }
        if (companyBlacklistInput && companyTagsWrapper) {
            companyTagsInput = new window.TagsInput(companyBlacklistInput, companyTagsWrapper);
        }

        // 绑定事件
        if (saveBtn) {
            saveBtn.addEventListener('click', saveCommonConfig);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', resetCommonConfig);
        }

        // 页面加载时获取配置
        loadCommonConfig();
        loadProfileData();
    }

    /**
     * 加载公共配置
     */
    async function loadCommonConfig() {
        try {
            const response = await fetch(API_ENDPOINTS.GET_CONFIG);
            
            if (!response.ok) {
                console.warn('未找到公共配置，将使用默认值');
                return;
            }

            const result = await response.json();
            const config = result.data; // 从 data 属性中获取实际配置数据
            
            // 如果没有配置数据，直接返回
            if (!config) {
                console.warn('暂无配置数据');
                return;
            }
            
            // 填充表单
            if (config.jobBlacklistKeywords && jobTagsInput) {
                jobTagsInput.setTags(config.jobBlacklistKeywords);
            }
            if (config.companyBlacklistKeywords && companyTagsInput) {
                companyTagsInput.setTags(config.companyBlacklistKeywords);
            }

            console.log('公共配置加载成功', config);
        } catch (error) {
            console.error('加载公共配置失败:', error);
        }
    }

    /**
     * 收集候选人信息表单数据
     */
    function collectProfileData() {
        const parseStringToList = (str, separator = ',') => {
            if (!str || !str.trim()) return [];
            return str.split(separator)
                      .map(item => item.trim())
                      .filter(item => item.length > 0);
        };

        return {
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
    }

    /**
     * 验证候选人信息
     */
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

    /**
     * 保存公共配置（包括黑名单和候选人信息）
     */
    async function saveCommonConfig() {
        try {
            // 获取黑名单配置
            const jobKeywords = jobTagsInput ? jobTagsInput.getValue() : '';
            const companyKeywords = companyTagsInput ? companyTagsInput.getValue() : '';

            // 获取候选人信息
            const profileData = collectProfileData();
            const profileErrors = validateProfileData(profileData);
            
            if (profileErrors.length > 0) {
                if (window.CommonUtils && window.CommonUtils.showToast) {
                    window.CommonUtils.showToast('请检查候选人信息：\n' + profileErrors.join('\n'), 'warning');
                } else {
                    alert('请检查候选人信息：\n' + profileErrors.join('\n'));
                }
                return;
            }

            // 构建完整配置对象（包括黑名单和候选人信息）
            const config = {
                jobBlacklistKeywords: jobKeywords,
                companyBlacklistKeywords: companyKeywords,
                // 候选人信息
                role: profileData.role,
                years: profileData.years,
                domains: profileData.domains,
                coreStack: profileData.coreStack,
                scale: profileData.scale,
                achievements: profileData.achievements,
                strengths: profileData.strengths,
                improvements: profileData.improvements,
                availability: profileData.availability,
                links: profileData.links
            };

            // 显示加载状态
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>保存中...';

            // 统一保存所有配置（黑名单 + 候选人信息）
            const configResponse = await fetch(API_ENDPOINTS.SAVE_CONFIG, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (!configResponse.ok) {
                const errorData = await configResponse.json();
                throw new Error(errorData.message || '保存配置失败');
            }

            const result = await configResponse.json();

            // 本地存储候选人信息
            localStorage.setItem('candidateProfile', JSON.stringify(profileData));

            // 显示成功消息
            if (window.CommonUtils && window.CommonUtils.showToast) {
                window.CommonUtils.showToast(result.message || '所有配置保存成功！', 'success');
            } else {
                alert(result.message || '所有配置保存成功！');
            }

            console.log('配置保存成功:', config);
        } catch (error) {
            console.error('保存配置失败:', error);
            if (window.CommonUtils && window.CommonUtils.showToast) {
                window.CommonUtils.showToast('保存失败：' + error.message, 'danger');
            } else {
                alert('保存失败：' + error.message);
            }
        } finally {
            // 恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-save me-2"></i>保存所有配置';
        }
    }

    /**
     * 重置公共配置（包括黑名单和候选人信息）
     */
    function resetCommonConfig() {
        const doReset = () => {
            // 重置黑名单配置
            if (jobTagsInput) jobTagsInput.clear();
            if (companyTagsInput) companyTagsInput.clear();
            
            // 重置候选人信息表单
            const profileFields = [
                'profileRole', 'profileYears', 'profileDomains', 'profileCoreStack',
                'profileQpsPeak', 'profileSla', 'profileAchievements', 'profileStrengths',
                'profileImprovements', 'profileAvailability', 'profileGithub', 'profilePortfolio'
            ];
            
            profileFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                    field.classList.remove('is-valid', 'is-invalid');
                }
            });
            
            if (window.CommonUtils && window.CommonUtils.showToast) {
                window.CommonUtils.showToast('所有配置已重置', 'info');
            } else {
                alert('所有配置已重置');
            }
        };

        if (window.CommonUtils && window.CommonUtils.showConfirm) {
            window.CommonUtils.showConfirm(
                '确定要重置所有配置吗？（包括黑名单和候选人信息）',
                doReset
            );
        } else {
            if (confirm('确定要重置所有配置吗？（包括黑名单和候选人信息）')) {
                doReset();
            }
        }
    }

    /**
     * 加载候选人信息
     */
    function loadProfileData() {
        // 先从本地存储加载
        const savedProfile = localStorage.getItem('candidateProfile');
        if (savedProfile) {
            try {
                const profileData = JSON.parse(savedProfile);
                populateProfileForm(profileData);
            } catch (error) {
                console.error('解析本地存储的候选人信息失败:', error);
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
                console.error('从服务器加载候选人信息失败:', error);
            });
    }

    /**
     * 填充候选人信息表单
     */
    function populateProfileForm(profileData) {
        if (!profileData) return;
        
        const setFieldValue = (fieldId, value) => {
            const field = document.getElementById(fieldId);
            if (field && value !== undefined && value !== null) {
                field.value = value;
            }
        };
        
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

    /**
     * 获取岗位黑名单关键字（供其他模块调用）
     */
    function getJobBlacklistKeywords() {
        if (!jobTagsInput) {
            return '';
        }
        return jobTagsInput.getValue();
    }

    /**
     * 获取公司黑名单关键字（供其他模块调用）
     */
    function getCompanyBlacklistKeywords() {
        if (!companyTagsInput) {
            return '';
        }
        return companyTagsInput.getValue();
    }

    // 导出公共方法
    window.CommonConfig = {
        init: init,
        getJobBlacklistKeywords: getJobBlacklistKeywords,
        getCompanyBlacklistKeywords: getCompanyBlacklistKeywords,
        loadCommonConfig: loadCommonConfig
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

