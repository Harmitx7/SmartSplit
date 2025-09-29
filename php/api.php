<?php
require_once 'db.php';

// Set headers
header('Content-Type: application/json');

// Get request details
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$input = json_decode(file_get_contents('php://input'), true);

// Main request router
switch ($method) {
    case 'GET':
        handle_get($conn, $action);
        break;
    case 'POST':
        handle_post($conn, $action, $id, $input);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// Handle GET requests
function handle_get($conn, $action) {
    if ($action == 'get_data') {
        get_all_data($conn);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid GET action']);
    }
}

// Handle POST requests
function handle_post($conn, $action, $id, $data) {
    switch ($action) {
        case 'add_person':
            add_person($conn, $data);
            break;
        case 'add_expense':
            add_expense($conn, $data);
            break;
        case 'update_person':
            update_person($conn, $id, $data);
            break;
        case 'delete_person':
            delete_person($conn, $id);
            break;
        case 'update_expense':
            update_expense($conn, $id, $data);
            break;
        case 'delete_expense':
            delete_expense($conn, $id);
            break;
        case 'settle_all':
            settle_all($conn);
            break;
        case 'import_data':
            import_data($conn, $data);
            break;
        case 'clear_all':
            clear_all_data($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid POST action']);
            break;
    }
}

// --- Action Functions ---

function get_all_data($conn) {
    $data = ['people' => [], 'expenses' => []];

    // Fetch people
    $result = $conn->query("SELECT id, name, emoji FROM people");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $data['people'][] = $row;
        }
    }

    // Fetch expenses
    $result = $conn->query("SELECT * FROM expenses");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            // No need to json_decode 'splitBetween', the frontend expects a string
            $data['expenses'][] = $row;
        }
    }

    echo json_encode($data);
}

function add_person($conn, $data) {
    $name = $conn->real_escape_string($data['name']);
    $emoji = $conn->real_escape_string($data['emoji']);

    $stmt = $conn->prepare("INSERT INTO people (name, emoji) VALUES (?, ?)");
    $stmt->bind_param("ss", $name, $emoji);

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        echo json_encode(['id' => $new_id, 'name' => $data['name'], 'emoji' => $data['emoji']]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error adding person: ' . $stmt->error]);
    }
    $stmt->close();
}

function add_expense($conn, $data) {
    $description = $conn->real_escape_string($data['description']);
    $amount = (float)$data['amount'];
    $payerId = (int)$data['payerId'];
    $date = $conn->real_escape_string($data['date']);
    $category = $conn->real_escape_string($data['category']);
    $splitBetween = json_encode($data['splitBetween']); // Store as JSON string
    $splitAmount = (float)$data['splitAmount'];
    $timestamp = $conn->real_escape_string($data['timestamp']);

    $stmt = $conn->prepare("INSERT INTO expenses (description, amount, payerId, date, category, splitBetween, splitAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sdisssds", $description, $amount, $payerId, $date, $category, $splitBetween, $splitAmount, $timestamp);

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        $data['id'] = $new_id;
        $data['splitBetween'] = $splitBetween; // Return the JSON string version
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error adding expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function update_person($conn, $id, $data) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for update']);
        return;
    }
    $name = $conn->real_escape_string($data['name']);
    $emoji = $conn->real_escape_string($data['emoji']);

    $stmt = $conn->prepare("UPDATE people SET name = ?, emoji = ? WHERE id = ?");
    $stmt->bind_param("ssi", $name, $emoji, $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error updating person: ' . $stmt->error]);
    }
    $stmt->close();
}

function delete_person($conn, $id) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for delete']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM people WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error deleting person: ' . $stmt->error]);
    }
    $stmt->close();
}

function update_expense($conn, $id, $data) {
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

    $stmt = $conn->prepare("UPDATE expenses SET description = ?, amount = ?, payerId = ?, date = ?, category = ?, splitBetween = ?, splitAmount = ? WHERE id = ?");
    $stmt->bind_param("sdisssdi", $description, $amount, $payerId, $date, $category, $splitBetween, $splitAmount, $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error updating expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function delete_expense($conn, $id) {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for delete']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM expenses WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error deleting expense: ' . $stmt->error]);
    }
    $stmt->close();
}

function settle_all($conn) {
    if ($conn->query("TRUNCATE TABLE expenses") === TRUE) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error clearing expenses: ' . $conn->error]);
    }
}

function clear_all_data($conn) {
    $conn->query("SET foreign_key_checks = 0");
    $result1 = $conn->query("TRUNCATE TABLE people");
    $result2 = $conn->query("TRUNCATE TABLE expenses");
    $conn->query("SET foreign_key_checks = 1");

    if ($result1 && $result2) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error clearing data: ' . $conn->error]);
    }
}

function import_data($conn, $data) {
    // Clear existing data first
    $conn->query("SET foreign_key_checks = 0");
    $conn->query("TRUNCATE TABLE people");
    $conn->query("TRUNCATE TABLE expenses");
    $conn->query("SET foreign_key_checks = 1");

    $conn->begin_transaction();

    try {
        // Import people
        $stmt_people = $conn->prepare("INSERT INTO people (id, name, emoji) VALUES (?, ?, ?)");
        foreach ($data['people'] as $person) {
            $stmt_people->bind_param("iss", $person['id'], $person['name'], $person['emoji']);
            $stmt_people->execute();
        }
        $stmt_people->close();

        // Import expenses
        $stmt_expenses = $conn->prepare("INSERT INTO expenses (id, description, amount, payerId, date, category, splitBetween, splitAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($data['expenses'] as $expense) {
            $splitBetween = json_encode($expense['splitBetween']);
            $stmt_expenses->bind_param("isdisssds", $expense['id'], $expense['description'], $expense['amount'], $expense['payerId'], $expense['date'], $expense['category'], $splitBetween, $expense['splitAmount'], $expense['timestamp']);
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