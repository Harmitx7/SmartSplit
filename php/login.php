<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

if (isset($input['username']) && isset($input['password'])) {
    $username = $conn->real_escape_string($input['username']);
    $password = $input['password'];

    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($id, $hashed_password);

    if ($stmt->num_rows > 0) {
        $stmt->fetch();
        if (password_verify($password, $hashed_password)) {
            $_SESSION['loggedin'] = true;
            $_SESSION['userId'] = $id;
            $_SESSION['username'] = $username;
            echo json_encode(['success' => true]);
        } else {
            http_response_code(401); // Unauthorized
            echo json_encode(['error' => 'Invalid username or password.']);
        }
    } else {
        http_response_code(401); // Unauthorized
        echo json_encode(['error' => 'Invalid username or password.']);
    }
    $stmt->close();
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields.']);
}

$conn->close();
?>