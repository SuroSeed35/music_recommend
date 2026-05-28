<?php
include 'db_config.php';
session_start();
if (!isset($_SESSION['user_id'])) { echo json_encode([]); exit; }

$my_id = $_SESSION['user_id'];
$group_id = (int)($_GET['group_id'] ?? 0);
$start = mysqli_real_escape_string($conn, $_GET['start'] ?? '');
$end = mysqli_real_escape_string($conn, $_GET['end'] ?? '');

header('Content-Type: application/json');

$user_cond = ($group_id === 0)
    ? "s.user_id = $my_id"
    : "s.user_id IN (SELECT user_id FROM group_members WHERE group_id = $group_id)";

$sql = "SELECT s.song_id, u.username, u.login_id, s.daily_comment, s.title, s.thumbnail_img, s.youtube_url, s.log_date, s.created_at
        FROM songs s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.log_date BETWEEN '$start' AND '$end'
        AND $user_cond
        ORDER BY s.created_at DESC";

$result = $conn->query($sql);
$songs = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        $songs[] = $row;
    }
}
echo json_encode($songs);
$conn->close();
?>