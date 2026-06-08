<?php
$target = "https://flixcam.tgi.com.sa/twilio/callback";

// Save POST data to log
if (!empty($_POST)) {
    $log = "=== " . date('Y-m-d H:i:s') . " ===\n";
    foreach ($_POST as $key => $value) {
        $log .= $key . ": " . $value . "\n";
    }
    $log .= "\n";
    file_put_contents(__DIR__ . '/whatsapp_log.txt', $log, FILE_APPEND | LOCK_EX);
}

// Forward request to Chatwoot
$ch = curl_init($target);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($_POST));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'X-Twilio-Signature: ' . ($_SERVER['HTTP_X_TWILIO_SIGNATURE'] ?? ''),
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
header('Content-Type: text/xml');
echo $response;
?>