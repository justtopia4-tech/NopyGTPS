$f = 'C:\Users\Administrator\Downloads\GrowtopiaLogin-Backend-main\GrowtopiaLogin-Backend-main\template\dashboard.html'
$lines = Get-Content $f
$new = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
   if ($i -eq 304) {
       $new += '     <img src="/animated-logo.svg" alt="Logo">'
  } elseif ($i -gt 303 -and $i -lt 329) {
   } else {
        $new += $lines[$i]
    }
}
$new | Set-Content $f -Encoding UTF8
