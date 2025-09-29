<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Smart Split DB Setup</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #4ECDC4; }
        .message { padding: 15px; margin-bottom: 20px; border-radius: 4px; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        code { background: #eee; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Smart Split Database Setup</h1>
        <?php
        // Include the database configuration
        require_once 'php/db.php';

        echo "<p>Attempting to connect to the database '<strong>" . $dbname . "</strong>' on host '<strong>" . $servername . "</strong>'...</p>";

        // The connection is already established in db.php. We just check if it was successful.
        if ($conn->connect_error) {
            echo "<div class='message error'><strong>Connection Failed:</strong> " . $conn->connect_error . ". Please check your credentials in <code>php/db.php</code>.</div>";
        } else {
            echo "<div class='message success'><strong>Success!</strong> Database connection is working.</div>";

            // SQL to create 'people' table
            $sql_people = "
            CREATE TABLE IF NOT EXISTS `people` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `name` varchar(255) NOT NULL,
              `emoji` varchar(16) NOT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

            // SQL to create 'expenses' table
            $sql_expenses = "
            CREATE TABLE IF NOT EXISTS `expenses` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `description` varchar(255) NOT NULL,
              `amount` decimal(10,2) NOT NULL,
              `payerId` int(11) NOT NULL,
              `date` date NOT NULL,
              `category` varchar(100) NOT NULL,
              `splitBetween` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
              `splitAmount` decimal(10,2) NOT NULL,
              `timestamp` bigint(20) NOT NULL,
              PRIMARY KEY (`id`),
              KEY `payerId` (`payerId`),
              CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`payerId`) REFERENCES `people` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

            echo "<h2>Creating Tables...</h2>";

            // Execute queries
            if ($conn->query($sql_people) === TRUE) {
                echo "<div class='message success'>Table '<strong>people</strong>' created successfully or already exists.</div>";
            } else {
                echo "<div class='message error'><strong>Error creating table 'people':</strong> " . $conn->error . "</div>";
            }

            if ($conn->query($sql_expenses) === TRUE) {
                echo "<div class='message success'>Table '<strong>expenses</strong>' created successfully or already exists.</div>";
            } else {
                echo "<div class='message error'><strong>Error creating table 'expenses':</strong> " . $conn->error . "</div>";
            }

            echo "<h3>Setup is complete. You can now use the application.</h3>";
        }

        // Close the connection
        $conn->close();
        ?>
    </div>
</body>
</html>