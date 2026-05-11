<?php
// 1. Google 서버에서 1시간용 액세스 토큰 가져오기
function getGoogleAccessToken($keyFilePath) {
    if (!file_exists($keyFilePath)) {
        die("❌ [에러] 키 파일을 찾을 수 없습니다: " . $keyFilePath);
    }

    $keyData = json_decode(file_get_contents($keyFilePath), true);
    if (!$keyData || !isset($keyData['private_key'])) {
        die("❌ [에러] JSON 키 파일 형식이 잘못되었거나 private_key가 없습니다.");
    }

    $clientEmail = $keyData['client_email'];
    
    // 🔥 수정 1: JSON 파일에서 읽어온 키의 줄바꿈(\n) 문자가 깨지지 않도록 강제 복구
    $privateKey = str_replace('\n', "\n", $keyData['private_key']);

    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $claim = json_encode([
        'iss' => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]);

    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlClaim = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($claim));
    $signatureInput = $base64UrlHeader . '.' . $base64UrlClaim;

    $signature = '';
    
    // 🔥 수정 2: 'sha256' 문자열 대신 PHP 내장 상수 OPENSSL_ALGO_SHA256 사용 (호환성 에러 방지)
    $signSuccess = openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);

    if (!$signSuccess) {
        die("❌ [에러] 서버에서 암호화 서명 생성 실패: " . openssl_error_string());
    }

    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    $jwt = $signatureInput . '.' . $base64UrlSignature;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));

    $response = curl_exec($ch);
    
    if ($response === false) {
        die("❌ [에러] 토큰 발급용 cURL 실패: " . curl_error($ch));
    }
    
    curl_close($ch);
    $responseData = json_decode($response, true);
    
    if (!isset($responseData['access_token'])) {
        die("❌ [구글 서버 거절 사유]: <br>" . $response);
    }

    return $responseData['access_token'];
}

// 2. 실제 FCM 알림 쏘는 함수
function sendFCMV1($deviceToken, $title, $body, $imageUrl = null) {
    // 본인 프로젝트 ID
    $projectId = 'musicrecommend-c0498'; 
    $keyFilePath = __DIR__ . '/firebase_key.json'; 

    $accessToken = getGoogleAccessToken($keyFilePath);

    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

    $message = [
        "message" => [
            "token" => $deviceToken,
            "notification" => [
                "title" => $title,
                "body" => $body
            ]
        ]
    ];

    if ($imageUrl) {
        $message["message"]["android"]["notification"]["image"] = $imageUrl;
    }

    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
    
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

    $result = curl_exec($ch);
    
    if ($result === false) {
        echo "❌ [에러] 알림 발송 cURL 실패: " . curl_error($ch);
    }
    
    curl_close($ch);
    return $result;
}
?>