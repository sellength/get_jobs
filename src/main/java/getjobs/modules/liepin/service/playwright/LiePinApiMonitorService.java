package getjobs.modules.liepin.service.playwright;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.Response;
import getjobs.modules.liepin.dto.LiePinApiResponse;
import getjobs.repository.JobRepository;
import getjobs.repository.entity.JobEntity;
import getjobs.utils.LiePinDataConverter;
import getjobs.utils.PlaywrightUtil;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiePinApiMonitorService {

    private final JobRepository jobRepository;
    private final LiePinDataConverter dataConverter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        setupLiePinApiMonitor();
    }

    public void setupLiePinApiMonitor() {
        try {
            Page page = PlaywrightUtil.getPageObject();
            setupResponseMonitor(page);
            log.info("猎聘API监控服务初始化完成");
        } catch (Exception e) {
            log.error("猎聘API监控服务初始化失败: {}", e.getMessage(), e);
        }
    }

    private void setupResponseMonitor(Page page) {
        page.onResponse(response -> {
            String url = response.url();
            if (url.contains("/api/com.liepin.searchfront4c.pc-search-job")) {
                handleLiePinSearchResponse(response);
            }
        });
    }

    private void handleLiePinSearchResponse(Response response) {
        log.info("=== 猎聘职位搜索响应拦截 ===");
        log.info("响应状态: {}", response.status());
        log.info("响应URL: {}", response.url());

        try {
            String body = response.text();
            log.info("响应体长度: {} 字符", body.length());
            parseAndSaveLiePinData(body, "猎聘职位搜索");
        } catch (PlaywrightException e) {
            log.error("读取猎聘响应体失败: {}", e.getMessage());
        }
        log.info("==========================");
    }

    @Transactional
    public void parseAndSaveLiePinData(String body, String source) {
        try {
            LiePinApiResponse response = objectMapper.readValue(body, LiePinApiResponse.class);

            if (response.getFlag() != 1 || response.getData() == null || response.getData().getData() == null || response.getData().getData().getJobCardList() == null) {
                log.warn("猎聘API响应错误或没有职位数据");
                return;
            }

            List<LiePinApiResponse.JobCard> jobCards = response.getData().getData().getJobCardList();
            log.info("从{}获取到 {} 个职位数据", source, jobCards.size());

            List<LiePinApiResponse.JobCard> validJobCards = jobCards.stream()
                    .filter(dataConverter::isValidJobData)
                    .toList();

            if (validJobCards.isEmpty()) {
                log.warn("没有有效的职位数据，来源: {}", source);
                return;
            }

            log.info("过滤后有效职位数据: {} 个", validJobCards.size());

            List<JobEntity> jobEntities = validJobCards.stream()
                    .map(dataConverter::convertToJobEntity)
                    .filter(Objects::nonNull)
                    .toList();

            if (!jobEntities.isEmpty()) {
                List<JobEntity> newJobs = jobEntities.stream()
                        .filter(entity -> !isJobExists(entity.getEncryptJobId()))
                        .collect(Collectors.toList());

                if (!newJobs.isEmpty()) {
                    jobRepository.saveAll(newJobs);
                    log.info("成功保存 {} 个新职位到数据库，来源: {}", newJobs.size(), source);
                    newJobs.forEach(job -> log.info("保存职位: {} - {} - {}",
                            job.getJobTitle(), job.getCompanyName(), job.getSalaryDesc()));
                } else {
                    log.info("所有职位都已存在，跳过保存，来源: {}", source);
                }
            } else {
                log.warn("没有有效的职位数据可以保存，来源: {}", source);
            }

        } catch (Exception e) {
            log.error("解析并保存猎聘职位数据失败，来源: {}", source, e);
        }
    }

    private boolean isJobExists(String encryptJobId) {
        if (encryptJobId == null || encryptJobId.trim().isEmpty()) {
            return false;
        }
        try {
            return jobRepository.existsByEncryptJobId(encryptJobId);
        } catch (Exception e) {
            log.warn("检查职位是否存在时发生错误: {}", e.getMessage());
            return false;
        }
    }
}
