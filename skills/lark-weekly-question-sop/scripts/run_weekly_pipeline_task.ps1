$ErrorActionPreference = "Stop"

$repoRoot = "e:\Vian\test_sys\fin_jour_master-exam-main\fin_jour_master-exam-main"
$scriptPath = Join-Path $repoRoot "skills\lark-weekly-question-sop\scripts\run_weekly_pipeline.py"
$logDir = Join-Path $repoRoot "skills\lark-weekly-question-sop\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir ("weekly_pipeline_{0}.log" -f (Get-Date -Format "yyyyMMdd"))

# Prefer machine/user env vars; fallback to currently configured credentials.
if (-not $env:FEISHU_APP_ID) { $env:FEISHU_APP_ID = "cli_a80e02a07a5f100b" }
if (-not $env:FEISHU_APP_SECRET) { $env:FEISHU_APP_SECRET = "CIUsfDc8yvjFVswgbVCZAbXtDMZImnMn" }

Set-Location $repoRoot

$cmd = @(
  "python",
  $scriptPath,
  "--app-token", "Pyddb4ZISahwSXsdzOrcaaljnQg",
  "--table-a", "tblJtP7hMKzCrhGT",
  "--table-b", "tblH8zlAGAc1hiN2",
  "--timezone", "Asia/Shanghai",
  "--window", "previous_week",
  "--dry-run", "false",
  "--log-level", "INFO"
)

("`n=== {0} Weekly Pipeline Start ===" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")) | Tee-Object -FilePath $logFile -Append
& $cmd[0] $cmd[1..($cmd.Length-1)] 2>&1 | Tee-Object -FilePath $logFile -Append
$exitCode = $LASTEXITCODE
("=== End (exit={0}) ===`n" -f $exitCode) | Tee-Object -FilePath $logFile -Append
exit $exitCode
