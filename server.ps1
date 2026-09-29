# =====================================================================
# ⚡ NexusIT Operations - High-Performance Local Web Server
# Serves Static UI & REST API for database.json on disk
# =====================================================================

$port = 5000
$root = $PSScriptRoot
$dbFile = Join-Path $root "database.json"

# Check if port 5000 is already in use by another instance
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "[WARNING] Port $port might already be listening or busy: $($_.Exception.Message)" -ForegroundColor Yellow
    # Open browser anyway in case existing instance is serving
    Start-Process "http://localhost:$port"
    exit 0
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ⚡ NexusIT Operations - Persistent Local Web Server" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Server URL : http://localhost:$port" -ForegroundColor Yellow
Write-Host "  Database   : $dbFile" -ForegroundColor Yellow
Write-Host "  Status     : Ready! All data is permanently saved to disk!" -ForegroundColor Green
Write-Host "  Keep this window open while using NexusIT Operations." -ForegroundColor DarkCyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Automatically open browser
try {
    Start-Process "http://localhost:$port"
} catch {
    # ignore if unable to launch directly
}

# Request handling loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Prevent browser connection stall with explicit KeepAlive = false
        $response.KeepAlive = $false

        # CORS Headers for local access & file:// fallback
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Accept")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.ContentLength64 = 0
            $response.OutputStream.Close()
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath

        # --- REST API: GET Data ---
        if ($path -eq "/api/data" -and $request.HttpMethod -eq "GET") {
            $response.ContentType = "application/json; charset=utf-8"
            $dbBytes = @()
            if (Test-Path $dbFile) {
                $dbBytes = [System.IO.File]::ReadAllBytes($dbFile)
            } else {
                $dbBytes = [System.Text.Encoding]::UTF8.GetBytes('{"branches":[],"assets":[],"visits":[]}')
            }
            $response.ContentLength64 = $dbBytes.Length
            $response.OutputStream.Write($dbBytes, 0, $dbBytes.Length)
            $response.StatusCode = 200
            $response.OutputStream.Close()
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
                Write-Host "[SAVE] database.json updated at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
            }

            $response.ContentType = "application/json; charset=utf-8"
            $msgBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok","message":"Saved to database.json"}')
            $response.ContentLength64 = $msgBytes.Length
            $response.OutputStream.Write($msgBytes, 0, $msgBytes.Length)
            $response.StatusCode = 200
            $response.OutputStream.Close()
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
                ".ico"  { $response.ContentType = "image/x-icon" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.StatusCode = 200
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $err.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($err, 0, $err.Length)
            }
        }

        $response.OutputStream.Close()
        $response.Close()
    } catch {
        # Catch and proceed with next request
    }
}
