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
#   ./scripts/deploy.sh               # 部署 dev 分支
#   BRANCH=main ./scripts/deploy.sh   # 部署指定分支
#   ./scripts/deploy.sh --skip-backup # 跳过备份（不推荐）
#   ./scripts/deploy.sh --skip-pull   # 用当前工作区代码构建（调试用）
#   ./scripts/deploy.sh --no-build    # 只重启,不重建镜像
#
# 环境变量：
#   BRANCH=dev             部署分支
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

DO_BACKUP=1
DO_PULL=1
DO_BUILD=1

for arg in "$@"; do
  case "$arg" in
    --skip-backup) DO_BACKUP=0 ;;
    --skip-pull)   DO_PULL=0 ;;
    --no-build)    DO_BUILD=0 ;;
    -h|--help)     sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "未知参数: $arg" >&2; exit 1 ;;
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

# 数据库备份：识别 compose 里在跑的数据库服务，失败即中止部署
backup_database() {
  mkdir -p "$BACKUP_DIR"
  local ts running
  ts="$(date +%Y%m%d-%H%M%S)"
  running="$(docker compose -f "$COMPOSE_BASE" ps --services --status running 2>/dev/null || true)"

  if printf '%s\n' "$running" | grep -qx 'postgres'; then
    info "备份 PostgreSQL -> $BACKUP_DIR/pg-$ts.sql.gz"
    docker compose -f "$COMPOSE_BASE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
      | gzip > "$BACKUP_DIR/pg-$ts.sql.gz"
    return 0
  fi

  if printf '%s\n' "$running" | grep -qx 'mysql'; then
    [ -n "${DB_PASS:-}" ] || die '备份 MySQL 需要设置 DB_PASS 环境变量'
    info "备份 MySQL -> $BACKUP_DIR/mysql-$ts.sql.gz"
    docker compose -f "$COMPOSE_BASE" exec -T mysql mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
      | gzip > "$BACKUP_DIR/mysql-$ts.sql.gz"
    return 0
  fi

  if [ -d ./data ]; then
    info "未发现 postgres/mysql 服务，按 SQLite 备份 ./data -> $BACKUP_DIR/data-$ts.tgz"
    tar czf "$BACKUP_DIR/data-$ts.tgz" ./data
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

if [ "$DO_PULL" -eq 1 ]; then
  info "拉取 origin/$BRANCH"
  git fetch origin --prune
  git switch "$BRANCH" 2>/dev/null || git switch -c "$BRANCH" --track "origin/$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

TAG="new-api:$(git rev-parse --short HEAD)"
COMMIT_MSG="$(git log -1 --pretty=%s)"

if [ "$DO_BUILD" -eq 1 ]; then
  info "构建镜像 $TAG（前端 + Go 多阶段构建，通常需要数分钟）"
  NEW_API_IMAGE="$TAG" "${COMPOSE[@]}" build
  info '启动容器'
  NEW_API_IMAGE="$TAG" "${COMPOSE[@]}" up -d --remove-orphans
else
  info '跳过构建，仅重启容器'
  "${COMPOSE[@]}" up -d --remove-orphans
fi

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
  echo "    镜像: $TAG"
  echo "    回滚: NEW_API_IMAGE=new-api:<上一个commit> docker compose -f $COMPOSE_BASE -f $COMPOSE_BUILD up -d"
else
  warn "健康检查在 ${HEALTH_TIMEOUT}s 内未通过，请检查日志："
  echo "    docker compose -f $COMPOSE_BASE logs --tail=100 new-api"
  exit 1
fi
