<?php
$host = "localhost";
$user = "root";      // XAMPP 기본값
$pass = "1234";          // XAMPP 기본값
$dbName = "music_recommend";

$conn = mysqli_connect($host, $user, $pass, $dbName);

if (!$conn) {
    die("DB 연결 실패: " . mysqli_connect_error());
}
?>