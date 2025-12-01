param(
    [Parameter(Mandatory = $true)]
    [string]$ENV_FILE
)

# --- 1. Get and Extract Dynamic Keys ---

# Run status command and capture output into a single string
$SupabaseStatus = npx supabase status -o env | Out-String;

# Regex to find the specific key and capture its value
$AnonPattern = 'ANON_KEY=(?:\s*")?([^"\s]+)';
$ServicePattern = 'SERVICE_ROLE_KEY=(?:\s*")?([^"\s]+)';
$PublishablePattern = 'PUBLISHABLE_KEY=(?:\s*")?([^"\s]+)';

# --- CRITICAL FIX: Match directly on the full output string ---

# 1. Capture Anonymous Key Value
$AnonMatch = [regex]::Match($SupabaseStatus, $AnonPattern);
$AnonKeyRawValue = $AnonMatch.Groups[1].Value;

# 2. Capture Service Key Value
$ServiceMatch = [regex]::Match($SupabaseStatus, $ServicePattern);
$ServiceKeyRawValue = $ServiceMatch.Groups[1].Value;

# 3. Capture Publishable Key Value
$PublishableMatch = [regex]::Match($SupabaseStatus, $PublishablePattern);
$PublishableKeyRawValue = $PublishableMatch.Groups[1].Value; 

if (-not $AnonKeyRawValue -or -not $ServiceKeyRawValue) {
    Write-Error 'Error: Key values could not be extracted from the Supabase status output.';
    exit 1;
}

# --- 2. Capture and Replace Content (Line-by-Line) ---

# Explicitly capture the entire file content into the $NewContent variable.
$NewContent = @(
    Get-Content -Path $ENV_FILE | ForEach-Object {
        
        # Check and replace the Anon Key
        if ($_ -match '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=') {
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$AnonKeyRawValue"
        }
        # Check and replace the Service Key
        elseif ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=') {
            "SUPABASE_SERVICE_ROLE_KEY=$ServiceKeyRawValue"
        }
        elseif ($_ -match '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=') {
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PublishableKeyRawValue"
        }
        # Keep all other lines as is
        else {
            $_
        }
    }
)

# --- 3. Write Once ---

$NewContent | Set-Content -Path $ENV_FILE;

Write-Host "✅ Supabase ANONYMOUS_KEY and SERVICE_ROLE_KEY successfully updated in $ENV_FILE.";