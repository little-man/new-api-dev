-- ============================================================================
-- new_api 表注释 / 字段注释补全脚本（38 张表 / 472 个字段）
-- 说明：
--   1) MySQL 不支持 COMMENT COLUMN，字段备注必须走 MODIFY COLUMN，
--      因此每条 MODIFY 都写了完整列定义（类型/字符集/可空/默认值/AUTO_INCREMENT），
--      与线上 SHOW CREATE TABLE 一致，不会改变列类型。
--   2) 每张表只发一条 ALTER，多个 MODIFY 用逗号串联，避免多次重建表。
--   3) ⚠ DDL 会重建表并持有元数据锁，务必在低峰执行并先备份。
--   4) 建议单表执行，逐表观察；MySQL 8.0 支持 online DDL，但 longtext/json 列仍可能拷贝表。
-- ============================================================================
SET NAMES utf8mb4;
USE `new_api`;

-- ============================================================================
-- 1. abilities —— 渠道能力表
-- ============================================================================
ALTER TABLE `abilities` COMMENT = '渠道能力表：记录哪个分组+模型可由哪些渠道提供，决定路由';
ALTER TABLE `abilities`
  MODIFY COLUMN `group` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `model` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型名称（对外请求的模型名）',
  MODIFY COLUMN `channel_id` bigint NOT NULL COMMENT '渠道 ID，关联 channels.id',
  MODIFY COLUMN `enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用：1 启用 0 停用',
  MODIFY COLUMN `priority` bigint DEFAULT 0 COMMENT '优先级，值越大越优先被选中',
  MODIFY COLUMN `weight` bigint unsigned DEFAULT 0 COMMENT '同优先级内的权重，用于加权随机',
  MODIFY COLUMN `tag` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道标签，用于按标签路由';

-- ============================================================================
-- 2. audit_logs —— 审计日志表
-- ============================================================================
ALTER TABLE `audit_logs` COMMENT = '审计日志表：后台敏感操作留痕';
ALTER TABLE `audit_logs`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `event_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '事件唯一 ID，用于幂等与去重',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '操作者用户 ID',
  MODIFY COLUMN `username` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作者用户名（冗余存储，便于追查历史）',
  MODIFY COLUMN `actor_role` bigint DEFAULT NULL COMMENT '操作者角色值，对应 users.role',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `category` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '事件大类，如 auth / channel / user',
  MODIFY COLUMN `action` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '具体动作，如 create / update / delete',
  MODIFY COLUMN `token_ref` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联令牌标识（脱敏的 key 提示）',
  MODIFY COLUMN `auth_method` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '认证方式：session / token / access_token',
  MODIFY COLUMN `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户端 IP',
  MODIFY COLUMN `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户端 User-Agent',
  MODIFY COLUMN `method` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HTTP 方法',
  MODIFY COLUMN `route` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求路由模板',
  MODIFY COLUMN `status` bigint DEFAULT NULL COMMENT 'HTTP 状态码',
  MODIFY COLUMN `success` tinyint(1) DEFAULT NULL COMMENT '是否成功：1 成功 0 失败',
  MODIFY COLUMN `request_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求追踪 ID',
  MODIFY COLUMN `content` text COLLATE utf8mb4_unicode_ci COMMENT '事件详情正文（JSON 字符串）',
  MODIFY COLUMN `other` json DEFAULT NULL COMMENT '扩展信息（JSON）';

-- ============================================================================
-- 3. auth_flows —— 认证流程临时态表
-- ============================================================================
ALTER TABLE `auth_flows` COMMENT = '认证流程临时态表：OAuth 登录/绑定的中间态，一次性令牌';
ALTER TABLE `auth_flows`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '流程一次性令牌的 SHA-256 哈希',
  MODIFY COLUMN `purpose` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '流程用途，如 login / bind',
  MODIFY COLUMN `provider` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OAuth 提供商标识，如 github / oidc',
  MODIFY COLUMN `intent` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '意图：login 登录 / bind 绑定',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '关联用户 ID（登录流程时为空）',
  MODIFY COLUMN `session_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联会话 ID',
  MODIFY COLUMN `payload` text COLLATE utf8mb4_unicode_ci COMMENT '流程中暂存的数据（JSON 字符串）',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）',
  MODIFY COLUMN `expires_at` datetime(3) NOT NULL COMMENT '过期时间（毫秒精度）',
  MODIFY COLUMN `consumed_at` datetime(3) DEFAULT NULL COMMENT '被消费的时间，NULL 表示尚未使用';

-- ============================================================================
-- 4. authz_roles —— 角色定义表
-- ============================================================================
ALTER TABLE `authz_roles` COMMENT = '角色定义表：RBAC 角色，配合 casbin_rule 使用';
ALTER TABLE `authz_roles`
  MODIFY COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色标识（唯一），如 admin / user',
  MODIFY COLUMN `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色显示名称',
  MODIFY COLUMN `description` text COLLATE utf8mb4_unicode_ci COMMENT '角色描述',
  MODIFY COLUMN `built_in` tinyint(1) DEFAULT NULL COMMENT '是否内置角色：1 是 0 否（内置不可删除）',
  MODIFY COLUMN `enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用：1 启用 0 停用',
  MODIFY COLUMN `sort` bigint DEFAULT NULL COMMENT '排序值，越小越靠前',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 5. casbin_rule —— Casbin 策略规则表
-- ============================================================================
ALTER TABLE `casbin_rule` COMMENT = 'Casbin 策略规则表：p 为权限策略，g 为角色继承';
ALTER TABLE `casbin_rule`
  MODIFY COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `ptype` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略类型：p 策略 / g 角色继承',
  MODIFY COLUMN `v0` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 0（通常是角色 key）',
  MODIFY COLUMN `v1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 1（通常是资源或路由）',
  MODIFY COLUMN `v2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 2（通常是动作，如 GET/POST）',
  MODIFY COLUMN `v3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 3（预留）',
  MODIFY COLUMN `v4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 4（预留）',
  MODIFY COLUMN `v5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '策略参数 5（预留）';

-- ============================================================================
-- 6. channels —— 上游渠道表
-- ============================================================================
ALTER TABLE `channels` COMMENT = '上游渠道表：一条记录 = 一个上游供应商接入配置';
ALTER TABLE `channels`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `type` bigint DEFAULT 0 COMMENT '渠道类型枚举值（对应 constant.ChannelType）',
  MODIFY COLUMN `key` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上游密钥，多 key 模式以换行分隔',
  MODIFY COLUMN `open_ai_organization` longtext COLLATE utf8mb4_unicode_ci COMMENT 'OpenAI Organization ID',
  MODIFY COLUMN `test_model` longtext COLLATE utf8mb4_unicode_ci COMMENT '渠道连通性测试使用的模型名',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '状态：1 启用 2 手动禁用 3 自动禁用',
  MODIFY COLUMN `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道名称',
  MODIFY COLUMN `weight` bigint unsigned DEFAULT 0 COMMENT '权重，同优先级内加权随机',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `test_time` bigint DEFAULT NULL COMMENT '最近一次测试时间（Unix 秒）',
  MODIFY COLUMN `response_time` bigint DEFAULT NULL COMMENT '最近一次响应耗时（毫秒）',
  MODIFY COLUMN `base_url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '上游 API 基础地址',
  MODIFY COLUMN `other` longtext COLLATE utf8mb4_unicode_ci COMMENT '渠道类型相关的额外配置（JSON 字符串）',
  MODIFY COLUMN `balance` double DEFAULT NULL COMMENT '上游账户余额',
  MODIFY COLUMN `balance_updated_time` bigint DEFAULT NULL COMMENT '余额更新时间（Unix 秒）',
  MODIFY COLUMN `models` longtext COLLATE utf8mb4_unicode_ci COMMENT '支持的模型列表（逗号分隔）',
  MODIFY COLUMN `group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT '所属分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `used_quota` bigint DEFAULT 0 COMMENT '累计已用额度',
  MODIFY COLUMN `model_mapping` text COLLATE utf8mb4_unicode_ci COMMENT '模型名映射规则（JSON 字符串）',
  MODIFY COLUMN `status_code_mapping` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '上游状态码映射规则（JSON 字符串）',
  MODIFY COLUMN `priority` bigint DEFAULT 0 COMMENT '优先级，值越大越优先被选中',
  MODIFY COLUMN `auto_ban` bigint DEFAULT 1 COMMENT '是否允许自动禁用：1 允许 0 禁止',
  MODIFY COLUMN `other_info` longtext COLLATE utf8mb4_unicode_ci COMMENT '其他信息（JSON 字符串）',
  MODIFY COLUMN `tag` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道标签，用于按标签路由',
  MODIFY COLUMN `setting` text COLLATE utf8mb4_unicode_ci COMMENT '渠道级设置（JSON 字符串）',
  MODIFY COLUMN `param_override` text COLLATE utf8mb4_unicode_ci COMMENT '请求参数覆盖规则（JSON 字符串）',
  MODIFY COLUMN `header_override` text COLLATE utf8mb4_unicode_ci COMMENT '请求头覆盖规则（JSON 字符串）',
  MODIFY COLUMN `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  MODIFY COLUMN `channel_info` json DEFAULT NULL COMMENT '渠道探测信息（JSON）',
  MODIFY COLUMN `settings` longtext COLLATE utf8mb4_unicode_ci COMMENT '渠道设置（新版，JSON 字符串）';

-- ============================================================================
-- 7. checkins —— 用户签到表
-- ============================================================================
ALTER TABLE `checkins` COMMENT = '用户签到表：每日签到领取额度';
ALTER TABLE `checkins`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '用户 ID',
  MODIFY COLUMN `checkin_date` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '签到日期，格式 YYYY-MM-DD',
  MODIFY COLUMN `quota_awarded` bigint NOT NULL COMMENT '本次签到奖励额度',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）';

-- ============================================================================
-- 8. custom_oauth_providers —— 自定义 OAuth 提供商表
-- ============================================================================
ALTER TABLE `custom_oauth_providers` COMMENT = '自定义 OAuth 提供商表：管理员可自助接入第三方登录';
ALTER TABLE `custom_oauth_providers`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提供商显示名称',
  MODIFY COLUMN `slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提供商唯一标识（用于回调 URL 路径）',
  MODIFY COLUMN `icon` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '图标（URL 或内置图标名）',
  MODIFY COLUMN `enabled` tinyint(1) DEFAULT 0 COMMENT '是否启用：1 启用 0 停用',
  MODIFY COLUMN `client_id` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OAuth Client ID',
  MODIFY COLUMN `client_secret` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OAuth Client Secret',
  MODIFY COLUMN `authorization_endpoint` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '授权端点 URL',
  MODIFY COLUMN `token_endpoint` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '换取 access_token 端点 URL',
  MODIFY COLUMN `user_info_endpoint` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '获取用户信息端点 URL',
  MODIFY COLUMN `scopes` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT 'openid profile email' COMMENT '申请的 scope，空格分隔',
  MODIFY COLUMN `user_id_field` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT 'sub' COMMENT '用户信息中作为唯一 ID 的字段名',
  MODIFY COLUMN `username_field` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT 'preferred_username' COMMENT '用户信息中作为用户名的字段名',
  MODIFY COLUMN `display_name_field` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT 'name' COMMENT '用户信息中作为显示名的字段名',
  MODIFY COLUMN `email_field` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT 'email' COMMENT '用户信息中作为邮箱的字段名',
  MODIFY COLUMN `well_known` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OIDC well-known 配置地址',
  MODIFY COLUMN `auth_style` bigint DEFAULT 0 COMMENT '认证方式：0 client_secret_basic / 1 client_secret_post',
  MODIFY COLUMN `access_policy` text COLLATE utf8mb4_unicode_ci COMMENT '准入策略（JSON 字符串）',
  MODIFY COLUMN `access_denied_message` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '准入被拒时的提示文案',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）',
  MODIFY COLUMN `updated_at` datetime(3) DEFAULT NULL COMMENT '更新时间（毫秒精度）';

-- ============================================================================
-- 9. external_identity_claims —— 外部身份映射表
-- ============================================================================
ALTER TABLE `external_identity_claims` COMMENT = '外部身份映射表：provider + subject 唯一确定一个本系统用户';
ALTER TABLE `external_identity_claims`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '外部身份提供商标识',
  MODIFY COLUMN `subject` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提供商侧用户唯一标识（sub）',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '本系统用户 ID',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）';

-- ============================================================================
-- 10. login_encryption_keys —— 登录加密私钥表
-- ============================================================================
ALTER TABLE `login_encryption_keys` COMMENT = '登录加密私钥表：按 slot 轮换的前端密码加密密钥';
ALTER TABLE `login_encryption_keys`
  MODIFY COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `slot` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密钥槽位标识（唯一）',
  MODIFY COLUMN `private_key_pem` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '私钥 PEM 内容';

-- ============================================================================
-- 11. logs —— 调用日志表
-- ============================================================================
ALTER TABLE `logs` COMMENT = '调用日志表：每次请求的额度消耗、token 用量主日志';
ALTER TABLE `logs`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `type` bigint DEFAULT NULL COMMENT '日志类型：0 未知 1 充值 2 消费 3 管理 4 系统 5 错误 6 退款 7 登录',
  MODIFY COLUMN `content` longtext COLLATE utf8mb4_unicode_ci COMMENT '日志内容（展示用文案或错误详情）',
  MODIFY COLUMN `username` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户名（冗余，便于检索）',
  MODIFY COLUMN `token_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '令牌名称（冗余，便于检索）',
  MODIFY COLUMN `model_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实际使用的模型名',
  MODIFY COLUMN `quota` bigint DEFAULT 0 COMMENT '本次消耗额度',
  MODIFY COLUMN `prompt_tokens` bigint DEFAULT 0 COMMENT '输入 token 数',
  MODIFY COLUMN `completion_tokens` bigint DEFAULT 0 COMMENT '输出 token 数',
  MODIFY COLUMN `use_time` bigint DEFAULT 0 COMMENT '请求耗时（秒）',
  MODIFY COLUMN `is_stream` tinyint(1) DEFAULT NULL COMMENT '是否流式响应：1 是 0 否',
  MODIFY COLUMN `channel_id` bigint DEFAULT NULL COMMENT '渠道 ID，关联 channels.id',
  MODIFY COLUMN `channel_name` longtext COLLATE utf8mb4_unicode_ci COMMENT '渠道名称（冗余）',
  MODIFY COLUMN `token_id` bigint DEFAULT 0 COMMENT '令牌 ID，关联 tokens.id',
  MODIFY COLUMN `group` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求时的用户分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `ip` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '客户端 IP',
  MODIFY COLUMN `request_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '请求追踪 ID',
  MODIFY COLUMN `upstream_request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '上游返回的请求 ID',
  MODIFY COLUMN `other` longtext COLLATE utf8mb4_unicode_ci COMMENT '扩展信息（JSON 字符串，含计费明细）';

-- ============================================================================
-- 12. midjourneys —— Midjourney 任务表
-- ============================================================================
ALTER TABLE `midjourneys` COMMENT = 'Midjourney 任务表：绘图/视频任务的提交与结果';
ALTER TABLE `midjourneys`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `code` bigint DEFAULT NULL COMMENT '任务状态码（与上游交互用）',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `action` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '动作，如 IMAGINE / UPSCALE / VARIATION',
  MODIFY COLUMN `mj_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上游 Midjourney 任务 ID',
  MODIFY COLUMN `prompt` longtext COLLATE utf8mb4_unicode_ci COMMENT '用户原始提示词',
  MODIFY COLUMN `prompt_en` longtext COLLATE utf8mb4_unicode_ci COMMENT '翻译后的英文提示词',
  MODIFY COLUMN `description` longtext COLLATE utf8mb4_unicode_ci COMMENT '任务描述',
  MODIFY COLUMN `state` longtext COLLATE utf8mb4_unicode_ci COMMENT '上游返回的原始状态串',
  MODIFY COLUMN `submit_time` bigint DEFAULT NULL COMMENT '提交时间（Unix 秒）',
  MODIFY COLUMN `start_time` bigint DEFAULT NULL COMMENT '开始执行时间（Unix 秒）',
  MODIFY COLUMN `finish_time` bigint DEFAULT NULL COMMENT '完成时间（Unix 秒）',
  MODIFY COLUMN `image_url` longtext COLLATE utf8mb4_unicode_ci COMMENT '结果图片地址',
  MODIFY COLUMN `video_url` longtext COLLATE utf8mb4_unicode_ci COMMENT '结果视频地址',
  MODIFY COLUMN `video_urls` longtext COLLATE utf8mb4_unicode_ci COMMENT '结果视频地址列表（JSON 字符串）',
  MODIFY COLUMN `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务状态：SUBMITTED / IN_PROGRESS / SUCCESS / FAILURE',
  MODIFY COLUMN `progress` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上游进度百分比',
  MODIFY COLUMN `fail_reason` longtext COLLATE utf8mb4_unicode_ci COMMENT '失败原因',
  MODIFY COLUMN `channel_id` bigint DEFAULT NULL COMMENT '渠道 ID，关联 channels.id',
  MODIFY COLUMN `quota` bigint DEFAULT NULL COMMENT '本次消耗额度',
  MODIFY COLUMN `buttons` longtext COLLATE utf8mb4_unicode_ci COMMENT '可交互按钮定义（JSON 字符串）',
  MODIFY COLUMN `properties` longtext COLLATE utf8mb4_unicode_ci COMMENT '任务扩展属性（JSON 字符串）',
  MODIFY COLUMN `token_id` bigint DEFAULT 0 COMMENT '令牌 ID，关联 tokens.id',
  MODIFY COLUMN `billing_channel_id` bigint DEFAULT 0 COMMENT '实际计费的渠道 ID';

-- ============================================================================
-- 13. models —— 模型元数据表
-- ============================================================================
ALTER TABLE `models` COMMENT = '模型元数据表：对外展示的模型目录与端点配置';
ALTER TABLE `models`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `model_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模型名称（对外唯一）',
  MODIFY COLUMN `description` text COLLATE utf8mb4_unicode_ci COMMENT '模型描述',
  MODIFY COLUMN `icon` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模型图标',
  MODIFY COLUMN `tags` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签（逗号分隔），如 文本,视觉',
  MODIFY COLUMN `vendor_id` bigint DEFAULT NULL COMMENT '厂商 ID，关联 vendors.id',
  MODIFY COLUMN `endpoints` text COLLATE utf8mb4_unicode_ci COMMENT '支持的端点类型列表（JSON 字符串）',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '状态：1 启用 0 停用',
  MODIFY COLUMN `sync_official` bigint DEFAULT 1 COMMENT '是否跟随官方同步：1 是 0 否',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_time` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除',
  MODIFY COLUMN `name_rule` bigint DEFAULT 0 COMMENT '模型名规则类型：0 精确 1 前缀匹配 2 包含 3 后缀';

-- ============================================================================
-- 14. options —— 系统配置表
-- ============================================================================
ALTER TABLE `options` COMMENT = '系统配置表：键值对形式的全局配置';
ALTER TABLE `options`
  MODIFY COLUMN `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置项键名（MySQL 保留字，需反引号）',
  MODIFY COLUMN `value` longtext COLLATE utf8mb4_unicode_ci COMMENT '配置项值（字符串或 JSON 字符串）';

-- ============================================================================
-- 15. passkey_credentials —— Passkey 凭据表
-- ============================================================================
ALTER TABLE `passkey_credentials` COMMENT = 'Passkey / WebAuthn 凭据表：免密登录凭证';
ALTER TABLE `passkey_credentials`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '用户 ID',
  MODIFY COLUMN `rp_id` varchar(253) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '依赖方标识（Relying Party ID，即域名）',
  MODIFY COLUMN `credential_id` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '凭据 ID（唯一）',
  MODIFY COLUMN `public_key` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公钥（COSE 编码）',
  MODIFY COLUMN `attestation_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '认证器证明类型',
  MODIFY COLUMN `aa_guid` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '认证器 AAGUID',
  MODIFY COLUMN `sign_count` int unsigned DEFAULT 0 COMMENT '签名计数器，用于检测凭据克隆',
  MODIFY COLUMN `clone_warning` tinyint(1) DEFAULT NULL COMMENT '是否检测到克隆风险：1 是 0 否',
  MODIFY COLUMN `user_present` tinyint(1) DEFAULT NULL COMMENT '是否要求用户在场（UP 标志）',
  MODIFY COLUMN `user_verified` tinyint(1) DEFAULT NULL COMMENT '是否要求用户验证（UV 标志）',
  MODIFY COLUMN `backup_eligible` tinyint(1) DEFAULT NULL COMMENT '是否可备份（BE 标志）',
  MODIFY COLUMN `backup_state` tinyint(1) DEFAULT NULL COMMENT '是否已备份（BS 标志）',
  MODIFY COLUMN `transports` text COLLATE utf8mb4_unicode_ci COMMENT '支持的传输方式（JSON 字符串）',
  MODIFY COLUMN `attachment` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '认证器附着方式：platform / cross-platform',
  MODIFY COLUMN `last_used_at` datetime(3) DEFAULT NULL COMMENT '最近使用时间（毫秒精度）',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）',
  MODIFY COLUMN `updated_at` datetime(3) DEFAULT NULL COMMENT '更新时间（毫秒精度）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 16. perf_metrics —— 性能指标表
-- ============================================================================
ALTER TABLE `perf_metrics` COMMENT = '性能指标表：按 模型+分组+时间桶 聚合的延迟与吞吐';
ALTER TABLE `perf_metrics`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `model_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模型名称',
  MODIFY COLUMN `group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `bucket_ts` bigint DEFAULT NULL COMMENT '时间桶起点（Unix 秒）',
  MODIFY COLUMN `request_count` bigint DEFAULT 0 COMMENT '请求总数',
  MODIFY COLUMN `success_count` bigint DEFAULT 0 COMMENT '成功请求数',
  MODIFY COLUMN `total_latency_ms` bigint DEFAULT 0 COMMENT '累计总延迟（毫秒）',
  MODIFY COLUMN `ttft_sum_ms` bigint DEFAULT 0 COMMENT '首字延迟累加值（毫秒）',
  MODIFY COLUMN `ttft_count` bigint DEFAULT 0 COMMENT '首字延迟采样数',
  MODIFY COLUMN `output_tokens` bigint DEFAULT 0 COMMENT '输出 token 总数',
  MODIFY COLUMN `generation_ms` bigint DEFAULT 0 COMMENT '生成耗时累计值（毫秒）';

-- ============================================================================
-- 17. prefill_groups —— 预填分组表
-- ============================================================================
ALTER TABLE `prefill_groups` COMMENT = '预填分组表：前端表单/编辑器的预设项集合';
ALTER TABLE `prefill_groups`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分组名称（唯一）',
  MODIFY COLUMN `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分组类型，标识用于哪类表单',
  MODIFY COLUMN `items` json DEFAULT NULL COMMENT '预设项列表（JSON）',
  MODIFY COLUMN `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分组描述',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_time` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 18. quota_data —— 用量统计明细表
-- ============================================================================
ALTER TABLE `quota_data` COMMENT = '用量统计明细表：用于图表展示与对账';
ALTER TABLE `quota_data`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `username` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户名（冗余，便于检索）',
  MODIFY COLUMN `model_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '模型名称',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '统计时间（Unix 秒）',
  MODIFY COLUMN `use_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '实际使用的分组',
  MODIFY COLUMN `token_id` bigint DEFAULT 0 COMMENT '令牌 ID，关联 tokens.id',
  MODIFY COLUMN `channel_id` bigint DEFAULT 0 COMMENT '渠道 ID，关联 channels.id',
  MODIFY COLUMN `node_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '处理该请求的节点名',
  MODIFY COLUMN `token_used` bigint DEFAULT 0 COMMENT '消耗 token 总数',
  MODIFY COLUMN `count` bigint DEFAULT 0 COMMENT '请求次数',
  MODIFY COLUMN `quota` bigint DEFAULT 0 COMMENT '消耗额度',
  MODIFY COLUMN `cache_read_tokens` bigint DEFAULT 0 COMMENT '缓存命中读取的 token 数',
  MODIFY COLUMN `cache_creation_tokens` bigint DEFAULT 0 COMMENT '写入缓存的 token 数';

-- ============================================================================
-- 19. redemptions —— 兑换码表
-- ============================================================================
ALTER TABLE `redemptions` COMMENT = '兑换码表：生成与核销记录';
ALTER TABLE `redemptions`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '创建者（管理员）用户 ID',
  MODIFY COLUMN `key` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '兑换码（唯一）',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '状态：1 启用（未使用）2 禁用 3 已使用',
  MODIFY COLUMN `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '批次名称',
  MODIFY COLUMN `quota` bigint DEFAULT 100 COMMENT '可兑换额度',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `redeemed_time` bigint DEFAULT NULL COMMENT '核销时间（Unix 秒）',
  MODIFY COLUMN `used_user_id` bigint DEFAULT NULL COMMENT '核销用户 ID',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除',
  MODIFY COLUMN `expired_time` bigint DEFAULT NULL COMMENT '过期时间（Unix 秒，-1 或空表示不过期）';

-- ============================================================================
-- 20. setups —— 安装初始化表
-- ============================================================================
ALTER TABLE `setups` COMMENT = '安装初始化表：记录首次安装的版本与时间';
ALTER TABLE `setups`
  MODIFY COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '初始化时写入的系统版本号',
  MODIFY COLUMN `initialized_at` bigint NOT NULL COMMENT '初始化时间（Unix 秒）';

-- ============================================================================
-- 21. subscription_orders —— 订阅订单表
-- ============================================================================
ALTER TABLE `subscription_orders` COMMENT = '订阅订单表：用户购买套餐的订单与支付状态';
ALTER TABLE `subscription_orders`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '下单用户 ID',
  MODIFY COLUMN `plan_id` bigint DEFAULT NULL COMMENT '套餐 ID，关联 subscription_plans.id',
  MODIFY COLUMN `money` double DEFAULT NULL COMMENT '订单金额（实际支付货币）',
  MODIFY COLUMN `trade_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '第三方交易号（唯一）',
  MODIFY COLUMN `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支付方式，如 stripe / balance',
  MODIFY COLUMN `payment_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '支付渠道标识，如 stripe / creem / waffo',
  MODIFY COLUMN `status` longtext COLLATE utf8mb4_unicode_ci COMMENT '订单状态：pending / success / failed / expired',
  MODIFY COLUMN `create_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `complete_time` bigint DEFAULT NULL COMMENT '完成时间（Unix 秒）',
  MODIFY COLUMN `provider_payload` text COLLATE utf8mb4_unicode_ci COMMENT '支付渠道回调原始报文（JSON 字符串）';

-- ============================================================================
-- 22. subscription_plans —— 订阅套餐表
-- ============================================================================
ALTER TABLE `subscription_plans` COMMENT = '订阅套餐表：可售卖的套餐定义与额度规则';
ALTER TABLE `subscription_plans`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套餐标题',
  MODIFY COLUMN `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '套餐副标题/卖点',
  MODIFY COLUMN `price_amount` decimal(10,6) NOT NULL DEFAULT 0.000000 COMMENT '套餐价格',
  MODIFY COLUMN `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD' COMMENT '货币代码，如 USD / CNY',
  MODIFY COLUMN `duration_unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'month' COMMENT '时长单位：day / week / month / year / custom',
  MODIFY COLUMN `duration_value` bigint NOT NULL DEFAULT 1 COMMENT '时长数值，配合 duration_unit',
  MODIFY COLUMN `custom_seconds` bigint NOT NULL DEFAULT 0 COMMENT '自定义时长（秒），duration_unit=custom 时生效',
  MODIFY COLUMN `enabled` tinyint(1) DEFAULT 1 COMMENT '是否上架：1 是 0 否',
  MODIFY COLUMN `sort_order` bigint DEFAULT 0 COMMENT '排序值，越小越靠前',
  MODIFY COLUMN `allow_balance_pay` tinyint(1) DEFAULT NULL COMMENT '是否允许余额支付：1 允许 0 不允许',
  MODIFY COLUMN `allow_wallet_overflow` tinyint(1) DEFAULT NULL COMMENT '是否允许额度溢出到下期：1 允许 0 不允许',
  MODIFY COLUMN `stripe_price_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'Stripe Price ID',
  MODIFY COLUMN `creem_product_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'Creem 产品 ID',
  MODIFY COLUMN `waffo_pancake_product_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'Waffo Pancake 产品 ID',
  MODIFY COLUMN `max_purchase_per_user` bigint DEFAULT 0 COMMENT '单用户最大购买次数，0 表示不限',
  MODIFY COLUMN `upgrade_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '订阅后升级到的用户分组',
  MODIFY COLUMN `downgrade_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '订阅到期后降级到的用户分组',
  MODIFY COLUMN `total_amount` bigint NOT NULL DEFAULT 0 COMMENT '套餐总额度，0 表示不限/按需',
  MODIFY COLUMN `quota_reset_period` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT 'never' COMMENT '额度重置周期：never / daily / weekly / monthly / custom',
  MODIFY COLUMN `quota_reset_custom_seconds` bigint DEFAULT 0 COMMENT '自定义重置周期（秒）',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 23. subscription_pre_consume_records —— 订阅预扣记录表
-- ============================================================================
ALTER TABLE `subscription_pre_consume_records` COMMENT = '订阅预扣记录表：请求前预扣、请求后冲正或实扣';
ALTER TABLE `subscription_pre_consume_records`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `request_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求追踪 ID（唯一）',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `user_subscription_id` bigint DEFAULT NULL COMMENT '用户订阅 ID，关联 user_subscriptions.id',
  MODIFY COLUMN `pre_consumed` bigint NOT NULL DEFAULT 0 COMMENT '预扣额度',
  MODIFY COLUMN `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状态：pre_consumed / settled / refunded',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 24. system_instances —— 集群节点表
-- ============================================================================
ALTER TABLE `system_instances` COMMENT = '集群节点表：多实例部署时的心跳与节点信息';
ALTER TABLE `system_instances`
  MODIFY COLUMN `node_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '节点名称（主键）',
  MODIFY COLUMN `info` text COLLATE utf8mb4_unicode_ci COMMENT '节点信息（JSON 字符串，含版本/地址等）',
  MODIFY COLUMN `started_at` bigint DEFAULT NULL COMMENT '节点启动时间（Unix 秒）',
  MODIFY COLUMN `last_seen_at` bigint DEFAULT NULL COMMENT '最近一次心跳时间（Unix 秒）',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 25. system_task_locks —— 系统任务锁表
-- ============================================================================
ALTER TABLE `system_task_locks` COMMENT = '系统任务锁表：保证同类定时任务在集群中只跑一份';
ALTER TABLE `system_task_locks`
  MODIFY COLUMN `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务类型（主键）',
  MODIFY COLUMN `task_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前持锁的任务 ID',
  MODIFY COLUMN `locked_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '持锁节点名',
  MODIFY COLUMN `locked_until` bigint DEFAULT NULL COMMENT '锁到期时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 26. system_tasks —— 系统异步任务表
-- ============================================================================
ALTER TABLE `system_tasks` COMMENT = '系统异步任务表：内部后台任务的调度与执行状态';
ALTER TABLE `system_tasks`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `task_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务业务 ID（唯一）',
  MODIFY COLUMN `type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务类型',
  MODIFY COLUMN `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务状态：pending / running / succeeded / failed',
  MODIFY COLUMN `active_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '活跃任务去重键（唯一），保证同类任务不并发',
  MODIFY COLUMN `payload` text COLLATE utf8mb4_unicode_ci COMMENT '任务输入参数（JSON 字符串）',
  MODIFY COLUMN `state` text COLLATE utf8mb4_unicode_ci COMMENT '任务中间状态（JSON 字符串，用于断点续跑）',
  MODIFY COLUMN `result` text COLLATE utf8mb4_unicode_ci COMMENT '任务执行结果（JSON 字符串）',
  MODIFY COLUMN `error` text COLLATE utf8mb4_unicode_ci COMMENT '失败错误信息',
  MODIFY COLUMN `locked_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '执行该任务的节点名',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 27. task_plugins —— 任务插件表
-- ============================================================================
ALTER TABLE `task_plugins` COMMENT = '任务插件表：异步任务插件源码与版本管理';
ALTER TABLE `task_plugins`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '插件标识（MySQL 保留字，需反引号）',
  MODIFY COLUMN `api_version` bigint NOT NULL COMMENT '插件使用的 API 版本号',
  MODIFY COLUMN `version` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '插件版本号',
  MODIFY COLUMN `source` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '插件源码',
  MODIFY COLUMN `source_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '源码哈希，用于识别变更',
  MODIFY COLUMN `icon` longtext COLLATE utf8mb4_unicode_ci COMMENT '插件图标',
  MODIFY COLUMN `enabled` tinyint(1) NOT NULL COMMENT '是否启用：1 启用 0 停用',
  MODIFY COLUMN `active` tinyint(1) NOT NULL COMMENT '是否为当前生效版本：1 是 0 否',
  MODIFY COLUMN `created_at` bigint NOT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注';

-- ============================================================================
-- 28. tasks —— 异步任务表
-- ============================================================================
ALTER TABLE `tasks` COMMENT = '异步任务表：视频/音频等长耗时任务（按 platform 区分）';
ALTER TABLE `tasks`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）',
  MODIFY COLUMN `task_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务业务 ID（上游返回）',
  MODIFY COLUMN `platform` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务平台，如 suno / kling / runway',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `group` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `channel_id` bigint DEFAULT NULL COMMENT '渠道 ID，关联 channels.id',
  MODIFY COLUMN `quota` bigint DEFAULT NULL COMMENT '消耗额度',
  MODIFY COLUMN `action` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '动作类型，如 generate / query',
  MODIFY COLUMN `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务状态：NOT_START / SUBMITTED / QUEUED / IN_PROGRESS / SUCCESS / FAILURE',
  MODIFY COLUMN `fail_reason` longtext COLLATE utf8mb4_unicode_ci COMMENT '失败原因',
  MODIFY COLUMN `submit_time` bigint DEFAULT NULL COMMENT '提交时间（Unix 秒）',
  MODIFY COLUMN `start_time` bigint DEFAULT NULL COMMENT '开始执行时间（Unix 秒）',
  MODIFY COLUMN `finish_time` bigint DEFAULT NULL COMMENT '完成时间（Unix 秒）',
  MODIFY COLUMN `progress` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '进度百分比',
  MODIFY COLUMN `properties` json DEFAULT NULL COMMENT '任务可公开属性（JSON）',
  MODIFY COLUMN `private_data` json DEFAULT NULL COMMENT '不对用户暴露的内部数据（JSON）',
  MODIFY COLUMN `data` json DEFAULT NULL COMMENT '任务结果数据（JSON）';

-- ============================================================================
-- 29. tokens —— 令牌表
-- ============================================================================
ALTER TABLE `tokens` COMMENT = '令牌表：用户创建的 API Key 及其额度/限流配置';
ALTER TABLE `tokens`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '所属用户 ID',
  MODIFY COLUMN `key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '令牌 key（唯一，请求时作为 Bearer）',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '状态：1 启用 2 禁用 3 已过期 4 额度耗尽',
  MODIFY COLUMN `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '令牌名称',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `accessed_time` bigint DEFAULT NULL COMMENT '最近使用时间（Unix 秒）',
  MODIFY COLUMN `expired_time` bigint DEFAULT -1 COMMENT '过期时间（Unix 秒，-1 表示永不过期）',
  MODIFY COLUMN `remain_quota` bigint DEFAULT 0 COMMENT '剩余额度',
  MODIFY COLUMN `unlimited_quota` tinyint(1) DEFAULT NULL COMMENT '是否无限额度：1 是 0 否',
  MODIFY COLUMN `model_limits_enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用模型白名单：1 是 0 否',
  MODIFY COLUMN `model_limits` text COLLATE utf8mb4_unicode_ci COMMENT '允许使用的模型列表（逗号分隔）',
  MODIFY COLUMN `allow_ips` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '允许调用的 IP 列表（逗号分隔，空表示不限）',
  MODIFY COLUMN `used_quota` bigint DEFAULT 0 COMMENT '累计已用额度',
  MODIFY COLUMN `group` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '令牌可用的用户分组（MySQL 保留字，需反引号）',
  MODIFY COLUMN `cross_group_retry` tinyint(1) DEFAULT NULL COMMENT '是否允许跨分组重试：1 允许 0 不允许',
  MODIFY COLUMN `auto_groups` text COLLATE utf8mb4_unicode_ci COMMENT '自动分组列表（JSON 字符串）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除',
  MODIFY COLUMN `allow_user_quota_query` tinyint(1) DEFAULT NULL COMMENT '是否允许用该令牌查询额度：1 允许 0 不允许';

-- ============================================================================
-- 30. top_ups —— 充值订单表
-- ============================================================================
ALTER TABLE `top_ups` COMMENT = '充值订单表：用户余额充值记录';
ALTER TABLE `top_ups`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '充值用户 ID',
  MODIFY COLUMN `amount` bigint DEFAULT NULL COMMENT '到账额度（系统内部额度单位）',
  MODIFY COLUMN `money` double DEFAULT NULL COMMENT '实付金额',
  MODIFY COLUMN `trade_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '第三方交易号（唯一）',
  MODIFY COLUMN `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支付方式，如 stripe / alipay',
  MODIFY COLUMN `payment_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '支付渠道标识',
  MODIFY COLUMN `create_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `complete_time` bigint DEFAULT NULL COMMENT '完成时间（Unix 秒）',
  MODIFY COLUMN `status` longtext COLLATE utf8mb4_unicode_ci COMMENT '订单状态：pending / success / failed / expired';

-- ============================================================================
-- 31. two_fa_backup_codes —— 双因素备用码表
-- ============================================================================
ALTER TABLE `two_fa_backup_codes` COMMENT = '双因素备用码表：2FA 丢失时的一次性恢复码';
ALTER TABLE `two_fa_backup_codes`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '用户 ID',
  MODIFY COLUMN `code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '备用码哈希（不存明文）',
  MODIFY COLUMN `is_used` tinyint(1) DEFAULT NULL COMMENT '是否已使用：1 已用 0 未用',
  MODIFY COLUMN `used_at` datetime(3) DEFAULT NULL COMMENT '使用时间（毫秒精度）',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 32. two_fas —— 双因素认证表
-- ============================================================================
ALTER TABLE `two_fas` COMMENT = '双因素认证表：TOTP 密钥与失败锁定状态';
ALTER TABLE `two_fas`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '用户 ID（唯一）',
  MODIFY COLUMN `secret` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'TOTP 密钥（加密存储）',
  MODIFY COLUMN `is_enabled` tinyint(1) DEFAULT NULL COMMENT '是否已启用：1 启用 0 未启用',
  MODIFY COLUMN `failed_attempts` bigint DEFAULT 0 COMMENT '连续验证失败次数',
  MODIFY COLUMN `locked_until` datetime(3) DEFAULT NULL COMMENT '锁定到期时间，NULL 表示未锁定',
  MODIFY COLUMN `last_used_at` datetime(3) DEFAULT NULL COMMENT '最近一次验证成功时间（毫秒精度）',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '创建时间（毫秒精度）',
  MODIFY COLUMN `updated_at` datetime(3) DEFAULT NULL COMMENT '更新时间（毫秒精度）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 33. user_access_tokens —— 个人访问令牌表
-- ============================================================================
ALTER TABLE `user_access_tokens` COMMENT = '个人访问令牌表：带 scope 的 PAT，用于开放接口鉴权';
ALTER TABLE `user_access_tokens`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '所属用户 ID',
  MODIFY COLUMN `name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '令牌名称（用户自定义备注）',
  MODIFY COLUMN `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '令牌哈希（唯一，不存明文）',
  MODIFY COLUMN `token_hint` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '令牌尾部提示字符，便于用户辨认',
  MODIFY COLUMN `scopes` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '权限范围（逗号或空格分隔）',
  MODIFY COLUMN `expires_at` bigint DEFAULT NULL COMMENT '过期时间（Unix 秒，0 或空表示不过期）',
  MODIFY COLUMN `last_used_at` bigint DEFAULT NULL COMMENT '最近使用时间（Unix 秒）',
  MODIFY COLUMN `last_used_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最近使用时的 IP',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）';

-- ============================================================================
-- 34. user_oauth_bindings —— OAuth 绑定表
-- ============================================================================
ALTER TABLE `user_oauth_bindings` COMMENT = 'OAuth 绑定表：自定义 OAuth 提供商与本系统用户的绑定关系';
ALTER TABLE `user_oauth_bindings`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '本系统用户 ID',
  MODIFY COLUMN `provider_id` bigint NOT NULL COMMENT '提供商 ID，关联 custom_oauth_providers.id',
  MODIFY COLUMN `provider_user_id` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '提供商侧用户唯一 ID',
  MODIFY COLUMN `created_at` datetime(3) DEFAULT NULL COMMENT '绑定时间（毫秒精度）';

-- ============================================================================
-- 35. user_sessions —— 登录会话表
-- ============================================================================
ALTER TABLE `user_sessions` COMMENT = '登录会话表：会话状态与 refresh token 轮转';
ALTER TABLE `user_sessions`
  MODIFY COLUMN `sid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话 ID（主键）',
  MODIFY COLUMN `user_id` bigint NOT NULL COMMENT '用户 ID',
  MODIFY COLUMN `version` bigint NOT NULL DEFAULT 1 COMMENT '会话版本号，用于并发控制',
  MODIFY COLUMN `user_auth_version` bigint NOT NULL COMMENT '签发时的用户认证版本，对应 users.auth_version',
  MODIFY COLUMN `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话状态：active 生效 / revoking 吊销中 / revoked 已吊销',
  MODIFY COLUMN `refresh_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '当前 refresh token 的哈希',
  MODIFY COLUMN `previous_refresh_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上一个 refresh token 哈希，用于宽限期重放检测',
  MODIFY COLUMN `previous_valid_until` bigint NOT NULL DEFAULT 0 COMMENT '旧 refresh token 的宽限截止时间（Unix 秒）',
  MODIFY COLUMN `login_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '登录方式：password / github / oidc / passkey',
  MODIFY COLUMN `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '登录 IP',
  MODIFY COLUMN `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '登录设备 User-Agent',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `last_active_at` bigint NOT NULL COMMENT '最近活跃时间（Unix 秒）',
  MODIFY COLUMN `expires_at` bigint NOT NULL COMMENT '会话过期时间（Unix 秒）',
  MODIFY COLUMN `revoked_at` bigint NOT NULL DEFAULT 0 COMMENT '吊销时间（Unix 秒，0 表示未吊销）',
  MODIFY COLUMN `revoked_reason` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '吊销原因，如 logout / password_changed';

-- ============================================================================
-- 36. user_subscriptions —— 用户订阅表
-- ============================================================================
ALTER TABLE `user_subscriptions` COMMENT = '用户订阅表：用户持有的套餐实例与额度使用情况';
ALTER TABLE `user_subscriptions`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '用户 ID',
  MODIFY COLUMN `plan_id` bigint DEFAULT NULL COMMENT '套餐 ID，关联 subscription_plans.id',
  MODIFY COLUMN `amount_total` bigint NOT NULL DEFAULT 0 COMMENT '本期总额度',
  MODIFY COLUMN `amount_used` bigint NOT NULL DEFAULT 0 COMMENT '本期已用额度',
  MODIFY COLUMN `start_time` bigint DEFAULT NULL COMMENT '生效时间（Unix 秒）',
  MODIFY COLUMN `end_time` bigint DEFAULT NULL COMMENT '到期时间（Unix 秒）',
  MODIFY COLUMN `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状态：active / expired / cancelled',
  MODIFY COLUMN `source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'order' COMMENT '订阅来源：order 订单 / admin 后台赠送',
  MODIFY COLUMN `last_reset_time` bigint DEFAULT 0 COMMENT '上次额度重置时间（Unix 秒）',
  MODIFY COLUMN `next_reset_time` bigint DEFAULT 0 COMMENT '下次额度重置时间（Unix 秒）',
  MODIFY COLUMN `upgrade_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '订阅生效时升级到的用户分组',
  MODIFY COLUMN `prev_user_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '订阅前的用户分组（用于到期回退）',
  MODIFY COLUMN `downgrade_group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '到期后降级到的用户分组',
  MODIFY COLUMN `allow_wallet_overflow` tinyint(1) DEFAULT NULL COMMENT '是否允许额度溢出到下期：1 允许 0 不允许',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_at` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）';

-- ============================================================================
-- 37. users —— 用户主表
-- ============================================================================
ALTER TABLE `users` COMMENT = '用户主表：账号、额度、分组与第三方身份 ID';
ALTER TABLE `users`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `username` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名（唯一）',
  MODIFY COLUMN `password` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希（bcrypt，不存明文）',
  MODIFY COLUMN `display_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '显示名称',
  MODIFY COLUMN `role` bigint DEFAULT 1 COMMENT '角色：0 访客 1 普通用户 10 管理员 100 超级管理员',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '用户状态：1 启用 2 禁用',
  MODIFY COLUMN `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  MODIFY COLUMN `github_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GitHub 用户 ID',
  MODIFY COLUMN `discord_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Discord 用户 ID',
  MODIFY COLUMN `oidc_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OIDC 用户 ID',
  MODIFY COLUMN `wechat_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信用户 ID',
  MODIFY COLUMN `telegram_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram 用户 ID',
  MODIFY COLUMN `access_token` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '系统访问令牌（唯一，用于免密调用）',
  MODIFY COLUMN `access_token_created_at` bigint DEFAULT NULL COMMENT '访问令牌生成时间（Unix 秒）',
  MODIFY COLUMN `quota` bigint DEFAULT 0 COMMENT '剩余额度',
  MODIFY COLUMN `used_quota` bigint DEFAULT 0 COMMENT '累计已用额度',
  MODIFY COLUMN `request_count` bigint DEFAULT 0 COMMENT '累计请求次数',
  MODIFY COLUMN `group` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT '用户分组，决定可用渠道与倍率（MySQL 保留字，需反引号）',
  MODIFY COLUMN `aff_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邀请码（唯一）',
  MODIFY COLUMN `aff_count` bigint DEFAULT 0 COMMENT '累计邀请人数',
  MODIFY COLUMN `aff_quota` bigint DEFAULT 0 COMMENT '待提取的邀请返利额度',
  MODIFY COLUMN `aff_history` bigint DEFAULT 0 COMMENT '历史邀请返利总额',
  MODIFY COLUMN `inviter_id` bigint DEFAULT NULL COMMENT '邀请人用户 ID',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除',
  MODIFY COLUMN `linux_do_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Linux.do 社区用户 ID',
  MODIFY COLUMN `setting` text COLLATE utf8mb4_unicode_ci COMMENT '用户个性化设置（JSON 字符串）',
  MODIFY COLUMN `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '管理员备注',
  MODIFY COLUMN `stripe_customer` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe 客户 ID',
  MODIFY COLUMN `created_at` bigint DEFAULT NULL COMMENT '注册时间（Unix 秒）',
  MODIFY COLUMN `last_login_at` bigint DEFAULT 0 COMMENT '最近登录时间（Unix 秒）',
  MODIFY COLUMN `auth_version` bigint NOT NULL DEFAULT 1 COMMENT '认证版本号，变更密码/权限时递增以失效旧会话';

-- ============================================================================
-- 38. vendors —— 模型厂商表
-- ============================================================================
ALTER TABLE `vendors` COMMENT = '模型厂商表：模型所属供应商，如 OpenAI / Anthropic';
ALTER TABLE `vendors`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '厂商名称（与删除时间组合唯一）',
  MODIFY COLUMN `description` text COLLATE utf8mb4_unicode_ci COMMENT '厂商描述',
  MODIFY COLUMN `icon` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '厂商图标',
  MODIFY COLUMN `status` bigint DEFAULT 1 COMMENT '状态：1 启用 0 停用',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒）',
  MODIFY COLUMN `updated_time` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 39. enterprise_leads —— 企业线索表（后续版本新增）
-- ============================================================================
ALTER TABLE `enterprise_leads` COMMENT = '企业线索表：门面「联系销售」表单提交记录';
ALTER TABLE `enterprise_leads`
  MODIFY COLUMN `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  MODIFY COLUMN `company` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司名称',
  MODIFY COLUMN `contact_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系人姓名',
  MODIFY COLUMN `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系邮箱（索引）',
  MODIFY COLUMN `monthly_tokens` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '月均调用量区间（表单选项原文）',
  MODIFY COLUMN `requirement` text COLLATE utf8mb4_unicode_ci COMMENT '需求描述',
  MODIFY COLUMN `status` bigint DEFAULT '0' COMMENT '线索状态：0 待跟进 1 已联系 2 已成交 3 已关闭（-1 仅用于筛选全部，不落库）',
  MODIFY COLUMN `remark` text COLLATE utf8mb4_unicode_ci COMMENT '管理员跟进备注',
  MODIFY COLUMN `user_id` bigint DEFAULT NULL COMMENT '提交人用户 ID，匿名提交为 0/NULL',
  MODIFY COLUMN `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提交来源 IP（按 IP 限流防刷）',
  MODIFY COLUMN `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提交来源 User-Agent',
  MODIFY COLUMN `created_time` bigint DEFAULT NULL COMMENT '创建时间（Unix 秒，索引，用于限流窗口统计）',
  MODIFY COLUMN `updated_time` bigint DEFAULT NULL COMMENT '更新时间（Unix 秒）',
  MODIFY COLUMN `deleted_at` datetime(3) DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除';

-- ============================================================================
-- 校验：确认注释是否写入成功
-- ============================================================================
-- SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = 'new_api' ORDER BY TABLE_NAME;
-- SELECT TABLE_NAME, COLUMN_NAME, COLUMN_COMMENT FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA = 'new_api' ORDER BY TABLE_NAME, ORDINAL_POSITION;
