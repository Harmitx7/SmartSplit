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
        // Database configuration for initial setup (no database selected yet)
        $servername = "localhost";
        $username = "root";
        $password = "";
        $dbname = "smart_split";

        // Create connection to MySQL server
        $conn = new mysqli($servername, $username, $password);

        // Check connection
        if ($conn->connect_error) {
            die("<div class='message error'><strong>Connection Failed:</strong> " . $conn->connect_error . ". Please check your MySQL server credentials.</div>");
        }

        // Create database if it doesn't exist
        $sql_create_db = "CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci";
        if ($conn->query($sql_create_db) === TRUE) {
            echo "<div class='message success'>Database '<strong>$dbname</strong>' created successfully or already exists.</div>";
        } else {
            die("<div class='message error'><strong>Error creating database:</strong> " . $conn->error . "</div>");
        }

        // Select the database
        $conn->select_db($dbname);

        echo "<p>Reading SQL setup file from <code>setup.sql</code>...</p>";

        // Read the SQL file
        $sql_script = file_get_contents('setup.sql');
        if ($sql_script === false) {
            die("<div class='message error'><strong>Error:</strong> Could not read <code>setup.sql</code>. Make sure the file exists in the same directory.</div>");
        }

        // Execute the multi-query SQL script
        if ($conn->multi_query($sql_script)) {
            do {
                // Store first result set
                if ($result = $conn->store_result()) {
                    $result->free();
                }
            } while ($conn->next_result());
            echo "<div class='message success'><strong>Success!</strong> All tables from <code>setup.sql</code> were created successfully.</div>";
        } else {
            echo "<div class='message error'><strong>Error executing SQL script:</strong> " . $conn->error . "</div>";
        }

        echo "<h3>Setup is complete. You can now use the application.</h3>";

        // Close the connection
        $conn->close();
        ?>
    </div>
</body>
</html>