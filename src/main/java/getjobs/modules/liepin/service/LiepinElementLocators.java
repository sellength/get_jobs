package getjobs.modules.liepin.service;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import lombok.extern.slf4j.Slf4j;

/**
 * 猎聘网站元素定位器
 * 用于定位猎聘网站上的各种元素
 *
 * @author loks666
 * 项目链接: <a href="https://github.com/loks666/get_jobs">https://github.com/loks666/get_jobs</a>
 */
@Slf4j
public class LiepinElementLocators {

    /** 未登录状态的菜单列表 (ul 标签)，使用 class 选择器 */
    public static final String NOT_LOGIN_MENU = "ul.header-quick-menu-not-login";

    /** 已登录状态的菜单列表 (ul 标签)，使用 class 选择器 */
    public static final String LOGGED_IN_MENU = "ul.header-quick-menu-login";

    /**
     * 检查是否需要登录
     * 通过检查不同登录状态下唯一的 ul 列表元素的 class 来判断
     *
     * @param page Playwright页面对象
     * @return true表示需要登录，false表示已登录
     */
    public static boolean isLoginRequired(Page page) {
        try {
            // 等待页面加载完成，确保所有元素都已加载
            log.debug("等待页面加载完成...");
            page.waitForLoadState();
            page.waitForTimeout(3000); // 等待DOM稳定

            log.debug("检查猎聘登录状态...");

            // 检查是否存在未登录状态的菜单
            Locator notLoginMenu = page.locator(NOT_LOGIN_MENU);
            if (notLoginMenu.isVisible()) {
                log.info("找到'header-quick-menu-not-login' class，判定为未登录状态");
                return true;
            }

            // 检查是否存在已登录状态的菜单
            Locator loggedInMenu = page.locator(LOGGED_IN_MENU);
            if (loggedInMenu.isVisible()) {
                log.info("找到'header-quick-menu-login' class，判定为已登录状态");
                return false;
            }

            // 如果以上都没有立即找到，可能页面正在加载或结构有变，增加等待后重试
            log.warn("无法立即判断登录状态，将等待5秒后重试...");
            page.waitForTimeout(5000);

            if (page.locator(NOT_LOGIN_MENU).isVisible()) {
                log.info("重试后找到'header-quick-menu-not-login' class，判定为未登录状态");
                return true;
            }

            if (page.locator(LOGGED_IN_MENU).isVisible()) {
                log.info("重试后找到'header-quick-menu-login' class，判定为已登录状态");
                return false;
            }

            log.error("无法明确判断猎聘的登录状态，默认需要登录。请检查页面元素定位器是否需要更新。");
            return true; // 无法判断时，为安全起见，默认需要登录

        } catch (Exception e) {
            log.error("检查猎聘登录状态时发生异常", e);
            return true; // 出现异常时，为安全起见，默认需要登录
        }
    }
}
