# Mata TODOS os processos que estão "Listen" na porta 5173
$conns = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)

if ($conns.Count -eq 0) {
  Write-Host "No listener on 5173"
} else {
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Host "Killed PID $procId"
  }

  Start-Sleep -Milliseconds 400

  $left = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
  if ($left.Count -eq 0) { Write-Host "5173 free" } else { $left | Format-Table -AutoSize }
}