# =====================================================================
# ⚡ NexusIT Operations - Persistent Local Web Server
# Serves Static UI & REST API for database.json on disk
# =====================================================================

$port = 5000
$root = $PSScriptRoot
$dbFile = Join-Path $root "database.json"

# Start HTTP Listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "[ERROR] Could not start server on port $port : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ⚡ NexusIT Operations - Persistent Local Web Server" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Server URL : http://localhost:$port" -ForegroundColor Yellow
Write-Host "  Database   : $dbFile" -ForegroundColor Yellow
Write-Host "  Status     : Running! All changes are permanently saved!" -ForegroundColor Green
Write-Host "  Press Ctrl+C in this window to stop server." -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan

# Request handling loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath

        # --- REST API: GET Data ---
        if ($path -eq "/api/data" -and $request.HttpMethod -eq "GET") {
            $response.ContentType = "application/json; charset=utf-8"
            if (Test-Path $dbFile) {
                $dbBytes = [System.IO.File]::ReadAllBytes($dbFile)
                $response.OutputStream.Write($dbBytes, 0, $dbBytes.Length)
            } else {
                $emptyJson = [System.Text.Encoding]::UTF8.GetBytes('{"branches":[],"assets":[],"visits":[]}')
                $response.OutputStream.Write($emptyJson, 0, $emptyJson.Length)
            }
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # --- REST API: POST Save Data ---
        if ($path -eq "/api/save" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            if (![string]::IsNullOrWhiteSpace($body)) {
                [System.IO.File]::WriteAllText($dbFile, $body, [System.Text.Encoding]::UTF8)
                Write-Host "[SAVE] Successfully updated database.json at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
            }

            $response.ContentType = "application/json; charset=utf-8"
            $msgBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok","message":"Saved to database.json"}')
            $response.OutputStream.Write($msgBytes, 0, $msgBytes.Length)
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # --- Static File Serving ---
        $filePath = ""
        if ($path -eq "/" -or $path -eq "/index.html") {
            $filePath = Join-Path $root "index.html"
        } else {
            $cleanPath = $path.TrimStart("/").Replace("/", "\")
            $filePath = Join-Path $root $cleanPath
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($err, 0, $err.Length)
        }

        $response.Close()
    } catch {
        # Continue on any minor socket error
    }
}
