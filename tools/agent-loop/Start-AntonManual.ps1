param(
  [string]$Prompt = "Continue the Ridgeline site agent loop. Read AGENT_STATE.md, AGENT_BACKLOG.md, SITE_QUALITY_AUDIT.md, and ANTON.md, then pick the highest-value next task, implement it, verify with screenshots/browser checks if UI changed, and update the state files before stopping."
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

Push-Location $RepoRoot
try {
  Write-Host ""
  Write-Host "Starting Anton in interactive manual mode."
  Write-Host "Mode: full computer access available, with approval prompts."
  Write-Host "Repo: $RepoRoot"
  Write-Host ""
  Write-Host "Anton can ask before actions that need approval. Keep this window open."
  Write-Host ""

  codex `
    --cd $RepoRoot `
    --sandbox danger-full-access `
    --ask-for-approval on-request `
    --search `
    $Prompt
} finally {
  Pop-Location
}
