<?php
// 구글 서버에서 1시간짜리 임시 액세스 토큰을 발급받는 함수
function getFCMAccessToken($keyFilePath) {
    if (!file_exists($keyFilePath)) {
        return null;
    }
    
    $keyData = json_decode(file_get_contents($keyFilePath), true);
    $clientEmail = $keyData['client_email'];
    $privateKey = $keyData['private_key'];

    // JWT(보안 토큰) 헤더와 페이로드 생성
    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $payload = json_encode([
        'iss' => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600, // 1시간 뒤 만료
        'iat' => $now
    ]);

    // Base64 인코딩
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    // RSA 서명 (열쇠 파일의 private_key 이용)
    $signature = '';
    openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $privateKey, "sha256WithRSAEncryption");
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    // 최종 JWT 완성
    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

    // 구글에 토큰 요청
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));

    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

// 실제로 알림을 발송하는 메인 함수
function sendFCMV1($token, $title, $body) {
    // ⚠️ php 폴더 안에 firebase_key.json 파일이 꼭 있어야 합니다!
    $keyFile = __DIR__ . '/firebase_key.json'; 
    $keyData = json_decode(file_get_contents($keyFile), true);
    $projectId = $keyData['project_id'];

    // 1. 임시 출입증(액세스 토큰) 발급받기
    $accessToken = getFCMAccessToken($keyFile);
    if (!$accessToken) {
        error_log("FCM 토큰 발급 실패: 키 파일을 확인해주세요.");
        return false;
    }

    // 2. 알림 메시지 구성
    $message = [
        'message' => [
            'token' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body
            ]
        ]
    ];

    // 3. 구글 파이어베이스 서버(v1)로 알림 발송!
    $url = 'https://fcm.googleapis.com/v1/projects/' . $projectId . '/messages:send';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));

    $result = curl_exec($ch);
    curl_close($ch);

    return $result;
}
?>