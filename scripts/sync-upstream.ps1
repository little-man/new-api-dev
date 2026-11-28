<#
.SYNOPSIS
    把上游 QuantumNous/new-api 的更新合并进本地开发分支，并推送到自己的 fork。

.DESCRIPTION
    执行顺序：
      1. 确认工作区干净（有未提交改动则直接中止，不动任何文件）
      2. git fetch upstream
      3. main 快进到 upstream/main（--ff-only，绝不产生合并提交）
      4. 切回开发分支并把 main 合并进来
      5. 跑 Go 三模块测试（root / relaykit / tokenkit，可用 -SkipTests 跳过）
      6. 推送到 origin

    合并冲突时脚本会停下并列出冲突文件，不会自动提交、撤销或丢弃任何改动。

.PARAMETER DevBranch
    开发分支名，默认 dev。

.PARAMETER UpstreamBranch
    要跟随的上游分支名，默认 main。

.PARAMETER SkipTests
    跳过 go test。

.PARAMETER NoPush
    只做本地合并，不推送。

.EXAMPLE
    pwsh -File scripts/sync-upstream.ps1

.EXAMPLE
    pwsh -File scripts/sync-upstream.ps1 -SkipTests
#>
[CmdletBinding()]
param(
    [string]$DevBranch = 'dev',
    [string]$UpstreamBranch = 'main',
    [switch]$SkipTests,
    [switch]$NoPush
)

$ErrorActionPreference = 'Continue'

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$GitArgs)
    & git @GitArgs 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
}

function Stop-Sync {
    param([string]$Message)
    Write-Host ''
    Write-Host $Message -ForegroundColor Red
    exit 1
}

$root = & git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $root) {
    Stop-Sync '当前目录不在 git 仓库内，请在仓库根目录执行。'
}
Set-Location $root
Write-Host "仓库: $root" -ForegroundColor Cyan

# 1. 工作区必须干净，否则后一步的 switch/merge 可能覆盖未提交改动
$dirty = & git status --porcelain
if ($dirty) {
    Write-Host '工作区存在未提交改动，请先 commit 或 git stash 后再同步：' -ForegroundColor Yellow
    $dirty | ForEach-Object { Write-Host "  $_" }
    exit 1
}

# 2. 拉上游
Write-Host '==> 拉取 upstream' -ForegroundColor Cyan
if ((Invoke-Git -GitArgs @('fetch', 'upstream', '--prune', '--tags')) -ne 0) {
    Stop-Sync '拉取 upstream 失败：检查网络，以及 upstream remote 是否为 QuantumNous/new-api。'
}

# 3. main 只做快进，保证它永远等于上游
Write-Host '==> 快进 main' -ForegroundColor Cyan
if ((Invoke-Git -GitArgs @('switch', 'main')) -ne 0) {
    Stop-Sync '切换到 main 失败。'
}
if ((Invoke-Git -GitArgs @('merge', '--ff-only', "upstream/$UpstreamBranch")) -ne 0) {
    Stop-Sync "main 无法快进到 upstream/$UpstreamBranch：main 上存在本地提交。请先把这些提交移到 $DevBranch 后重试。"
}

# 4. 合并进开发分支
& git rev-parse --verify --quiet "refs/heads/$DevBranch" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "开发分支 $DevBranch 不存在，从 main 创建。" -ForegroundColor Yellow
    Invoke-Git -GitArgs @('switch', '-c', $DevBranch) | Out-Null
}
Write-Host "==> 合并 main 到 $DevBranch" -ForegroundColor Cyan
if ((Invoke-Git -GitArgs @('switch', $DevBranch)) -ne 0) {
    Stop-Sync "切换到 $DevBranch 失败。"
}
if ((Invoke-Git -GitArgs @('merge', 'main', '--no-edit')) -ne 0) {
    Write-Host ''
    Write-Host '合并产生冲突，已停止（未提交、未丢弃任何改动）。' -ForegroundColor Red
    $conflicts = & git diff --name-only --diff-filter=U
    if ($conflicts) {
        Write-Host '冲突文件：'
        $conflicts | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host ''
    Write-Host "解决冲突后执行：git add -A; git commit --no-edit; git push origin $DevBranch"
    exit 2
}

# 5. 三模块测试；任一失败则不推送
if (-not $SkipTests) {
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
        Write-Host '未找到 go，跳过测试。请在具备 Go 的工具链环境中验证后再部署。' -ForegroundColor Yellow
    }
    else {
        $env:GOWORK = 'off'
        $failed = @()

        Write-Host '==> go test ./... (根模块)' -ForegroundColor Cyan
        & go test ./...
        if ($LASTEXITCODE -ne 0) { $failed += 'root' }

        foreach ($module in @('relaykit', 'tokenkit')) {
            Write-Host "==> go test ./... ($module)" -ForegroundColor Cyan
            Push-Location $module
            & go test ./...
            $code = $LASTEXITCODE
            Pop-Location
            if ($code -ne 0) { $failed += $module }
        }

        if ($failed.Count -gt 0) {
            Stop-Sync ("测试失败：{0}。已保留合并结果，未推送。" -f ($failed -join ', '))
        }
    }
}

# 6. 推送自己的 fork
if (-not $NoPush) {
    Write-Host "==> 推送 origin/$DevBranch" -ForegroundColor Cyan
    if ((Invoke-Git -GitArgs @('push', 'origin', $DevBranch)) -ne 0) {
        Stop-Sync '推送失败：检查凭据，或先 git pull --rebase origin 后再推。'
    }
}

Write-Host ''
Write-Host '==> 同步完成' -ForegroundColor Green
Write-Host '最近提交：'
& git log --oneline -5
Write-Host ''
Write-Host "与 upstream/$UpstreamBranch 的差异（本地领先 / 落后）："
& git rev-list --left-right --count "HEAD...upstream/$UpstreamBranch"
Write-Host ''
Write-Host '下一步：在服务器执行 ./scripts/deploy.sh 部署。'
