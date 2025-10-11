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

            const config = await response.json();
            
            // 填充表单
            if (config.jobBlacklistKeywords && jobTagsInput) {
                jobTagsInput.setValue(config.jobBlacklistKeywords);
            }
            if (config.companyBlacklistKeywords && companyTagsInput) {
                companyTagsInput.setValue(config.companyBlacklistKeywords);
            }

            console.log('公共配置加载成功');
        } catch (error) {
            console.error('加载公共配置失败:', error);
        }
    }

    /**
     * 保存公共配置
     */
    async function saveCommonConfig() {
        try {
            // 获取表单数据（使用标签输入组件）
            const jobKeywords = jobTagsInput ? jobTagsInput.getValue() : '';
            const companyKeywords = companyTagsInput ? companyTagsInput.getValue() : '';

            // 构建配置对象
            const config = {
                jobBlacklistKeywords: jobKeywords,
                companyBlacklistKeywords: companyKeywords
            };

            // 显示加载状态
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>保存中...';

            // 发送请求
            const response = await fetch(API_ENDPOINTS.SAVE_CONFIG, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                throw new Error('保存失败');
            }

            // 显示成功消息
            if (window.CommonUtils && window.CommonUtils.showToast) {
                window.CommonUtils.showToast('公共配置保存成功！', 'success');
            } else {
                alert('公共配置保存成功！');
            }

            console.log('公共配置保存成功:', config);
        } catch (error) {
            console.error('保存公共配置失败:', error);
            if (window.CommonUtils && window.CommonUtils.showToast) {
                window.CommonUtils.showToast('保存失败：' + error.message, 'danger');
            } else {
                alert('保存失败：' + error.message);
            }
        } finally {
            // 恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-save me-2"></i>保存公共配置';
        }
    }

    /**
     * 重置公共配置
     */
    function resetCommonConfig() {
        if (window.CommonUtils && window.CommonUtils.showConfirm) {
            window.CommonUtils.showConfirm(
                '确定要重置所有公共配置吗？',
                () => {
                    if (jobTagsInput) jobTagsInput.clear();
                    if (companyTagsInput) companyTagsInput.clear();
                    if (window.CommonUtils.showToast) {
                        window.CommonUtils.showToast('配置已重置', 'info');
                    }
                }
            );
        } else {
            if (confirm('确定要重置所有公共配置吗？')) {
                if (jobTagsInput) jobTagsInput.clear();
                if (companyTagsInput) companyTagsInput.clear();
                alert('配置已重置');
            }
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

