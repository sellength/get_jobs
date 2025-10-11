package getjobs.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import getjobs.repository.UserProfileRepository;
import getjobs.repository.entity.UserProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
     */
    @SuppressWarnings("unchecked")
    private List<String> convertToList(Object value) {
        if (value == null) return null;
        if (value instanceof List) return (List<String>) value;
        return objectMapper.convertValue(value, List.class);
    }
}

