<?php
session_start();
require_once 'db.php';

// Set headers
header('Content-Type: application/json');

// Check authentication for all actions except for a dedicated auth-check action
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Allow unauthenticated access only for 'check_auth' GET requests.
// For all other requests, enforce authentication.
if ($action !== 'check_auth' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
        http_response_code(401); // Unauthorized
        echo json_encode(['error' => 'User not authenticated.']);
        exit();
    }
}

$userId = isset($_SESSION['userId']) ? $_SESSION['userId'] : 0;

// Get request details
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$input = json_decode(file_get_contents('php://input'), true);

// Main request router
switch ($method) {
    case 'GET':
        handle_get($conn, $action, $userId);
        break;
    case 'POST':
        handle_post($conn, $action, $id, $input, $userId);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// Handle GET requests
function handle_get($conn, $action, $userId) {
    if ($action == 'get_data') {
        get_all_data($conn, $userId);
    } else if ($action == 'check_auth') {
        if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
            echo json_encode(['loggedin' => true, 'username' => $_SESSION['username']]);
        } else {
            echo json_encode(['loggedin' => false]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid GET action']);
    }
}

// Handle POST requests
function handle_post($conn, $action, $id, $data, $userId) {
    // For POST actions, userId must be valid, except for login/register
    if ($userId <= 0 && !in_array($action, ['login', 'register'])) {
        http_response_code(401);
        echo json_encode(['error' => 'User not authenticated for this action.']);
        return;
    }

    switch ($action) {
        case 'add_person':
            add_person($conn, $data, $userId);
            break;
        case 'add_expense':
            add_expense($conn, $data, $userId);
            break;
        case 'update_person':
            update_person($conn, $id, $data, $userId);
            break;
        case 'delete_person':
            delete_person($conn, $id, $userId);
            break;
        case 'update_expense':
            update_expense($conn, $id, $data, $userId);
            break;
        case 'delete_expense':
            delete_expense($conn, $id, $userId);
            break;
        case 'settle_all':
            settle_all($conn, $userId);
            break;
        case 'import_data':
            import_data($conn, $data, $userId);
            break;
        case 'clear_all':
            clear_all_data($conn, $userId);
            break;
        case 'logout':
            session_destroy();
            echo json_encode(['success' => true]);
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid POST action']);
            break;
    }
}

// --- Action Functions ---

function get_all_data($conn, $userId) {
    $data = ['people' => [], 'expenses' => []];

    // Fetch people
    $stmt = $conn->prepare("SELECT id, name, emoji FROM people WHERE userId = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data['people'][] = $row;
        }
    }
    $stmt->close();

    // Fetch expenses
    $stmt = $conn->prepare("SELECT * FROM expenses WHERE userId = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data['expenses'][] = $row;
        }
    }
    $stmt->close();

    echo json_encode($data);
}

function add_person($conn, $data, $userId) {
    $name = $conn->real_escape_string($data['name']);
    $emoji = $conn->real_escape_string($data['emoji']);

    $stmt = $conn->prepare("INSERT INTO people (name, emoji, userId) VALUES (?, ?, ?)");
    $stmt->bind_param("ssi", $name, $emoji, $userId);

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        echo json_encode(['id' => $new_id, 'name' => $data['name'], 'emoji' => $data['emoji']]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error adding person: ' . $stmt->error]);
    }
    $stmt->close();
}

function add_expense($conn, $data, $userId) {
    $description = $conn->real_escape_string($data['description']);
    $amount = (float)$data['amount'];
    $payerId = (int)$data['payerId'];
    $date = $conn->real_escape_string($data['date']);
    $category = $conn->real_escape_string($data['category']);
    $splitBetween = json_encode($data['splitBetween']);
    $splitAmount = (float)$data['splitAmount'];
    $timestamp = $conn->real_escape_string($data['timestamp']);

    $stmt = $conn->prepare("INSERT INTO expenses (description, amount, payerId, date, category, splitBetween, splitAmount, timestamp, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sdisssdsi", $description, $amount, $payerId, $date, $category, $splitBetween, $splitAmount, $timestamp, $userId);

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        $data['id'] = $new_id;
        $data['splitBetween'] = json_decode($splitBetween); // Decode for consistency if needed, or just pass back string
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error adding expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function update_person($conn, $id, $data, $userId) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for update']);
        return;
    }
    $name = $conn->real_escape_string($data['name']);
    $emoji = $conn->real_escape_string($data['emoji']);

    $stmt = $conn->prepare("UPDATE people SET name = ?, emoji = ? WHERE id = ? AND userId = ?");
    $stmt->bind_param("ssii", $name, $emoji, $id, $userId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error updating person: ' . $stmt->error]);
    }
    $stmt->close();
}

function delete_person($conn, $id, $userId) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for delete']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM people WHERE id = ? AND userId = ?");
    $stmt->bind_param("ii", $id, $userId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error deleting person: ' . $stmt->error]);
    }
    $stmt->close();
}

function update_expense($conn, $id, $data, $userId) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for update']);
        return;
    }
    $description = $conn->real_escape_string($data['description']);
    $amount = (float)$data['amount'];
    $payerId = (int)$data['payerId'];
    $date = $conn->real_escape_string($data['date']);
    $category = $conn->real_escape_string($data['category']);
    $splitBetween = json_encode($data['splitBetween']);
    $splitAmount = (float)$data['splitAmount'];

    $stmt = $conn->prepare("UPDATE expenses SET description = ?, amount = ?, payerId = ?, date = ?, category = ?, splitBetween = ?, splitAmount = ? WHERE id = ? AND userId = ?");
    $stmt->bind_param("sdisssdii", $description, $amount, $payerId, $date, $category, $splitBetween, $splitAmount, $id, $userId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error updating expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function delete_expense($conn, $id, $userId) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for delete']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM expenses WHERE id = ? AND userId = ?");
    $stmt->bind_param("ii", $id, $userId);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error deleting expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function settle_all($conn, $userId) {
    $stmt = $conn->prepare("DELETE FROM expenses WHERE userId = ?");
    $stmt->bind_param("i", $userId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error clearing expenses: ' . $conn->error]);
    }
    $stmt->close();
}

function clear_all_data($conn, $userId) {
    $stmt = $conn->prepare("DELETE FROM people WHERE userId = ?");
    $stmt->bind_param("i", $userId);
    if ($stmt->execute()) {
        // Now delete expenses associated with this user
        $stmt2 = $conn->prepare("DELETE FROM expenses WHERE userId = ?");
        $stmt2->bind_param("i", $userId);
        if ($stmt2->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Error clearing expenses data: ' . $conn->error]);
        }
        $stmt2->close();
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error clearing people data: ' . $conn->error]);
    }
    $stmt->close();
}

function import_data($conn, $data, $userId) {
    // Clear existing data for this user first
    $stmt_del_people = $conn->prepare("DELETE FROM people WHERE userId = ?");
    $stmt_del_people->bind_param("i", $userId);
    $stmt_del_people->execute();
    $stmt_del_people->close();

    $stmt_del_expenses = $conn->prepare("DELETE FROM expenses WHERE userId = ?");
    $stmt_del_expenses->bind_param("i", $userId);
    $stmt_del_expenses->execute();
    $stmt_del_expenses->close();

    $conn->begin_transaction();

    try {
        // Import people
        $stmt_people = $conn->prepare("INSERT INTO people (id, name, emoji, userId) VALUES (?, ?, ?, ?)");
        foreach ($data['people'] as $person) {
            $stmt_people->bind_param("issi", $person['id'], $person['name'], $person['emoji'], $userId);
            $stmt_people->execute();
        }
        $stmt_people->close();

        // Import expenses
        $stmt_expenses = $conn->prepare("INSERT INTO expenses (id, description, amount, payerId, date, category, splitBetween, splitAmount, timestamp, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($data['expenses'] as $expense) {
            $splitBetween = json_encode($expense['splitBetween']);
            $stmt_expenses->bind_param("isdisssdsi", $expense['id'], $expense['description'], $expense['amount'], $expense['payerId'], $expense['date'], $expense['category'], $splitBetween, $expense['splitAmount'], $expense['timestamp'], $userId);
            $stmt_expenses->execute();
        }
        $stmt_expenses->close();

        $conn->commit();
        echo json_encode(['success' => true]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Import failed: ' . $e->getMessage()]);
    }
}

$conn->close();
?>