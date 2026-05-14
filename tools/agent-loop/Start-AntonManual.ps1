param(
  [string]$Prompt = "Continue the Ridgeline site agent loop. Read AGENT_STATE.md, AGENT_BACKLOG.md, SITE_QUALITY_AUDIT.md, and ANTON.md, then pick the highest-value next task, implement it, verify with screenshots/browser checks if UI changed, and update the state files before stopping."
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

function Resolve-CodexPath {
  $command = Get-Command codex -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $extensionRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
  if (Test-Path -LiteralPath $extensionRoot) {
    $candidate = Get-ChildItem -LiteralPath $extensionRoot -Recurse -Filter "codex.exe" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($candidate) {
      return $candidate.FullName
    }
  }

  throw "codex.exe was not found. Open the ChatGPT/Codex extension in VS Code once, or add codex.exe to PATH."
}

Push-Location $RepoRoot
try {
  $CodexPath = Resolve-CodexPath
  Write-Host ""
  Write-Host "Starting Anton in interactive manual mode."
  Write-Host "Mode: full computer access available, with approval prompts."
  Write-Host "Repo: $RepoRoot"
  Write-Host "Codex: $CodexPath"
  Write-Host ""
  Write-Host "Anton can ask before actions that need approval. Keep this window open."
  Write-Host ""

  & $CodexPath `
    --cd $RepoRoot `
    --sandbox danger-full-access `
    --ask-for-approval on-request `
    --search `
    $Prompt
} finally {
  Pop-Location
}
