package getjobs.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import getjobs.repository.UserProfileRepository;
import getjobs.repository.entity.UserProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 公共配置控制器
 * 用于管理系统级别的公共配置
 */
@RestController
@RequestMapping("/api/common/config")
@RequiredArgsConstructor
public class CommonConfigController {

    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;

    /**
     * 新增或更新公共配置
     * @param configData 配置数据（键值对形式）
     * @return 保存结果
     */
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveCommonConfig(@RequestBody Map<String, Object> configData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 验证配置数据
            if (configData == null || configData.isEmpty()) {
                response.put("success", false);
                response.put("message", "配置数据不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            // 获取或创建 UserProfile（假设系统中只有一个配置记录）
            UserProfile userProfile = userProfileRepository.findAll().stream()
                    .findFirst()
                    .orElse(new UserProfile());

            // 从 configData 中提取并更新字段
            if (configData.containsKey("jobBlacklistKeywords")) {
                userProfile.setPositionBlacklist(convertToList(configData.get("jobBlacklistKeywords")));
            }
            if (configData.containsKey("companyBlacklistKeywords")) {
                userProfile.setCompanyBlacklist(convertToList(configData.get("companyBlacklistKeywords")));
            }

            // 保存到数据库
            UserProfile saved = userProfileRepository.save(userProfile);
            
            response.put("success", true);
            response.put("message", "公共配置保存成功");
            response.put("timestamp", LocalDateTime.now());
            response.put("profileId", saved.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "保存配置失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 转换为字符串列表
     * 支持以下格式：
     * 1. List 类型直接返回
     * 2. String 类型按逗号分隔
     * 3. 其他类型尝试用 ObjectMapper 转换
     */
    @SuppressWarnings("unchecked")
    private List<String> convertToList(Object value) {
        if (value == null) return null;
        
        // 如果已经是 List，直接返回
        if (value instanceof List) {
            return (List<String>) value;
        }
        
        // 如果是字符串，按逗号分隔
        if (value instanceof String) {
            String strValue = (String) value;
            if (strValue.trim().isEmpty()) {
                return List.of();
            }
            return Arrays.stream(strValue.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }
        
        // 其他类型尝试用 ObjectMapper 转换
        return objectMapper.convertValue(value, List.class);
    }
}

