<?php
// 1. Google 서버에서 1시간용 액세스 토큰 가져오기
function getGoogleAccessToken($keyFilePath) {
    $keyData = json_decode(file_get_contents($keyFilePath), true);
    $clientEmail = $keyData['client_email'];
    $privateKey = $keyData['private_key'];

    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $payload = json_encode([
        'iss' => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = '';
    openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $privateKey, "sha256WithRSAEncryption");
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));
    $res = json_decode(curl_exec($ch), true);
    return $res['access_token'] ?? null;
}

// 2. 실제 알림 발송 함수 (이름을 sendFCMV1으로 통일)
function sendFCMV1($deviceToken, $title, $body, $imageUrl = "") {
    $serviceAccountFile = __DIR__ . '/firebase_key.json'; 
    $keyData = json_decode(file_get_contents($serviceAccountFile), true);
    $projectId = $keyData['project_id'];

    $accessToken = getGoogleAccessToken($serviceAccountFile); 
    if (!$accessToken) return false;

    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
    $message = ["message" => [
        "token" => $deviceToken,
        "notification" => ["title" => $title, "body" => $body],
        "android" => ["notification" => ["image" => $imageUrl]],
        "data" => ["click_action" => "FLUTTER_NOTIFICATION_CLICK"]
    ]];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $accessToken", "Content-Type: application/json"]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
    return curl_exec($ch);
}
?>