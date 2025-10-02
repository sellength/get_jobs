package getjobs.config.ai;

import getjobs.modules.ai.common.enums.AiPlatform;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.StreamingChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * GPT配置类
 */
@Configuration
public class DeepseekGptConfig {

    @Value("${spring.ai.deepseek.api-key}")
    private String apiKey;

    @Value("${spring.ai.deepseek.base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${spring.ai.deepseek.chat.options.model}")
    private String model;

    @Value("${spring.ai.deepseek.chat.options.temperature:0.7}")
    private Double temperature;

    @Value("${spring.ai.deepseek.chat.options.max-tokens:2000}")
    private Integer maxTokens;

    /**
     * 配置OpenAiApi
     */
    @Bean
    public OpenAiApi deepseekAiApi() {
        return OpenAiApi.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * 配置ChatModel
     */
    @Bean(AiPlatform.DEEPSEEK_BEAN_NAME)
    public ChatModel deepseekChatModel(@Qualifier("deepseekAiApi") OpenAiApi deepseekAiApi) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();

        return new OpenAiChatModel(deepseekAiApi, options);
    }

    /**
     * 配置StreamingChatModel
     */
    @Bean("deepseekStreamingChatModel")
    public StreamingChatModel deepseekStreamingChatModel(@Qualifier("deepseekAiApi") OpenAiApi deepseekAiApi) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();

        return new OpenAiChatModel(deepseekAiApi, options);
    }
}
