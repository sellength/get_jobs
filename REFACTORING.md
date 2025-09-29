# Refactoring
所有代码结构变更都将记录在此文件中。

## [2025-09-29] 将 PlaywrightUtil 重构为 PlaywrightService
### 背景
- `getjobs.utils.PlaywrightUtil` 工具类中逐渐包含了复杂的业务逻辑
- 难以进行单元测试，也不符合依赖注入与扩展的要求

### 变更内容
- 创建 `getjobs.common.service.PlaywrightService`，替代 `getjobs.utils.PlaywrightUtil`
- 支持按平台构建独立 Page 与 Context 
  - 通过平台参数动态创建 BrowserContext 和 Page，实现多平台会话隔离、Cookies 独立管理和个性化配置。
  - 保证各平台投递流程的稳定性，避免静态 util 时代多平台共享单一上下文带来的冲突和数据污染。
- 原有静态方法改为实例方法，并注入到需要的模块
- 迁移调用点，并删除过时的工具类

### 影响
- 无数据库结构变化
- 原有外部接口不受影响