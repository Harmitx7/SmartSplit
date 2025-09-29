-- SQL script to create the necessary tables for the Smart Split application.
-- To use this file, open phpMyAdmin, select your 'smart_split' database,
-- and import this file.

--
-- Database: `smart_split`
--

-- --------------------------------------------------------

--
-- Table structure for table `people`
--

CREATE TABLE `people` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `emoji` varchar(16) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;