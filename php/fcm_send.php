<?php
// 자동 알림 발송 엔진
function sendFCM($targetToken, $title, $body) {
    // 소은님의 프로젝트 정보
    $projectId = 'musicrecommend-c0498';
    $keyFile = __DIR__ . '/firebase_key.json'; 

    // 1. 서비스 계정 키 읽기
    $keyData = json_decode(file_get_contents($keyFile), true);
    $clientEmail = $keyData['client_email'];
    $privateKey = $keyData['private_key'];

    // 2. JWT(인증 토큰) 생성 로직 (v1 보안 통신용)
    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $payload = json_encode([
        'iss' => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/cloud-platform',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    // 3. Google OAuth2 토큰 요청
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));
    $response = json_decode(curl_exec($ch), true);
    $accessToken = $response['access_token'];

    // 4. 실제 파이어베이스 알림 발송
    $msg = [
        'message' => [
            'token' => $targetToken,
            'notification' => [
                'title' => $title,
                'body' => $body
            ]
        ]
    ];

    $ch = curl_init("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($msg));
    
    $result = curl_exec($ch);
    curl_close($ch);
    return $result;
}
?>