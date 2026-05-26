<?php
// 프로젝트 최상단 기준이므로 php 폴더 안의 db_config를 불러옵니다.
include 'php/db_config.php';
session_start();


// 1. 로그인이 안 되어 있으면 무조건 로그인 페이지로 보냅니다.
if (!isset($_SESSION['user_id'])) {
    header("Location: html/login.html");
    exit;
}

$my_id = $_SESSION['user_id'];

// 2. 로그인이 되어 있다면 오늘 노래를 추천했는지 확인합니다.
$check_sql = "SELECT song_id FROM songs WHERE user_id = $my_id AND DATE(created_at) = CURRENT_DATE";
$check_res = mysqli_query($conn, $check_sql);

// 3. 오늘 추천을 했으면 리스트로, 안 했으면 메인(추천) 페이지로 꽂아줍니다.
if (mysqli_num_rows($check_res) > 0) {
    header("Location: html/music_list.html");
} else {
    header("Location: html/main.html");
}
exit;
?>