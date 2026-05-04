<?php
$host = "localhost";
$user = "blabackspace";      // XAMPP 기본값
$pass = "wlthd4637@#";          // XAMPP 기본값
$dbName = "blabackspace";

$conn = mysqli_connect($host, $user, $pass, $dbName);

if (!$conn) {
    die("DB 연결 실패: " . mysqli_connect_error());
}
?>