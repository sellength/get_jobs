// liepin配置表单管理类
class LiepinConfigForm {
    constructor() {
        this.config = {};
        this.isRunning = false;
        this.taskStates = {
            loginTaskId: null,
            collectTaskId: null,
            filterTaskId: null,
            applyTaskId: null
        };
        this.statusPollingInterval = null; // 状态轮询定时器
        this.latestTaskStatus = null; // 缓存最新的任务状态查询结果
        this.init();
    }

    init() {
        this.initializeTooltips();
        this.bindEvents();
        this.loadDataSequentially();
    }

    initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('#liepin-pane [data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    bindEvents() {
        document.getElementById('liepinSaveConfigBtn')?.addEventListener('click', () => this.handleSaveConfig());
        document.getElementById('liepinBackupDataBtn')?.addEventListener('click', () => this.handleBackupData());
        document.getElementById('liepinLoginBtn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('liepinLoginManualBtn')?.addEventListener('click', () => this.handleManualLogin());
        document.getElementById('liepinCollectBtn')?.addEventListener('click', () => this.handleCollect());
        document.getElementById('liepinFilterBtn')?.addEventListener('click', () => this.handleFilter());
        document.getElementById('liepinApplyBtn')?.addEventListener('click', () => this.handleApply());
        document.getElementById('liepinResetTasksBtn')?.addEventListener('click', () => this.resetTaskFlow());

        this.bindAutoSave();
    }

    bindAutoSave() {
        const formElements = document.querySelectorAll('#liepin-config-pane input, #liepin-config-pane select, #liepin-config-pane textarea');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
                this.saveConfig();
            });
        });
    }

    saveConfig() {
        const getMultiSelectValues = (selectId) => {
            const el = document.getElementById(selectId);
            if (!el) return '';
            return Array.from(el.selectedOptions).map(o => o.value).filter(Boolean).join(',');
        };

        this.config = {
            keywords: document.getElementById('liepinKeywordsField')?.value || '',
            industry: getMultiSelectValues('liepinIndustryField'),
            cityCode: getMultiSelectValues('liepinCityCodeField'),
            experience: document.getElementById('liepinExperienceComboBox')?.value || '',
            jobType: document.getElementById('liepinJobTypeComboBox')?.value || '',
            salary: document.getElementById('liepinSalaryComboBox')?.value || '',
            degree: document.getElementById('liepinDegreeComboBox')?.value || '',
            scale: document.getElementById('liepinScaleComboBox')?.value || '',
            companyNature: document.getElementById('liepinCompanyNatureComboBox')?.value || '',
            recruiterActivity: document.getElementById('liepinRecruiterActivityComboBox')?.value || '',
            blacklistFilter: document.getElementById('liepinBlacklistFilterCheckBox')?.checked || false,
            enableAIJobMatch: document.getElementById('liepinEnableAIJobMatchCheckBox')?.checked || false
        };

        localStorage.setItem('liepinConfig', JSON.stringify(this.config));

        try {
            fetch('/api/config/liepin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            }).then(() => {}).catch(() => {});
        } catch (e) {}
    }

    async loadSavedConfig() {
        try {
            const res = await fetch('/api/config/liepin');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (data && typeof data === 'object' && Object.keys(data).length) {
                this.config = data;
                this.populateForm();
                localStorage.setItem('liepinConfig', JSON.stringify(this.config));
                return;
            }
        } catch (err) {
            console.warn('Liepin backend config read failed: ' + (err?.message || 'Unknown error'));
        }

        const savedConfig = localStorage.getItem('liepinConfig');
        if (savedConfig) {
            try {
                this.config = JSON.parse(savedConfig);
                this.populateForm();
            } catch (error) {
                console.warn('Liepin local config corrupted, cleared: ' + error.message);
                localStorage.removeItem('liepinConfig');
            }
        }
    }

    populateForm() {
        Object.keys(this.config).forEach(key => {
            const element = document.getElementById(this.getFieldId(key));
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.config[key];
                } else {
                    let value = this.config[key];
                    if (Array.isArray(value)) {
                        value = value.join(',');
                    }
                    element.value = value || '';
                }
            }
        });

        try {
            let cityCodeStr = Array.isArray(this.config.cityCode) ? this.config.cityCode.join(',') : (this.config.cityCode || '');
            const codes = cityCodeStr.split(',').map(s => s.trim()).filter(Boolean);
            const citySelect = document.getElementById('liepinCityCodeField');
            if (citySelect && codes.length) {
                Array.from(citySelect.options).forEach(opt => {
                    opt.selected = codes.includes(opt.value);
                });
                this.updateCitySummary();
            }
        } catch (_) {}

        // 回填行业多选（隐藏select）并同步dropdown显示
        try {
            let industryStr = '';
            if (Array.isArray(this.config.industry)) industryStr = this.config.industry.join(',');
            else industryStr = this.config.industry || '';
            const codes = industryStr.split(',').map(s => s.trim()).filter(Boolean);
            const industrySelect = document.getElementById('liepinIndustryField');
            if (industrySelect && codes.length) {
                Array.from(industrySelect.options).forEach(opt => { opt.selected = codes.includes(opt.value); });
                const btn = document.getElementById('liepinIndustryDropdownBtn');
                const summary = document.getElementById('liepinIndustrySelectionSummary');
                const set = new Set(codes);
                const childListContainer = document.getElementById('liepinIndustryChildList');
                if (childListContainer) childListContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = set.has(chk.value));
                if (btn && summary) {
                    const values = Array.from(industrySelect.selectedOptions).map(o => o.textContent || '').filter(Boolean);
                    if (values.length === 0) { btn.textContent = '选择行业'; summary.textContent = '未选择'; }
                    else if (values.length <= 2) { const text = values.join('、'); btn.textContent = text; summary.textContent = `已选 ${values.length} 项：${text}`; }
                    else { btn.textContent = `已选 ${values.length} 项`; summary.textContent = `已选 ${values.length} 项`; }
                }
            }
        } catch (_) {}
    }

    getFieldId(key) {
        const fieldMap = {
            keywords: 'liepinKeywordsField',
            industry: 'liepinIndustryField',
            cityCode: 'liepinCityCodeField',
            experience: 'liepinExperienceComboBox',
            jobType: 'liepinJobTypeComboBox',
            salary: 'liepinSalaryComboBox',
            degree: 'liepinDegreeComboBox',
            scale: 'liepinScaleComboBox',
            companyNature: 'liepinCompanyNatureComboBox',
            recruiterActivity: 'liepinRecruiterActivityComboBox',
            blacklistFilter: 'liepinBlacklistFilterCheckBox',
            blacklistKeywords: 'liepinBlacklistKeywordsTextArea',
            enableAIJobMatch: 'liepinEnableAIJobMatchCheckBox'
        };
        return fieldMap[key] || `liepin${key.charAt(0).toUpperCase() + key.slice(1)}Field`;
    }

    async loadDataSequentially() {
        try {
            await this.loadLiepinDicts();
            await this.waitForDOMReady();
            await this.loadSavedConfig();
        } catch (error) {
            console.error('Liepin data loading failed:', error);
        }
    }

    async waitForDOMReady() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    async loadLiepinDicts() {
        try {
            const res = await fetch('/dicts/LIEPIN');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (!data || !Array.isArray(data.groups)) {
                console.warn('Liepin dict data structure incorrect:', data);
                return;
            }

            const groupMap = new Map();
            data.groups.forEach(g => groupMap.set(g.key, g.items || []));

            this.renderCitySelection(groupMap.get('cityList') || []);
            this.renderIndustrySelection(groupMap.get('industryList') || []);
            this.fillSelect('liepinExperienceComboBox', groupMap.get('experienceList'));
            this.fillSelect('liepinJobTypeComboBox', groupMap.get('jobTypeList'));
            this.fillSelect('liepinSalaryComboBox', groupMap.get('salaryList'));
            this.fillSelect('liepinDegreeComboBox', groupMap.get('degreeList'));
            this.fillSelect('liepinScaleComboBox', groupMap.get('scaleList'));
            this.fillSelect('liepinCompanyNatureComboBox', groupMap.get('companyNatureList'));
            this.fillSelect('liepinRecruiterActivityComboBox', groupMap.get('pubTimes'));

        } catch (e) {
            console.warn('Loading Liepin dicts failed:', e?.message || e);
            throw e;
        }
    }

    renderCitySelection(cityItems) {
        const citySelect = document.getElementById('liepinCityCodeField');
        const citySearch = document.getElementById('liepinCitySearchField');
        const cityListContainer = document.getElementById('liepinCityDropdownList');

        const renderCityOptions = (list) => {
            if (!citySelect) return;
            const selected = new Set(Array.from(citySelect.selectedOptions).map(o => o.value));
            citySelect.innerHTML = '';
            list.forEach(it => {
                const value = it.code ?? '';
                const opt = document.createElement('option');
                opt.value = value;
                opt.textContent = `${it.name ?? ''}${it.code ? ' (' + it.code + ')' : ''}`;
                if (selected.has(value)) opt.selected = true;
                citySelect.appendChild(opt);
            });

            if (cityListContainer) {
                cityListContainer.innerHTML = '';
                list.forEach(it => {
                    const value = it.code ?? '';
                    const label = `${it.name ?? ''}${it.code ? ' (' + it.code + ')' : ''}`;
                    const item = document.createElement('div');
                    item.className = 'form-check mb-1';
                    const id = `liepin_city_chk_${value}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
                    item.innerHTML = `<input class="form-check-input" type="checkbox" value="${value}" id="${id}" ${selected.has(value) ? 'checked' : ''}><label class="form-check-label small" for="${id}">${label}</label>`;
                    item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                        const option = Array.from(citySelect.options).find(o => o.value === e.target.value);
                        if (option) option.selected = e.target.checked;
                        this.updateCitySummary();
                    });
                    cityListContainer.appendChild(item);
                });
            }
            this.updateCitySummary();
        };

        renderCityOptions(cityItems);
        citySearch?.addEventListener('input', () => {
            const kw = citySearch.value.trim().toLowerCase();
            const filtered = kw ? cityItems.filter(it => String(it.name || '').toLowerCase().includes(kw) || String(it.code || '').toLowerCase().includes(kw)) : cityItems;
            renderCityOptions(filtered);
        });
    }

    renderIndustrySelection(industryItems) {
        console.log('猎聘: 渲染行业选择器（级联选择），行业数量:', industryItems.length);
        
        const industrySelect = document.getElementById('liepinIndustryField');
        const industrySearch = document.getElementById('liepinIndustrySearchField');
        const parentListContainer = document.getElementById('liepinIndustryParentList');
        const childListContainer = document.getElementById('liepinIndustryChildList');
        const industryDropdownBtn = document.getElementById('liepinIndustryDropdownBtn');
        const industrySummary = document.getElementById('liepinIndustrySelectionSummary');

        if (!industrySelect || !parentListContainer || !childListContainer) {
            console.error('猎聘: 行业选择器DOM元素未找到');
            return;
        }

        // 保存原始数据供搜索使用
        this.allIndustryItems = industryItems;

        // 区分父级和子级
        const parents = industryItems.filter(it => !it.parentCode);
        const children = industryItems.filter(it => it.parentCode);
        
        // 构建映射关系
        const childrenMap = new Map();
        parents.forEach(parent => {
            childrenMap.set(parent.code, children.filter(child => child.parentCode === parent.code));
        });
        
        console.log('猎聘: 一级行业数:', parents.length, '二级行业数:', children.length);

        // 当前选中的父级行业
        let currentParentCode = null;

        const updateIndustrySummary = () => {
            if (!industrySelect || !industryDropdownBtn || !industrySummary) return;
            const values = Array.from(industrySelect.selectedOptions).map(o => o.textContent);
            if (values.length === 0) { 
                industryDropdownBtn.textContent = '选择行业'; 
                industrySummary.textContent = '未选择'; 
            } else if (values.length <= 2) { 
                const text = values.join('、'); 
                industryDropdownBtn.textContent = text; 
                industrySummary.textContent = `已选 ${values.length} 项：${text}`; 
            } else { 
                industryDropdownBtn.textContent = `已选 ${values.length} 项`; 
                industrySummary.textContent = `已选 ${values.length} 项`; 
            }
        };

        // 将updateIndustrySummary方法绑定到实例，供其他方法调用
        this.updateIndustrySummary = updateIndustrySummary;

        // 渲染左侧一级行业列表
        const renderParentList = (parentList) => {
            parentListContainer.innerHTML = '';
            const selected = new Set(Array.from(industrySelect.selectedOptions).map(o => o.value));
            
            parentList.forEach(parent => {
                const parentCode = parent.code ?? '';
                const parentName = parent.name ?? String(parent.code ?? '');
                const childCount = (childrenMap.get(parentCode) || []).length;
                
                // 计算该父级下有多少子项被选中
                const childItems = childrenMap.get(parentCode) || [];
                const selectedCount = childItems.filter(child => selected.has(child.code ?? child.name ?? '')).length;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'px-2 py-1 mb-1 rounded';
                itemDiv.style.cursor = 'pointer';
                itemDiv.style.transition = 'background-color 0.15s';
                
                if (currentParentCode === parentCode) {
                    itemDiv.classList.add('bg-primary', 'text-white');
                }
                
                itemDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="small">${parentName}</span>
                        <span class="badge ${currentParentCode === parentCode ? 'bg-light text-primary' : 'bg-secondary'}">${selectedCount}/${childCount}</span>
                    </div>
                `;
                
                // 鼠标悬停效果
                itemDiv.addEventListener('mouseenter', () => {
                    if (currentParentCode !== parentCode) {
                        itemDiv.style.backgroundColor = '#f8f9fa';
                    }
                });
                itemDiv.addEventListener('mouseleave', () => {
                    if (currentParentCode !== parentCode) {
                        itemDiv.style.backgroundColor = '';
                    }
                });
                
                // 点击选择父级行业
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡，防止dropdown关闭
                    currentParentCode = parentCode;
                    renderParentList(parentList);
                    renderChildList(childrenMap.get(parentCode) || []);
                });
                
                parentListContainer.appendChild(itemDiv);
            });
        };

        // 渲染右侧二级行业列表
        const renderChildList = (childList) => {
            childListContainer.innerHTML = '';
            
            if (childList.length === 0) {
                childListContainer.innerHTML = '<div class="text-center text-muted small py-4">该分类下暂无子项</div>';
                return;
            }
            
            const selected = new Set(Array.from(industrySelect.selectedOptions).map(o => o.value));
            
            // 更新隐藏的select
            industrySelect.innerHTML = '';
            children.forEach(child => {
                const value = child.code ?? child.name ?? '';
                const label = child.name ?? String(child.code ?? '');
                const opt = document.createElement('option');
                opt.value = value;
                opt.textContent = label;
                if (selected.has(value)) opt.selected = true;
                industrySelect.appendChild(opt);
            });
            
            // 渲染复选框列表
            childList.forEach(child => {
                const value = child.code ?? child.name ?? '';
                const label = child.name ?? String(child.code ?? '');
                const checkDiv = document.createElement('div');
                checkDiv.className = 'form-check mb-1';
                const checkId = `liepin_industry_chk_${value}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
                checkDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${value}" id="${checkId}" ${selected.has(value) ? 'checked' : ''}>
                    <label class="form-check-label small" for="${checkId}">${label}</label>
                `;
                
                const checkbox = checkDiv.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡，防止dropdown关闭
                    
                    // 获取当前所有已选项
                    const currentSelected = Array.from(industrySelect.options).filter(o => o.selected);
                    const currentSelectedValues = currentSelected.map(o => o.value);
                    
                    if (checkbox.checked) {
                        // 逻辑1：限制最多勾选5个行业
                        if (currentSelectedValues.length >= 5) {
                            checkbox.checked = false;
                            this.showToast('最多只能选择5个行业', 'warning');
                            return;
                        }
                        
                        // 逻辑2：选择了"不限"后，将已勾选的行业撤销勾选
                        const isUnlimited = label === '不限' || value === '0' || value === '' || label.includes('不限');
                        if (isUnlimited) {
                            // 取消所有已选项
                            Array.from(industrySelect.options).forEach(opt => opt.selected = false);
                            currentSelectedValues.forEach(val => {
                                const chk = childListContainer.querySelector(`input[value="${val}"]`);
                                if (chk && chk !== checkbox) chk.checked = false;
                            });
                            // 只保留"不限"选项
                            const option = Array.from(industrySelect.options).find(o => o.value === value);
                            if (option) option.selected = true;
                            updateIndustrySummary();
                            renderParentList(parents);
                            return;
                        }
                        
                        // 逻辑3：只能选择同一大类的子行业，勾选了其他大类的子行业，原大类的行业勾选撤销
                        if (currentSelectedValues.length > 0) {
                            // 找到当前选中项的父级
                            const currentChildItem = children.find(c => (c.code ?? c.name ?? '') === value);
                            const newParentCode = currentChildItem?.parentCode;
                            
                            // 检查已选项的父级
                            const existingParentCodes = new Set();
                            currentSelectedValues.forEach(val => {
                                const childItem = children.find(c => (c.code ?? c.name ?? '') === val);
                                if (childItem?.parentCode) {
                                    existingParentCodes.add(childItem.parentCode);
                                }
                            });
                            
                            // 如果新选择的父级与已有父级不同，取消其他父级的所有选项
                            if (newParentCode && existingParentCodes.size > 0 && !existingParentCodes.has(newParentCode)) {
                                // 取消其他父级下的所有选项
                                Array.from(industrySelect.options).forEach(opt => {
                                    const childItem = children.find(c => (c.code ?? c.name ?? '') === opt.value);
                                    if (childItem?.parentCode !== newParentCode) {
                                        opt.selected = false;
                                        const chk = childListContainer.querySelector(`input[value="${opt.value}"]`);
                                        if (chk) chk.checked = false;
                                    }
                                });
                                this.showToast('只能选择同一大类的行业，已自动取消其他大类的选择', 'info');
                            }
                        }
                        
                        // 如果当前有"不限"被选中，取消"不限"
                        const unlimitedOptions = Array.from(industrySelect.options).filter(opt => {
                            const optLabel = opt.textContent || '';
                            return opt.selected && (optLabel === '不限' || optLabel.includes('不限') || opt.value === '0' || opt.value === '');
                        });
                        unlimitedOptions.forEach(opt => {
                            opt.selected = false;
                            const chk = childListContainer.querySelector(`input[value="${opt.value}"]`);
                            if (chk) chk.checked = false;
                        });
                    }
                    
                    const option = Array.from(industrySelect.options).find(o => o.value === value);
                    if (option) option.selected = checkbox.checked;
                    updateIndustrySummary();
                    // 更新父级列表中的计数
                    renderParentList(parents);
                });
                
                childListContainer.appendChild(checkDiv);
            });
        };

        // 初始渲染
        renderParentList(parents);
        
        // 如果有已选项，自动展开对应的父级
        const selectedValues = Array.from(industrySelect.selectedOptions).map(o => o.value);
        if (selectedValues.length > 0) {
            // 找到第一个已选项的父级
            const firstSelected = children.find(c => selectedValues.includes(c.code ?? c.name ?? ''));
            if (firstSelected && firstSelected.parentCode) {
                currentParentCode = firstSelected.parentCode;
                renderParentList(parents);
                renderChildList(childrenMap.get(currentParentCode) || []);
            }
        }

        // 搜索功能
        if (industrySearch) {
            industrySearch.addEventListener('input', () => {
                const kw = (industrySearch.value || '').trim().toLowerCase();
                if (!kw) {
                    // 恢复原始显示
                    renderParentList(parents);
                    if (currentParentCode) {
                        renderChildList(childrenMap.get(currentParentCode) || []);
                    } else {
                        childListContainer.innerHTML = '<div class="text-center text-muted small py-4"><i class="bi bi-arrow-left me-1"></i>请先选择左侧分类</div>';
                    }
                    return;
                }
                
                // 搜索匹配的子行业
                const matchedChildren = children.filter(child => {
                    const childName = String(child.name || '').toLowerCase();
                    const childCode = String(child.code || '').toLowerCase();
                    return childName.includes(kw) || childCode.includes(kw);
                });
                
                // 找到这些子行业对应的父级
                const matchedParentCodes = new Set(matchedChildren.map(c => c.parentCode).filter(Boolean));
                const matchedParents = parents.filter(p => matchedParentCodes.has(p.code));
                
                if (matchedParents.length === 0) {
                    parentListContainer.innerHTML = '<div class="text-center text-muted small py-4">无匹配结果</div>';
                    childListContainer.innerHTML = '<div class="text-center text-muted small py-4">无匹配结果</div>';
                    return;
                }
                
                // 渲染搜索结果
                renderParentList(matchedParents);
                
                // 自动展开第一个匹配的父级
                if (matchedParents.length > 0) {
                    currentParentCode = matchedParents[0].code;
                    renderParentList(matchedParents);
                    const filteredChildren = matchedChildren.filter(c => c.parentCode === currentParentCode);
                    renderChildList(filteredChildren);
                }
            });
        }
    }

    fillSelect(selectId, items) {
        if (!Array.isArray(items) || items.length === 0) return;
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const first = sel.querySelector('option');
        sel.innerHTML = '';
        if (first && first.value === '') sel.appendChild(first);
        items.forEach(it => {
            const opt = document.createElement('option');
            opt.value = it.code ?? it.name ?? '';
            opt.textContent = it.name ?? String(it.code ?? '');
            sel.appendChild(opt);
        });
    }

    updateCitySummary() {
        const citySelect = document.getElementById('liepinCityCodeField');
        const cityDropdownBtn = document.getElementById('liepinCityDropdownBtn');
        const citySummary = document.getElementById('liepinCitySelectionSummary');
        if (!citySelect || !cityDropdownBtn || !citySummary) return;

        const values = Array.from(citySelect.selectedOptions).map(o => o.textContent);
        if (values.length === 0) {
            cityDropdownBtn.textContent = '选择城市';
            citySummary.textContent = '未选择';
        } else if (values.length <= 2) {
            const text = values.join('、');
            cityDropdownBtn.textContent = text;
            citySummary.textContent = `已选 ${values.length} 项：${text}`;
        } else {
            cityDropdownBtn.textContent = `已选 ${values.length} 项`;
            citySummary.textContent = `已选 ${values.length} 项`;
        }
    }

    handleSaveConfig() {
        this.saveConfig();
        this.showToast('猎聘配置已保存');
    }

    handleBackupData() {
        const backupBtn = document.getElementById('liepinBackupDataBtn');
        if (backupBtn) {
            backupBtn.disabled = true;
            backupBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>备份中...';
        }
        fetch('/api/backup/export', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                this.showToast(data.success ? '数据库备份成功' : '数据库备份失败: ' + data.message, data.success ? 'success' : 'danger');
            })
            .catch(error => this.showToast('数据库备份失败: ' + error.message, 'danger'))
            .finally(() => {
                if (backupBtn) {
                    backupBtn.disabled = false;
                    backupBtn.innerHTML = '<i class="bi bi-database me-2"></i>数据库备份';
                }
            });
    }

    async handleLogin() {
        try {
            const response = await fetch('/api/liepin/task/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.getCurrentConfig())
            });
            const result = await response.json();
            if (result.success) {
                this.taskStates.loginTaskId = result.taskId;
                this.showToast('猎聘登录任务已提交');
            } else {
                this.showToast(result.message || '登录失败', 'danger');
            }
        } catch (error) {
            this.showToast('登录接口调用失败: ' + error.message, 'danger');
        }
    }

    // 手动确认登录 - 由app.js统一处理UI状态
    handleManualLogin() {
        // 标记任务ID，供其他逻辑使用
        this.taskStates.loginTaskId = 'manual_login_' + Date.now();
        // UI状态更新由app.js的TaskStatusUpdater统一处理
        this.showToast('猎聘已标记为登录状态');
    }

    async handleCollect() {
        try {
            const response = await fetch('/api/liepin/task/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.getCurrentConfig())
            });
            const result = await response.json();
            if (result.success) {
                this.taskStates.collectTaskId = result.taskId;
                this.showToast('猎聘采集任务已提交');
            } else {
                this.showToast(result.message || '采集失败', 'danger');
            }
        } catch (error) {
            this.showToast('采集接口调用失败: ' + error.message, 'danger');
        }
    }

    async handleFilter() {
        try {
            const request = { collectTaskId: this.taskStates.collectTaskId, config: this.getCurrentConfig() };
            const response = await fetch('/api/liepin/task/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });
            const result = await response.json();
            if (result.success) {
                this.taskStates.filterTaskId = result.taskId;
                this.showToast('猎聘过滤任务已提交');
            } else {
                this.showToast(result.message || '过滤失败', 'danger');
            }
        } catch (error) {
            this.showToast('过滤接口调用失败: ' + error.message, 'danger');
        }
    }

    handleApply() {
        this.showConfirmModal('投递确认', '是否执行实际投递？', () => this.executeApply(true), () => this.executeApply(false));
    }

    async executeApply(enableActualDelivery) {
        try {
            const request = { filterTaskId: this.taskStates.filterTaskId, config: this.getCurrentConfig(), enableActualDelivery };
            const response = await fetch('/api/liepin/task/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });
            const result = await response.json();
            if (result.success) {
                this.taskStates.applyTaskId = result.taskId;
                const deliveryType = enableActualDelivery ? '实际投递' : '模拟投递';
                this.showToast(`猎聘${deliveryType}任务已提交`);
            } else {
                this.showToast(result.message || '投递失败', 'danger');
            }
        } catch (error) {
            this.showToast('投递接口调用失败: ' + error.message, 'danger');
        }
    }

    getCurrentConfig() {
        const getMultiSelectValues = (selectId) => Array.from(document.getElementById(selectId)?.selectedOptions || []).map(o => o.value).filter(Boolean).join(',');
        return {
            keywords: document.getElementById('liepinKeywordsField')?.value || '',
            cityCode: getMultiSelectValues('liepinCityCodeField'),
            experience: document.getElementById('liepinExperienceComboBox')?.value || '',
            jobType: document.getElementById('liepinJobTypeComboBox')?.value || '',
            salary: document.getElementById('liepinSalaryComboBox')?.value || '',
            degree: document.getElementById('liepinDegreeComboBox')?.value || '',
            scale: document.getElementById('liepinScaleComboBox')?.value || '',
            companyNature: document.getElementById('liepinCompanyNatureComboBox')?.value || '',
            recruiterActivity: document.getElementById('liepinRecruiterActivityComboBox')?.value || '',
            blacklistFilter: document.getElementById('liepinBlacklistFilterCheckBox')?.checked || false,
            blacklistKeywords: document.getElementById('liepinBlacklistKeywordsTextArea')?.value || '',
            enableAIJobMatch: document.getElementById('liepinEnableAIJobMatchCheckBox')?.checked || false
        };
    }

    resetTaskFlow() {
        this.showConfirmModal('重置确认', '确定要重置任务流程吗？', () => {
            // 只重置任务状态数据，UI状态由app.js的TaskStatusUpdater处理
            this.taskStates = { loginTaskId: null, collectTaskId: null, filterTaskId: null, applyTaskId: null };
            this.showToast('任务流程已重置', 'info');
        });
    }

    showToast(message, variant = 'success') {
        const toastEl = document.getElementById('globalToast');
        const bodyEl = document.getElementById('globalToastBody');
        if (!toastEl || !bodyEl) return;
        bodyEl.textContent = message;
        toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }

    showConfirmModal(title, message, onConfirm, onCancel) {
        const modalEl = document.getElementById('confirmModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        document.getElementById('confirmModalLabel').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;
        const okBtn = document.getElementById('confirmModalOk');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener('click', () => {
            modal.hide();
            onConfirm?.();
        }, { once: true });
        modalEl.addEventListener('hidden.bs.modal', () => onCancel?.(), { once: true });
        modal.show();
    }

    showAlertModal(title, message) {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('alertModal'));
        document.getElementById('alertModalLabel').textContent = title;
        document.getElementById('alertModalBody').textContent = message;
        modal.show();
    }
}

window.LiepinConfigForm = LiepinConfigForm;
