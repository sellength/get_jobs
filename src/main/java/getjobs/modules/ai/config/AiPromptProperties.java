package getjobs.modules.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 提示词属性配置类
 * <p>
 * 从 application.yml 文件中加载以 "getjobs.ai.prompts" 为前缀的配置项。
 * 这个类用于定义和管理不同场景下的 AI 提示词模板。
 * </p>
 */
@Component
@ConfigurationProperties(prefix = "getjobs.ai.prompts")
public class AiPromptProperties {

    /**
     * 存储与“职位”相关的提示词定义。
     * <p>
     * Map 的键是提示词的唯一标识符（例如 "job-match"），值是 {@link PromptDefinition} 对象，
     * 包含了提示词的详细信息，如描述、占位符和模板内容。
     * </p>
     */
    private Map<String, PromptDefinition> job = new HashMap<>();

    public Map<String, PromptDefinition> getJob() {
        return job;
    }

    public void setJob(Map<String, PromptDefinition> job) {
        this.job = job;
    }

    /**
     * 表示单个提示词的定义。
     * <p>
     * 包含提示词的描述、模板中使用的占位符列表以及模板本身。
     * </p>
     */
    public static class PromptDefinition {

        /**
         * 提示词的描述信息，用于说明该提示词的用途。
         */
        private String description;

        /**
         * 提示词模板中使用的占位符列表。
         * <p>
         * 例如：["resume", "job_description"]
         * </p>
         */
        private List<String> placeholders = new ArrayList<>();

        /**
         * 提示词的模板内容。
         * <p>
         * 模板中可以包含由 "{}" 包裹的占位符，这些占位符将在运行时被实际值替换。
         * 例如："请根据以下简历 {resume} 和职位描述 {job_description}，分析匹配度。"
         * </p>
         */
        private String template;

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public List<String> getPlaceholders() {
            return placeholders;
        }

        public void setPlaceholders(List<String> placeholders) {
            this.placeholders = placeholders;
        }

        public String getTemplate() {
            return template;
        }

        public void setTemplate(String template) {
            this.template = template;
        }
    }
}
