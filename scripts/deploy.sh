#!/usr/bin/env bash
#
# 服务器端部署：备份数据库 -> 拉取分支 -> 用本地源码构建镜像 -> 重启 -> 健康检查。
#
# 前置条件（全部在仓库根目录执行）：
#   - docker 与 docker compose v2
#   - 已按 README 配好 docker-compose.yml（数据库、Redis、SESSION_SECRET 等）
#   - 同目录存在 docker-compose.build.yml
#
# 用法：
#   ./scripts/deploy.sh                     # 部署 dev 分支：拉取 ACR 镜像并重启
#   ACR_REGISTRY=<VPC域名> ACR_NAMESPACE=little-man \
#     ./scripts/deploy.sh --tag a1b2c3d     # 按 commit 短 SHA 部署指定版本
#   BRANCH=main ./scripts/deploy.sh         # 部署指定分支
#   ./scripts/deploy.sh --build             # 本机构建（需 4 GB 以上内存，仅调试用）
#   ./scripts/deploy.sh --skip-backup       # 跳过备份（不推荐）
#   ./scripts/deploy.sh --skip-git-pull     # 只用本地代码，不拉 git
#
# 环境变量：
#   BRANCH=dev             部署分支
#   MODE=pull              部署模式：pull（默认，从 ACR 拉镜像）或 build（本机构建）
#   IMAGE_TAG=latest       镜像 tag，建议传 commit 短 SHA
#   ACR_REGISTRY           ACR 域名（必填）。同地域拉取请用 VPC 域名，走内网不受 3 Mbps 公网带宽限制：
#                            旧版个人版：registry-vpc.cn-guangzhou.aliyuncs.com
#                            新版个人版：crpi-xxxxxxxx-vpc.cn-guangzhou.personal.cr.aliyuncs.com
#   ACR_NAMESPACE          ACR 命名空间（未设置 NEW_API_IMAGE 时必填）
#   NEW_API_IMAGE          完整镜像地址，设置后忽略 ACR_* 变量
#   PORT=3000              健康检查端口
#   COMPOSE_BASE=docker-compose.yml
#   COMPOSE_BUILD=docker-compose.build.yml
#   BACKUP_DIR=$HOME/new-api-backups   备份目录（默认在仓库外,不污染工作区）
#   DB_USER=root           数据库用户
#   DB_NAME=new-api        数据库名
#   DB_PASS=               仅 MySQL 备份需要
#   HEALTH_TIMEOUT=90      健康检查最长等待秒数
#
set -euo pipefail

BRANCH="${BRANCH:-dev}"
PORT="${PORT:-3000}"
COMPOSE_BASE="${COMPOSE_BASE:-docker-compose.yml}"
COMPOSE_BUILD="${COMPOSE_BUILD:-docker-compose.build.yml}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/new-api-backups}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-new-api}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

# pull：从 ACR 拉镜像（默认，2 GiB 机器唯一可行方式）
# build：本机 docker build（需 4 GB 以上内存，仅调试用）
MODE="${MODE:-pull}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ACR_REGISTRY="${ACR_REGISTRY:-}"
ACR_NAMESPACE="${ACR_NAMESPACE:-}"
NEW_API_IMAGE="${NEW_API_IMAGE:-}"

DO_BACKUP=1
DO_GIT_PULL=1

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-backup)                DO_BACKUP=0; shift ;;
    --skip-pull|--skip-git-pull)  DO_GIT_PULL=0; shift ;;
    --build)                      MODE=build; shift ;;
    --pull|--no-build)            MODE=pull; shift ;;
    --tag)                        IMAGE_TAG="${2:?--tag 需要一个值}"; shift 2 ;;
    --tag=*)                      IMAGE_TAG="${1#*=}"; shift ;;
    -h|--help)                    sed -n '2,/^set -euo pipefail/p' "$0"; exit 0 ;;
    *)                            printf '[错误] 未知参数: %s\n' "$1" >&2; exit 1 ;;
  esac
done

info() { printf '\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[警告] %s\033[0m\n' "$*"; }
die()  { printf '\033[31m[错误] %s\033[0m\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die '未安装 docker'
docker compose version >/dev/null 2>&1 || die '需要 docker compose v2（docker compose，而不是 docker-compose）'
command -v git >/dev/null 2>&1 || die '未安装 git'
[ -d .git ] || die '请在仓库根目录执行本脚本'
[ -f "$COMPOSE_BASE" ] || die "缺少 $COMPOSE_BASE"
[ -f "$COMPOSE_BUILD" ] || die "缺少 $COMPOSE_BUILD"

COMPOSE=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_BUILD")

if [ -n "$(git status --porcelain)" ]; then
  die '工作区有未提交改动，请先 git stash 或 commit 后再部署'
fi

# 数据库备份：识别 compose 里在跑的数据库服务，失败即中止部署。
# 本函数在 `if ! backup_database` 的条件上下文中调用，bash 会禁用内部的 set -e，
# 所以每个可能失败的步骤都要显式判断，避免备份失败却返回成功。
backup_database() {
  mkdir -p "$BACKUP_DIR" || return 1
  local ts running
  ts="$(date +%Y%m%d-%H%M%S)"
  running="$(docker compose -f "$COMPOSE_BASE" ps --services --status running 2>/dev/null || true)"

  if printf '%s\n' "$running" | grep -qx 'postgres'; then
    info "备份 PostgreSQL -> $BACKUP_DIR/pg-$ts.sql.gz"
    if ! docker compose -f "$COMPOSE_BASE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
      | gzip > "$BACKUP_DIR/pg-$ts.sql.gz"; then
      warn 'pg_dump 失败'
      return 1
    fi
    return 0
  fi

  if printf '%s\n' "$running" | grep -qx 'mysql'; then
    if [ -z "${DB_PASS:-}" ]; then
      warn '备份 MySQL 需要设置 DB_PASS 环境变量'
      return 1
    fi
    info "备份 MySQL -> $BACKUP_DIR/mysql-$ts.sql.gz"
    if ! docker compose -f "$COMPOSE_BASE" exec -T mysql mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
      | gzip > "$BACKUP_DIR/mysql-$ts.sql.gz"; then
      warn 'mysqldump 失败'
      return 1
    fi
    return 0
  fi

  if [ -d ./data ]; then
    info "未发现 postgres/mysql 服务，按 SQLite 备份 ./data -> $BACKUP_DIR/data-$ts.tgz"
    if ! tar czf "$BACKUP_DIR/data-$ts.tgz" ./data; then
      warn 'tar 备份 ./data 失败'
      return 1
    fi
    return 0
  fi

  return 1
}

if [ "$DO_BACKUP" -eq 1 ]; then
  if ! backup_database; then
    warn '未识别到数据库，备份未完成，已中止部署。确认无风险后可加 --skip-backup'
    exit 1
  fi
fi

if [ "$DO_GIT_PULL" -eq 1 ]; then
  info "拉取 origin/$BRANCH"
  git fetch origin --prune
  git switch "$BRANCH" 2>/dev/null || git switch -c "$BRANCH" --track "origin/$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

COMMIT_MSG="$(git log -1 --pretty=%s)"

if [ "$MODE" = "build" ]; then
  NEW_API_IMAGE="new-api:$(git rev-parse --short HEAD)"
  info "本机构建镜像 $NEW_API_IMAGE"
  warn '当前机器内存不足 4 GB 时构建极易 OOM，生产请使用默认的 pull 模式'
  NEW_API_IMAGE="$NEW_API_IMAGE" "${COMPOSE[@]}" build
else
  if [ -z "$NEW_API_IMAGE" ]; then
    [ -n "$ACR_REGISTRY" ] || die '请设置 ACR_REGISTRY（VPC 域名），例如：ACR_REGISTRY=crpi-xxxx-vpc.cn-guangzhou.personal.cr.aliyuncs.com'
    [ -n "$ACR_NAMESPACE" ] || die '请设置 ACR_NAMESPACE，例如：ACR_NAMESPACE=little-man'
    NEW_API_IMAGE="${ACR_REGISTRY}/${ACR_NAMESPACE}/new-api:${IMAGE_TAG}"
  fi
  info "拉取镜像 $NEW_API_IMAGE"
  if ! docker pull "$NEW_API_IMAGE"; then
    die "拉取失败：先在服务器执行 docker login ${ACR_REGISTRY}，并确认该 tag 已由 GitHub Actions 推送"
  fi
fi

info '启动容器'
NEW_API_IMAGE="$NEW_API_IMAGE" "${COMPOSE[@]}" up -d --remove-orphans

health_check() {
  local url="http://127.0.0.1:${PORT}/api/status" waited=0
  if command -v curl >/dev/null 2>&1; then
    while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
      if curl -fsS "$url" -o /dev/null 2>/dev/null; then return 0; fi
      sleep 3; waited=$((waited + 3))
    done
    return 1
  fi
  if command -v wget >/dev/null 2>&1; then
    while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
      if wget -q -O /dev/null "$url" 2>/dev/null; then return 0; fi
      sleep 3; waited=$((waited + 3))
    done
    return 1
  fi
  # 宿主机没有 curl/wget 时退回容器内的 wget（与 compose healthcheck 一致）
  while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
    if "${COMPOSE[@]}" exec -T new-api wget -q -O - "http://localhost:3000/api/status" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3; waited=$((waited + 3))
  done
  return 1
}

if health_check; then
  info "部署成功（分支 $BRANCH @ $(git rev-parse --short HEAD)）"
  echo "    提交: $COMMIT_MSG"
  if command -v curl >/dev/null 2>&1; then
    echo -n '    线上版本: '
    curl -fsS "http://127.0.0.1:${PORT}/api/status" | grep -o '"version":"[^"]*"' || echo '(未提供 version 字段)'
  fi
  echo "    镜像: $NEW_API_IMAGE"
  if [ "$MODE" = "pull" ]; then
    echo "    回滚: ACR_NAMESPACE=$ACR_NAMESPACE ./scripts/deploy.sh --tag <上一个短SHA> --skip-git-pull"
  else
    echo "    回滚: NEW_API_IMAGE=<旧镜像> docker compose -f $COMPOSE_BASE -f $COMPOSE_BUILD up -d"
  fi
else
  warn "健康检查在 ${HEALTH_TIMEOUT}s 内未通过，请检查日志："
  echo "    docker compose -f $COMPOSE_BASE logs --tail=100 new-api"
  exit 1
fi
