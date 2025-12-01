param(
    [string]$WorkflowPath = "docs/n8n/hp-agent.json",
    [string]$BaseUrl = ${env:N8N_URL},
    [string]$Token = ${env:N8N_TOKEN},
    [switch]$Activate
)

$ErrorActionPreference = "Stop"

if (-not $BaseUrl) { $BaseUrl = "http://localhost:5678" }
if (-not $Token) { $Token = "n8n_api_f319515b2bff3bbea90e3ee7b4407698f3ac4ed554ec2acc280c59a7abd6a5f41807c8827977c5fa" }
$BaseUrl = $BaseUrl.TrimEnd('/')
$ApiRoot = "$BaseUrl/api/v1"

if (-not (Test-Path $WorkflowPath)) {
    throw "Workflow file not found: $WorkflowPath"
}

$headers = @{ "X-N8N-API-KEY" = $Token }
$wf = Get-Content -Path $WorkflowPath -Raw | ConvertFrom-Json
if (-not $wf.settings) { $wf | Add-Member -Name settings -MemberType NoteProperty -Value @{ timezone = "Asia/Tehran" } }
# API rejects pinData/active/id on payload; remove before sending. Activation is done via endpoint.
$wf.PSObject.Properties.Remove('pinData')
$wf.PSObject.Properties.Remove('active')
$wf.PSObject.Properties.Remove('id')
$bodyJson = $wf | ConvertTo-Json -Depth 30

try {
    $list = Invoke-RestMethod -Method Get -Uri "$ApiRoot/workflows" -Headers $headers -ContentType 'application/json'
} catch {
    throw "Failed to list workflows from n8n at $BaseUrl : $($_.Exception.Message)"
}
$all = $list.data
if (-not $all) { $all = $list }
$existing = $null
if ($all) {
    $existing = $all | Where-Object { $_.name -eq $wf.name }
}

if ($existing) {
    $bodyJson = $wf | ConvertTo-Json -Depth 30
    $resp = Invoke-RestMethod -Method Put -Uri "$ApiRoot/workflows/$($existing.id)" -Headers $headers -ContentType 'application/json' -Body $bodyJson
    Write-Host "Updated workflow: $($existing.id)"
} else {
    $resp = Invoke-RestMethod -Method Post -Uri "$ApiRoot/workflows" -Headers $headers -ContentType 'application/json' -Body $bodyJson
    Write-Host "Created workflow: $($resp.id)"
}

if ($Activate -and $resp.id) {
    try {
        Invoke-RestMethod -Method Post -Uri "$ApiRoot/workflows/$($resp.id)/activate" -Headers $headers -ContentType 'application/json' | Out-Null
        Write-Host "Activated workflow $($resp.id)"
    } catch {
        Write-Warning "Workflow created/updated but activation failed: $($_.Exception.Message)"
    }
}
