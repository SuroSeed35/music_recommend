<?php
function sendFCMNotification($deviceToken, $title, $body, $imageUrl = "") {
    $serviceAccountFile = 'firebase_key.json'; // 업로드하신 파일명 확인
    $projectId = "your-project-id"; // Firebase 콘솔의 프로젝트 ID

    // 1. Google OAuth2 Access Token 가져오기 로직 (생략 - 기존 코드 활용)
    $accessToken = getGoogleAccessToken($serviceAccountFile); 

    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

    $message = [
        "message" => [
            "token" => $deviceToken,
            "notification" => [
                "title" => $title,
                "body" => $body
            ],
            "android" => [
                "notification" => [
                    "image" => $imageUrl // 사진(앨범 아트 등) 포함 시
                ]
            ],
            "data" => [
                "click_action" => "FLUTTER_NOTIFICATION_CLICK" // 클릭 시 이동용
            ]
        ]
    ];

    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n" .
                         "Authorization: Bearer " . $accessToken . "\r\n",
            'content' => json_encode($message),
        ]
    ];

    $context  = stream_context_create($options);
    return file_get_contents($url, false, $context);
}
?>